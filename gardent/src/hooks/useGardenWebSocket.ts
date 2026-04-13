import { useState, useRef, useCallback, useEffect } from 'react';
import { OperatingMode, LogEntry, WsStatus, ChartDataPoint } from '../types/garden';

export function useGardenWebSocket() {
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [uptime, setUptime] = useState('--');
  
  // Core state
  const [volume, setVolume] = useState(-1);
  const [maxVolume, setMaxVolume] = useState(1000);
  const [pumpOut, setPumpOut] = useState(false);
  const [pumpIn, setPumpIn] = useState(false);
  const [mode, setMode] = useState<OperatingMode>('AUTO');
  
  // Config state
  const [autoInThreshold, setAutoInThreshold] = useState(150);
  const [autoOutThreshold, setAutoOutThreshold] = useState(400);
  
  // Connection state
  const [wsStatus, setWsStatus] = useState<WsStatus>('DISCONNECTED');
  const wsRef = useRef<WebSocket | null>(null);
  
  // Reconnect state refs
  const reconnectTimeoutRef = useRef<number | null>(null);
  const keepaliveIntervalRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const activeConnIdRef = useRef<number>(0);
  const unmountedRef = useRef<boolean>(false);
  const ipRef = useRef<string>(ipAddress);
  
  useEffect(() => {
    ipRef.current = ipAddress;
  }, [ipAddress]);
  
  // Logs & Chart
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (keepaliveIntervalRef.current) {
        window.clearInterval(keepaliveIntervalRef.current);
        keepaliveIntervalRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onopen = null;
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.onmessage = null;
        wsRef.current.close();
      }
    };
  }, []);

  // Update chart when volume changes
  useEffect(() => {
    if (volume >= 0) {
      setChartData((prev: ChartDataPoint[]) => {
        const time = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const newData = [...prev, { time, volume }];
        // Giữ lại khoảng 12 điểm trên trục X
        if (newData.length > 12) newData.shift();
        return newData;
      });
    }
  }, [volume]);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    const ts = new Date().toLocaleTimeString('vi-VN', { hour12: false });
    setLogs((prev: LogEntry[]) => {
      const newLogs = [...prev, { timestamp: ts, level, message }];
      if (newLogs.length > 100) newLogs.shift();
      return newLogs;
    });
  }, []);

  const connectWS = useCallback(() => {
    unmountedRef.current = false;

    // Tránh tự tạo reconnect loop khi người dùng bấm lại lúc kết nối đang sống.
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      addLog('INFO', 'WebSocket đang kết nối...');
      return;
    }
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      addLog('INFO', 'WebSocket đang hoạt động.');
      return;
    }

    // Clear any pending reconnect attempt
    if (reconnectTimeoutRef.current) {
      window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (keepaliveIntervalRef.current) {
      window.clearInterval(keepaliveIntervalRef.current);
      keepaliveIntervalRef.current = null;
    }

    // Close previous socket and detach its handlers to avoid stale callbacks.
    if (wsRef.current && (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN)) {
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;
      wsRef.current.close();
    }

    const connId = ++activeConnIdRef.current;
    setWsStatus('CONNECTING');
    addLog('INFO', `Đang kết nối đến ${ipRef.current}...`);
    
    // Start WebSocket
    const ws = new WebSocket(`ws://${ipRef.current}:81`);
    wsRef.current = ws;

    ws.onopen = () => {
      if (connId !== activeConnIdRef.current) return;
      reconnectAttemptsRef.current = 0;
      setWsStatus('CONNECTED');
      addLog('SUCCESS', 'Kết nối thành công.');
      ws.send(JSON.stringify({ type: 'request_state' }));
      keepaliveIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'request_state' }));
        }
      }, 8000);
    };

    ws.onclose = (e) => {
      if (connId !== activeConnIdRef.current) return;
      setWsStatus('DISCONNECTED');
      wsRef.current = null;
      if (keepaliveIntervalRef.current) {
        window.clearInterval(keepaliveIntervalRef.current);
        keepaliveIntervalRef.current = null;
      }

      if (!unmountedRef.current) {
        reconnectAttemptsRef.current += 1;
        const delayMs = Math.min(15000, 3000 * reconnectAttemptsRef.current);
        addLog('ERR', `WS ngắt (code ${e.code}). Thử lại sau ${Math.floor(delayMs / 1000)}s...`);
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWS();
        }, delayMs);
      }
    };

    ws.onerror = () => {
      if (connId !== activeConnIdRef.current) return;
      // onclose sẽ xử lý reconnect.
    };

    ws.onmessage = (e) => {
      if (connId !== activeConnIdRef.current) return;
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'state') {
          if (data.volumeMl !== undefined) setVolume(data.volumeMl);
          if (data.pumpOut !== undefined || data.pump1 !== undefined) setPumpOut(!!(data.pumpOut ?? data.pump1));
          if (data.pumpIn !== undefined || data.pump2 !== undefined) setPumpIn(!!(data.pumpIn  ?? data.pump2));
          if (data.mode !== undefined) setMode(data.mode);
          
          if (data.uptime !== undefined) {
            const up = data.uptime;
            const h  = Math.floor(up / 3600);
            const m  = Math.floor((up % 3600) / 60);
            const s  = up % 60;
            setUptime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
          }

          if (data.config) {
            if (data.config.autoInOnMl != null) setAutoInThreshold(data.config.autoInOnMl);
            if (data.config.autoOutOnMl != null) setAutoOutThreshold(data.config.autoOutOnMl);
            if (data.config.maxVolumeMl != null) setMaxVolume(data.config.maxVolumeMl);
          }
        } else if (data.type === 'ack') {
          addLog(data.ok ? 'SUCCESS' : 'ERR', data.message);
        }
      } catch (err) {
        // Silently catch parse errors mapping external input
      }
    };
  }, [addLog]);

  const sendWs = useCallback((obj: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(obj));
    } else {
      addLog('ERR', 'Chưa kết nối ESP32. Lệnh không được gửi.');
    }
  }, [addLog]);

  const handleModeChange = useCallback((newMode: OperatingMode) => {
    sendWs({ type: 'control', mode: newMode });
  }, [sendWs]);

  const handleTurnAllOff = useCallback(() => {
    sendWs({ type: 'control', mode: 'MANUAL', pumpOut: false, pumpIn: false });
  }, [sendWs]);

  const handleTogglePump = useCallback((type: 'in' | 'out') => {
    if (mode !== 'MANUAL') {
      addLog('ERR', 'Cần chuyển MANUAL (Thủ công) để điều khiển');
      return;
    }
    const isOut = type === 'out';
    const newPumpOut = isOut ? !pumpOut : false;
    const newPumpIn = !isOut ? !pumpIn : false;
    sendWs({ type: 'control', mode: 'MANUAL', pumpOut: newPumpOut, pumpIn: newPumpIn });
  }, [mode, pumpOut, pumpIn, sendWs, addLog]);

  const handleSaveConfig = useCallback((nextAutoIn?: number, nextAutoOut?: number) => {
    const cfgIn = nextAutoIn ?? autoInThreshold;
    const cfgOut = nextAutoOut ?? autoOutThreshold;

    if (cfgOut <= cfgIn + 30) {
      addLog('ERR', 'Ngưỡng Bơm Ra phải lớn hơn Bơm Vào ít nhất 30ml');
      return;
    }

    // Optimistic UI để người dùng thấy ngay giá trị đang gửi.
    setAutoInThreshold(cfgIn);
    setAutoOutThreshold(cfgOut);
    sendWs({ type: 'config', config: { autoInOnMl: cfgIn, autoOutOnMl: cfgOut } });
    addLog('INFO', 'Đang gửi cấu hình...');
  }, [autoOutThreshold, autoInThreshold, sendWs, addLog]);

  return {
    state: {
      ipAddress, uptime, volume, maxVolume, pumpOut, pumpIn, 
      mode, autoInThreshold, autoOutThreshold, wsStatus, logs, chartData
    },
    actions: {
      setIpAddress, connectWS, handleModeChange, handleTurnAllOff, 
      handleTogglePump, handleSaveConfig
    }
  };
}
