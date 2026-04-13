import { Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LogEntry } from '../../types/garden';

interface LogsTerminalProps {
  logs: LogEntry[];
}

export const LogsTerminal = ({ logs }: LogsTerminalProps) => {
  return (
    <div className="glass-card p-6 rounded-[24px] lg:rounded-[32px] shadow-sm border border-white/50 flex-1 flex flex-col min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Terminal className="w-5 h-5 text-on-surface-variant" />
        <h3 className="font-bold text-lg font-headline">Nhật Ký Hệ Thống</h3>
      </div>
      <div className="bg-[#0f172a] text-primary-container p-5 rounded-[20px] font-mono text-[12px] flex-1 overflow-y-auto custom-scrollbar border border-white/5 max-h-[220px]">
        <AnimatePresence initial={false}>
          {logs.map((log, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex gap-3 mb-1.5"
            >
              <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
              <span className={
                log.level === 'SUCCESS' ? 'text-emerald-400 font-semibold' :
                log.level === 'ERR' ? 'text-red-400 font-semibold' :
                log.level === 'PUMP' ? 'text-blue-300' :
                log.level === 'MODE' ? 'text-amber-300' :
                'text-slate-300'
              }>
                {log.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};
