export type OperatingMode = 'AUTO' | 'MANUAL';

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'ERR' | 'SUCCESS' | 'MODE' | 'PUMP';
  message: string;
}

export type WsStatus = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';

export interface ChartDataPoint {
  time: string;
  volume: number;
}
