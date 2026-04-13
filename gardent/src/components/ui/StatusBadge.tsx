import { ReactNode } from 'react';

interface StatusBadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'connecting';
}

export const StatusBadge = ({ children, variant = 'default' }: StatusBadgeProps) => {
  const styles = {
    default: 'bg-secondary-container/50 text-secondary',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-orange-100 text-orange-700',
    error: 'bg-red-100 text-red-700',
    connecting: 'bg-blue-100 text-blue-700'
  };
  
  return (
    <span className={`text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${styles[variant]}`}>
      {children}
    </span>
  );
};
