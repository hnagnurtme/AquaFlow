import { Activity, CheckCircle2, Hand, Power } from 'lucide-react';
import { useEffect, useState } from 'react';
import { OperatingMode } from '../../types/garden';

interface ControlPanelProps {
  mode: OperatingMode;
  handleModeChange: (mode: OperatingMode) => void;
  handleTurnAllOff: () => void;
  handleSaveConfig: (autoIn: number, autoOut: number) => void;
  maxVolume: number;
  autoInThreshold: number;
  autoOutThreshold: number;
}

export const ControlPanel = ({
  mode,
  handleModeChange,
  handleTurnAllOff,
  handleSaveConfig,
  maxVolume,
  autoInThreshold,
  autoOutThreshold
}: ControlPanelProps) => {
  const [draftAutoIn, setDraftAutoIn] = useState(autoInThreshold);
  const [draftAutoOut, setDraftAutoOut] = useState(autoOutThreshold);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (!isDirty) {
      setDraftAutoIn(autoInThreshold);
      setDraftAutoOut(autoOutThreshold);
    }
  }, [autoInThreshold, autoOutThreshold, isDirty]);

  const handleSubmitConfig = () => {
    handleSaveConfig(draftAutoIn, draftAutoOut);
    setIsDirty(false);
  };

  return (
    <>
      <div className="glass-card p-4 rounded-[20px] shadow-sm border border-white/50 w-full">
        <h3 className="font-bold text-sm mb-3 font-headline">Chế Độ Hoạt Động</h3>
        <div className="flex flex-col gap-2">
          <button 
            onClick={() => handleModeChange('AUTO')}
            className={`group flex items-center justify-between p-2.5 rounded-lg transition-all active:scale-95 ${
              mode === 'AUTO' 
                ? 'bg-gradient-to-br from-emerald-600 to-emerald-800 text-white shadow-lg shadow-emerald-200' 
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <div className="text-left leading-tight">
                <span className="block font-bold text-xs">AUTO</span>
              </div>
            </div>
            {mode === 'AUTO' && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>

          <button 
            onClick={() => handleModeChange('MANUAL')}
            className={`group flex items-center justify-between p-2.5 rounded-lg transition-all active:scale-95 ${
              mode === 'MANUAL' 
                ? 'bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-200' 
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <div className="flex items-center gap-2">
              <Hand className="w-4 h-4" />
              <div className="text-left leading-tight">
                <span className="block font-bold text-xs">MANUAL</span>
              </div>
            </div>
            {mode === 'MANUAL' && <CheckCircle2 className="w-3.5 h-3.5" />}
          </button>

          <button 
            onClick={handleTurnAllOff}
            className="mt-1 flex items-center justify-center gap-2 p-2 text-red-500 font-bold text-[11px] uppercase tracking-wider hover:bg-red-50 rounded-lg transition-all border border-transparent hover:border-red-100"
          >
            <Power className="w-3.5 h-3.5" />
            Tắt Bơm Khẩn Cấp
          </button>
        </div>
      </div>

      <div className="glass-card p-4 rounded-[20px] shadow-sm border border-white/50 w-full mt-4">
        <h3 className="font-bold text-sm mb-3 font-headline flex justify-between items-center">
          <span>Cấu Hình Bơm</span>
          <span className="text-[10px] bg-secondary-container/50 text-secondary px-2 py-0.5 rounded-full">MAX {maxVolume}</span>
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <span>Bơm Vào khi &lt;</span>
              <span className="text-primary font-black bg-primary/10 px-2 rounded-md">{draftAutoIn} ml</span>
            </div>
            <input 
              className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary" 
              max={maxVolume} 
              min="0" 
              step="5"
              type="range" 
              value={draftAutoIn}
              onChange={(e) => {
                setIsDirty(true);
                setDraftAutoIn(parseInt(e.target.value));
              }}
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              <span>Bơm Ra khi &gt;</span>
              <span className="text-secondary font-black bg-secondary/10 px-2 rounded-md">{draftAutoOut} ml</span>
            </div>
            <input 
              className="w-full h-1.5 bg-surface-container rounded-lg appearance-none cursor-pointer accent-secondary" 
              max={maxVolume} 
              min="0" 
              step="5"
              type="range" 
              value={draftAutoOut}
              onChange={(e) => {
                setIsDirty(true);
                setDraftAutoOut(parseInt(e.target.value));
              }}
            />
          </div>
          
          <button 
            onClick={handleSubmitConfig}
            className="w-full bg-primary text-on-primary px-3 py-2 mt-1 rounded-lg text-[11px] font-bold shadow-md hover:shadow-primary/20 transition-all active:scale-95 border border-primary-dim"
          >
            Gửi Cấu Hình
          </button>
        </div>
      </div>
    </>
  );
};
