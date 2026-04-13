import { motion } from 'motion/react';

interface ToggleProps {
  active: boolean;
  onToggle: () => void;
  color?: 'primary' | 'error';
}

export const Toggle = ({ active, onToggle, color = 'primary' }: ToggleProps) => {
  const bgColor = active 
    ? (color === 'primary' ? 'bg-primary' : 'bg-red-500') 
    : 'bg-surface-container-highest';
    
  return (
    <button 
      onClick={onToggle}
      className={`w-14 h-8 ${bgColor} rounded-full p-1 transition-all flex ${active ? 'justify-end' : 'justify-start'}`}
    >
      <motion.div 
        layout
        className="w-6 h-6 bg-white rounded-full shadow-sm"
      />
    </button>
  );
};
