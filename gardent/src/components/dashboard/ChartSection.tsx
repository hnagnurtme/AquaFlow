import { motion } from 'motion/react';
import { StatusBadge } from '../ui/StatusBadge';
import { WsStatus, OperatingMode, ChartDataPoint } from '../../types/garden';

interface ChartSectionProps {
  wsStatus: WsStatus;
  chartData: ChartDataPoint[];
  maxVolume: number;
  autoInThreshold: number;
  autoOutThreshold: number;
  mode: OperatingMode;
}

export const ChartSection = ({ 
  wsStatus, 
  chartData, 
  maxVolume, 
  autoInThreshold, 
  autoOutThreshold, 
  mode 
}: ChartSectionProps) => {

  const createPath = (data: ChartDataPoint[], max: number, width: number, height: number, isFill = false) => {
    if (data.length === 0) return '';
    const points = data.map((d, i) => {
      const x = (i / Math.max(1, data.length - 1)) * width;
      const y = height - Math.max(0, Math.min(height, (d.volume / max) * height));
      return `${x},${y}`;
    });
    
    // Convert to smooth path representation roughly
    let path = `M ${points[0].split(',')[0]} ${points[0].split(',')[1]}`;
    // For smooth bezier connections (catmull-rom style would be complex, straight lines are fine)
    for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].split(',')[0]} ${points[i].split(',')[1]}`;
    }

    if (isFill && data.length > 0) {
      path += ` L ${width} ${height} L 0 ${height} Z`;
    }
    return path;
  };

  return (
    <div className="glass-card p-8 rounded-[24px] lg:rounded-[32px] shadow-[0_16px_32px_rgba(0,106,53,0.04)] border border-white/50 flex flex-col min-h-[400px] w-full">
        <div className="flex justify-between items-center mb-8 relative z-10">
          <div>
            <h3 className="font-bold text-xl mb-1 font-headline">Biểu Đồ Thể Tích Thực Tế</h3>
            <p className="text-sm text-on-surface-variant">Line Chart theo thời gian thực (ml)</p>
          </div>
          <div>
            <StatusBadge variant={wsStatus === 'CONNECTED' ? 'success' : wsStatus === 'CONNECTING' ? 'connecting' : 'error'}>
              {wsStatus}
            </StatusBadge>
          </div>
        </div>

        {/* Dynamic SVG Line Chart Visualization */}
        <div className="flex-1 relative mt-4 min-h-[240px] ml-6 pb-8">
          {/* Y-Axis Grid Lines */}
          <div className="absolute inset-0 flex flex-col justify-between border-l-2 border-b-2 border-outline-variant/30 pb-6 pl-2">
            {[100, 75, 50, 25, 0].map((percent) => (
              <div key={percent} className="w-full border-t border-dashed border-outline-variant/10 relative">
                <span className="absolute -left-10 -top-2.5 text-[10px] font-bold text-on-surface-variant w-8 text-right">
                  {Math.round((maxVolume * percent) / 100)}
                </span>
              </div>
            ))}
          </div>

          {/* SVG Line & Gradient Rendering */}
          <div className="absolute inset-x-0 bottom-6 top-0 pl-2 pointer-events-none">
            <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(16, 185, 129, 0.45)" />  {/* emerald-500 */}
                  <stop offset="100%" stopColor="rgba(16, 185, 129, 0.01)" />
                </linearGradient>
              </defs>
              
              {chartData.length > 0 && (
                <>
                  <motion.path 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    d={createPath(chartData, maxVolume, 1000, 300, true)} 
                    fill="url(#chartGradient)" 
                  />
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    d={createPath(chartData, maxVolume, 1000, 300, false)} 
                    fill="none" 
                    stroke="#10b981" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    strokeLinejoin="round" 
                    className="drop-shadow-lg"
                  />
                  
                  {/* Drawing point markers */}
                  {chartData.map((d, i) => {
                    const x = (i / Math.max(1, chartData.length - 1)) * 1000;
                    const y = 300 - Math.max(0, Math.min(300, (d.volume / maxVolume) * 300));
                    return (
                      <circle 
                        key={i} 
                        cx={x} 
                        cy={y} 
                        r="6" 
                        fill="#10b981" 
                        className="drop-shadow-sm stroke-white stroke-2" 
                      />
                    );
                  })}
                </>
              )}
            </svg>
          </div>

          {/* X Axis Time Labels */}
          <div className="absolute bottom-0 left-2 right-0 h-6">
            {chartData.map((d, i) => {
              const xPos = (i / Math.max(1, chartData.length - 1)) * 100;
              
              // Luôn hiện điểm đầu, điểm cuối và tối đa 2-3 điểm ở giữa
              const isFirst = i === 0;
              const isLast = i === chartData.length - 1;
              const spacing = Math.max(1, Math.floor(chartData.length / 3));
              const isMiddle = i % spacing === 0 && !isFirst && !isLast;
              
              const shouldShow = isFirst || isLast || isMiddle;
              
              // Căn chỉnh chữ để mốc đầu không bị tràn trái, mốc cuối không tràn phải
              const alignClass = isFirst ? 'text-left' : isLast ? 'text-right -translate-x-full' : '-translate-x-1/2 text-center';
              
              return (
                <span 
                  key={i} 
                  className={`absolute text-[11px] font-bold text-on-surface-variant/80 whitespace-nowrap transition-opacity duration-300 ${shouldShow ? 'opacity-100 block' : 'hidden'} ${alignClass}`}
                  style={{ left: `${xPos}%` }}
                >
                  {d.time}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-8 pt-6 border-t border-outline-variant/10 relative z-10">
          <div className="text-center">
            <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Max</span>
            <span className="font-bold text-on-surface">{maxVolume} ml</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Auto In</span>
            <span className="font-bold text-on-surface">{autoInThreshold} ml</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Auto Out</span>
            <span className="font-bold text-on-surface">{autoOutThreshold} ml</span>
          </div>
          <div className="text-center">
            <span className="block text-[10px] uppercase font-bold text-on-surface-variant mb-1">Mode</span>
            <span className="font-bold text-primary">{mode}</span>
          </div>
        </div>
      </div>
  );
};
