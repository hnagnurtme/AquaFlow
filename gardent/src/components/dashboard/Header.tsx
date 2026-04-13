import { Cpu, Wifi, Clock } from 'lucide-react';
import { WsStatus } from '../../types/garden';

interface HeaderProps {
  ipAddress: string;
  setIpAddress: (ip: string) => void;
  wsStatus: WsStatus;
  connectWS: () => void;
  uptime: string;
}

export const Header = ({ ipAddress, setIpAddress, wsStatus, connectWS, uptime }: HeaderProps) => {
  return (
    <section className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div>
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">IP Address</span>
            <div className="flex items-center gap-1.5">
              <Wifi className="w-3 h-3 text-secondary" />
              <span className="font-mono text-sm text-secondary font-semibold">{ipAddress}</span>
            </div>
          </div>
          <div className="flex flex-col border-l border-outline-variant/30 pl-4">
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">System Uptime</span>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-secondary" />
              <span className="font-mono text-sm text-secondary font-semibold">{uptime}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-2 rounded-[24px] flex flex-col sm:flex-row items-center gap-2 shadow-sm border border-white/40">
        <div className="relative flex-1 min-w-[240px] w-full">
          <Cpu className="absolute left-4 top-1/2 -translate-y-1/2 text-outline w-5 h-5" />
          <input 
            className="w-full pl-12 pr-4 py-3 bg-surface-container-low/50 border-none rounded-[18px] focus:ring-2 focus:ring-primary/20 text-sm font-medium outline-none" 
            placeholder="Nhập IP (VD: 192.168.1.x)" 
            type="text"
            value={ipAddress}
            onChange={(e) => setIpAddress(e.target.value)}
          />
        </div>
        <button 
          onClick={connectWS}
          className={`w-full sm:w-auto px-8 py-3 rounded-[18px] font-bold text-sm tracking-wide active:scale-95 transition-all shadow-lg text-white ${
            wsStatus === 'CONNECTED' ? 'bg-emerald-600 shadow-emerald-600/20 hover:bg-emerald-700' :
            wsStatus === 'CONNECTING' ? 'bg-orange-500 shadow-orange-500/20' :
            'bg-gradient-to-br from-primary to-primary-dim shadow-primary/20'
          }`}
        >
          {wsStatus === 'CONNECTED' ? 'Đã Kết Nối' : wsStatus === 'CONNECTING' ? 'Đang Kết Nối...' : 'Kết Nối'}
        </button>
      </div>
    </section>
  );
};
