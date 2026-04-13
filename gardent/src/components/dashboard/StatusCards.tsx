import { Droplets, Info, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { StatusBadge } from '../ui/StatusBadge';
import { Toggle } from '../ui/Toggle';
import { WsStatus } from '../../types/garden';

interface StatusCardsProps {
  wsStatus: WsStatus;
  volume: number;
  maxVolume: number;
  autoInThreshold: number;
  autoOutThreshold: number;
  pumpOut: boolean;
  pumpIn: boolean;
  handleTogglePump: (type: 'in' | 'out') => void;
}

export const StatusCards = ({ 
  wsStatus, 
  volume, 
  maxVolume, 
  autoInThreshold, 
  autoOutThreshold, 
  pumpOut, 
  pumpIn, 
  handleTogglePump 
}: StatusCardsProps) => {
  
  const isVolumeSafe = volume >= autoInThreshold && volume <= autoOutThreshold;
  const statusNote = volume < 0 ? 'Đang cập nhật...' : 
    volume >= maxVolume ? `Đầy bình (${maxVolume})` :
    volume < autoInThreshold ? 'Mực nước thấp' :
    volume > autoOutThreshold ? 'Mực nước cao' : 'Mực nước cực đẹp';

  return (
    <>
      {/* Volume Card */}
      <motion.div 
        whileHover={{ y: -2 }}
        className="glass-card p-6 rounded-[24px] shadow-sm border border-white/50 relative overflow-hidden group w-full"
      >
        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-primary/10 transition-colors" />
        <div className="flex justify-between items-center mb-5 relative z-10">
          <div className="p-2.5 bg-secondary-container/30 rounded-xl">
            <Droplets className="text-secondary w-5 h-5" />
          </div>
          <StatusBadge variant={
            wsStatus !== 'CONNECTED' ? 'default' :
            volume < 0 ? 'default' :
            isVolumeSafe ? 'success' : 'warning'
          }>
            {wsStatus !== 'CONNECTED' ? 'Mất L/K' : (isVolumeSafe ? 'Ổn định' : 'Cảnh báo')}
          </StatusBadge>
        </div>
        <h3 className="text-on-surface-variant text-xs font-bold uppercase tracking-wider mb-1 relative z-10">Bình Chứa</h3>
        <div className="flex items-baseline gap-1.5 mb-5 relative z-10">
          <span className="text-4xl font-black text-on-surface tracking-tighter font-headline">
            {volume < 0 ? '--' : volume.toFixed(0)}
          </span>
          <span className="text-base font-bold text-on-surface-variant">ml</span>
        </div>
        <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden relative z-10">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${volume < 0 ? 0 : Math.max(0, Math.min(100, (volume / maxVolume) * 100))}%` }}
            className="h-full bg-gradient-to-r from-secondary to-secondary-container rounded-full" 
          />
        </div>
        <p className="mt-4 text-[11px] text-on-surface-variant font-medium flex items-center gap-1.5 relative z-10">
          <Info className="w-3.5 h-3.5 opacity-70" />
          {statusNote}
        </p>
      </motion.div>

      {/* Pump Control Card */}
      <div className="glass-card p-6 rounded-[24px] shadow-sm border border-white/50 w-full flex-grow">
        <div className="flex items-center gap-2 mb-6">
          <div className="p-2.5 bg-primary-container/20 rounded-xl">
            <Zap className="text-primary w-5 h-5" />
          </div>
          <h3 className="font-bold text-base font-headline">Điều Khiển Bơm</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3.5 bg-surface-container-low/40 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Bơm Ra (Out)</span>
              <span className={`text-sm font-black flex items-center gap-1 mt-0.5 ${pumpOut ? 'text-primary' : 'text-red-500'}`}>
                {pumpOut ? 'ĐANG CHẠY' : 'TẮT'}
              </span>
            </div>
            <Toggle active={pumpOut} onToggle={() => handleTogglePump('out')} color="error" />
          </div>
          <div className="flex items-center justify-between p-3.5 bg-primary-container/10 rounded-xl">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Bơm Vào (In)</span>
              <span className={`text-sm font-black flex items-center gap-1 mt-0.5 ${pumpIn ? 'text-primary' : 'text-red-500'}`}>
                {pumpIn ? 'ĐANG CHẠY' : 'TẮT'}
              </span>
            </div>
            <Toggle active={pumpIn} onToggle={() => handleTogglePump('in')} color="primary" />
          </div>
        </div>
      </div>
    </>
  );
};
