#include <Arduino.h>
#include <ArduinoJson.h>
#include <WebSocketsServer.h>
#include <WiFi.h>

// ── Chân kết nối ─────────────────────────────────────────────
#define TRIG      5
#define ECHO      4
#define RELAY_OUT 22   // Bơm ra
#define RELAY_IN  23   // Bơm vào

const char* WIFI_SSID = "37 Ngo Van So";
const char* WIFI_PASS = "987654321";

// ── Cấu hình hệ thống ────────────────────────────────────────
const float MAX_VOL    = 1000.0f;
const float CAL_CM_LO  =  9.01f;  // trung bình (11.95, 6.07)
const float CAL_ML_LO  = 230.0f;  // trung bình (150, 310)
const float CAL_CM_HI  =  4.97f;  // trung bình (6.07, 3.86)
const float CAL_ML_HI  = 350.0f;  // trung bình (310, 390)

float autoInOnMl  = 150.0f;   // Bơm vào khi vol dưới mức này
float autoOutOnMl = 400.0f;   // Bơm ra khi vol trên mức này
const float VALID_CM_MIN = 2.0f;
const float VALID_CM_MAX = 300.0f;
const unsigned long SENSOR_STALE_MS = 3000;
const unsigned long SENSOR_FAILSAFE_STOP_MS = 15000;
const float FALLBACK_ML_PER_SEC = 40.0f;

// ── Trạng thái ───────────────────────────────────────────────
bool  isManual  = false;
bool  pumpOut   = false;
bool  pumpIn    = false;
float distCm    = -1.0f;
float volMl     = -1.0f;
unsigned long lastGoodSampleMs = 0;
uint16_t badSampleStreak = 0;

void applyFallbackVolume(unsigned long dtMs) {
  if (volMl < 0) return;
  float delta = FALLBACK_ML_PER_SEC * (dtMs / 1000.0f);
  if (pumpOut && !pumpIn) {
    volMl = constrain(volMl - delta, 0.0f, MAX_VOL);
  } else if (pumpIn && !pumpOut) {
    volMl = constrain(volMl + delta, 0.0f, MAX_VOL);
  }
}

// ── Median filter (7 mẫu) ────────────────────────────────────
#define WIN_SIZE 7
float  win[WIN_SIZE];
uint8_t winCount = 0;
uint8_t winIdx   = 0;

void pushSample(float cm) {
  win[winIdx] = cm;
  winIdx = (winIdx + 1) % WIN_SIZE;
  if (winCount < WIN_SIZE) winCount++;
}

float median() {
  if (winCount == 0) return -1.0f;
  float tmp[WIN_SIZE];
  memcpy(tmp, win, winCount * sizeof(float));
  // Insertion sort
  for (uint8_t i = 1; i < winCount; i++) {
    float key = tmp[i];
    int8_t j = i - 1;
    while (j >= 0 && tmp[j] > key) { tmp[j+1] = tmp[j]; j--; }
    tmp[j+1] = key;
  }
  return tmp[winCount / 2];
}

// ── Đọc cảm biến HC-SR04 ─────────────────────────────────────
float readCm() {
  digitalWrite(TRIG, LOW);  delayMicroseconds(3);
  digitalWrite(TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(TRIG, LOW);
  long dur = pulseIn(ECHO, HIGH, 30000);
  return (dur == 0) ? -1.0f : dur * 0.034f / 2.0f;
}

float cmToMl(float cm) {
  if (cm <= 0) return -1.0f;
  float slope = (CAL_ML_HI - CAL_ML_LO) / (CAL_CM_HI - CAL_CM_LO);
  float ml = CAL_ML_LO + (cm - CAL_CM_LO) * slope;
  return constrain(ml, 0.0f, MAX_VOL);
}

// ── Relay ─────────────────────────────────────────────────────
void setPump(uint8_t pin, bool &state, bool on, const char* name) {
  if (state == on) return;
  state = on;
  digitalWrite(pin, on ? LOW : HIGH);  // Relay kích mức LOW
  Serial.printf("[%lums] %s -> %s\n", millis(), name, on ? "ON" : "OFF");
}

// ── WebSocket & JSON ──────────────────────────────────────────
WebSocketsServer ws(81);

String makeJson() {
  JsonDocument doc;
  doc["type"]     = "state";
  doc["mode"]     = isManual ? "MANUAL" : "AUTO";
  doc["distance"] = distCm;
  doc["volumeMl"] = volMl;
  doc["pumpOut"]  = pumpOut;
  doc["pumpIn"]   = pumpIn;
  doc["uptime"]   = millis() / 1000;
  JsonObject cfg  = doc["config"].to<JsonObject>();
  cfg["maxVolumeMl"]  = MAX_VOL;
  cfg["autoInOnMl"]   = autoInOnMl;
  cfg["autoOutOnMl"]  = autoOutOnMl;
  String s; serializeJson(doc, s); return s;
}

void broadcast()    { String s = makeJson(); ws.broadcastTXT(s); }
void sendTo(uint8_t c) { String s = makeJson(); ws.sendTXT(c, s); }

void ack(uint8_t c, const char* msg, bool ok) {
  JsonDocument doc;
  doc["type"] = "ack"; doc["ok"] = ok; doc["message"] = msg;
  String s; serializeJson(doc, s); ws.sendTXT(c, s);
}

// ── Logic AUTO ────────────────────────────────────────────────
void autoControl() {
  if (volMl < 0) {
    setPump(RELAY_OUT, pumpOut, false, "PUMP_OUT");
    setPump(RELAY_IN,  pumpIn,  false, "PUMP_IN");
    return;
  }
  if (volMl >= MAX_VOL)           setPump(RELAY_IN,  pumpIn,  false, "PUMP_IN");
  if (volMl < autoInOnMl)       { setPump(RELAY_OUT, pumpOut, false, "PUMP_OUT");
                                   setPump(RELAY_IN,  pumpIn,  true,  "PUMP_IN");  return; }
  if (volMl > autoOutOnMl)      { setPump(RELAY_IN,  pumpIn,  false, "PUMP_IN");
                                   setPump(RELAY_OUT, pumpOut, true,  "PUMP_OUT"); return; }
  if (pumpIn  && volMl >= autoInOnMl  + 20) setPump(RELAY_IN,  pumpIn,  false, "PUMP_IN");
  if (pumpOut && volMl <= autoOutOnMl - 20) setPump(RELAY_OUT, pumpOut, false, "PUMP_OUT");
}

// ── Xử lý lệnh WebSocket ──────────────────────────────────────
void handleMsg(uint8_t c, const char* payload, size_t len) {
  JsonDocument doc;
  if (deserializeJson(doc, payload, len)) { ack(c, "JSON error", false); return; }
  const char* type = doc["type"] | "";

  if (strcmp(type, "request_state") == 0) { sendTo(c); return; }

  if (strcmp(type, "control") == 0) {
    const char* mode = doc["mode"] | "";
    if (strcmp(mode, "AUTO")   == 0) isManual = false;
    if (strcmp(mode, "MANUAL") == 0) isManual = true;

    String ackMsg = "Control OK";
    if (strcmp(mode, "AUTO") == 0) ackMsg = "Che do AUTO OK";
    if (strcmp(mode, "MANUAL") == 0) ackMsg = "Che do MANUAL OK";

    if (isManual) {
      if (doc["pumpOut"].is<bool>()) {
        bool wantOut = doc["pumpOut"].as<bool>();
        setPump(RELAY_OUT, pumpOut, wantOut, "PUMP_OUT");
        ackMsg = wantOut ? "Bom ra ON OK" : "Bom ra OFF OK";
      }
      if (doc["pumpIn"] .is<bool>()) {
        bool want = doc["pumpIn"].as<bool>();
        if (want && volMl >= MAX_VOL) { ack(c, "Blocked: tank full", false); }
        else {
          setPump(RELAY_IN, pumpIn, want, "PUMP_IN");
          ackMsg = want ? "Bom vao ON OK" : "Bom vao OFF OK";
        }
      }
    }
    // Không cho 2 bơm chạy cùng lúc
    if (pumpIn && pumpOut) setPump(RELAY_OUT, pumpOut, false, "PUMP_OUT");

    ack(c, ackMsg.c_str(), true);
    broadcast();
    return;
  }

  if (strcmp(type, "config") == 0) {
    JsonObject cfg = doc["config"].as<JsonObject>();
    if (cfg["autoInOnMl"] .is<float>()) autoInOnMl  = cfg["autoInOnMl"] .as<float>();
    if (cfg["autoOutOnMl"].is<float>()) autoOutOnMl = cfg["autoOutOnMl"].as<float>();
    autoInOnMl  = constrain(autoInOnMl,  1.0f, MAX_VOL - 31);
    autoOutOnMl = constrain(autoOutOnMl, autoInOnMl + 30, MAX_VOL - 1);
    ack(c, "Config OK", true);
    broadcast();
    return;
  }

  ack(c, "Unknown", false);
}

void onWsEvent(uint8_t c, WStype_t t, uint8_t* payload, size_t len) {
  if (t == WStype_CONNECTED)    { sendTo(c); }
  if (t == WStype_TEXT)         { handleMsg(c, (const char*)payload, len); }
}

// ── WiFi ──────────────────────────────────────────────────────
void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  Serial.print("Connecting WiFi");
  for (int i = 0; i < 40 && WiFi.status() != WL_CONNECTED; i++) {
    delay(500); Serial.print('.');
  }
  Serial.println(WiFi.status() == WL_CONNECTED ? "\nOK: " + WiFi.localIP().toString() : "\nTimeout");
}

// ── Setup / Loop ──────────────────────────────────────────────
void setup() {
  Serial.begin(115200);
  pinMode(TRIG, OUTPUT); pinMode(ECHO, INPUT);
  pinMode(RELAY_OUT, OUTPUT); digitalWrite(RELAY_OUT, HIGH);
  pinMode(RELAY_IN,  OUTPUT); digitalWrite(RELAY_IN,  HIGH);
  connectWiFi();
  ws.begin();
  // Tạm tắt heartbeat server-side vì có thể gây close định kỳ với browser client.
  // Trạng thái sống của kết nối sẽ do phía client tự reconnect.
  ws.onEvent(onWsEvent);
  Serial.println("WebSocket :81 ready");
}

void loop() {
  ws.loop();

  // Reconnect WiFi nếu mất
  static unsigned long wifiLostSince = 0;
  static unsigned long lastWifiRetry = 0;
  if (WiFi.status() == WL_CONNECTED) {
    wifiLostSince = 0;
  } else {
    if (wifiLostSince == 0) wifiLostSince = millis();
    // Chỉ reconnect khi mất WiFi đủ lâu để tránh tự làm rớt WS vì nhiễu thoáng qua.
    if (millis() - wifiLostSince > 10000 && millis() - lastWifiRetry > 15000) {
      lastWifiRetry = millis();
      Serial.println("WiFi lost >10s, retrying...");
      WiFi.reconnect();
      if (WiFi.status() != WL_CONNECTED) WiFi.begin(WIFI_SSID, WIFI_PASS);
    }
  }

  static unsigned long lastBroadcast = 0;
  if (WiFi.status() == WL_CONNECTED && millis() - lastBroadcast >= 1000) {
    lastBroadcast = millis();
    broadcast();
  }

  // Đọc cảm biến mỗi 200ms → lọc median → gửi WS ngay
  static unsigned long lastSensor = 0;
  unsigned long now = millis();
  if (now - lastSensor >= 200) {
    unsigned long dtMs = (lastSensor == 0) ? 200 : (now - lastSensor);
    lastSensor = now;

    float raw = readCm();
    bool isValid = (raw >= VALID_CM_MIN && raw <= VALID_CM_MAX);
    if (isValid) {
      pushSample(raw);
      distCm = median();
      volMl  = cmToMl(distCm);
      lastGoodSampleMs = now;
      badSampleStreak = 0;
    } else {
      badSampleStreak++;
      // Chỉ neo về median 1 lần khi vừa bước vào chuỗi lỗi.
      // Nếu reset mỗi vòng thì fallback sẽ không tích lũy được.
      if (badSampleStreak == 1 && winCount > 0) {
        distCm = median();
        volMl = cmToMl(distCm);
      }
      // Fallback khi cảm biến nhiễu: nội suy thể tích theo trạng thái bơm.
      applyFallbackVolume(dtMs);
    }

    bool sensorStale = (lastGoodSampleMs > 0) && (now - lastGoodSampleMs > SENSOR_STALE_MS);
    bool sensorTooLongNoData = (lastGoodSampleMs > 0) && (now - lastGoodSampleMs > SENSOR_FAILSAFE_STOP_MS);
    if (!isManual && sensorTooLongNoData && (pumpIn || pumpOut)) {
      setPump(RELAY_IN,  pumpIn,  false, "PUMP_IN");
      setPump(RELAY_OUT, pumpOut, false, "PUMP_OUT");
      Serial.printf("[SAFE] Sensor no valid sample %lums, stop pumps (bad=%u)\n", now - lastGoodSampleMs, badSampleStreak);
    }

    // Bảo vệ: không bơm vào khi đầy
    if (volMl >= MAX_VOL) setPump(RELAY_IN, pumpIn, false, "PUMP_IN");

    if (!isManual) autoControl();

    static unsigned long lastDiag = 0;
    if (now - lastDiag >= 1000) {
      lastDiag = now;
      Serial.printf("dist=%.2f vol=%.1f pOut=%d pIn=%d stale=%d bad=%u wifi=%d rssi=%d\n", distCm, volMl, pumpOut, pumpIn, sensorStale ? 1 : 0, badSampleStreak, WiFi.status(), WiFi.RSSI());
    }
  }
}