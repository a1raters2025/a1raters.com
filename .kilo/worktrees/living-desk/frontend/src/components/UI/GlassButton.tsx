import React from 'react';
import { motion } from 'framer-motion';
import type { LucideIcon } from 'lucide-react';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  disabled?: boolean;
  className?: string;
  delay?: number;
  type?: 'button' | 'submit';
}

const sizeClasses = {
  sm: 'px-4 py-2 text-xs font-semibold',
  md: 'px-5 py-2.5 text-sm font-semibold',
  lg: 'px-6 py-3 text-base font-bold',
};

const variantClasses = {
  primary:
    'bg-linear-to-r from-indigo-500 to-violet-500 border border-transparent text-white shadow-lg shadow-indigo-500/30',
  secondary:
    'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10',
  ghost:
    'bg-transparent border border-white/10 text-slate-300 hover:bg-white/5 hover:text-white',
};

const iconSize = { sm: 14, md: 16, lg: 18 };

export const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  disabled = false,
  className = '',
  delay = 0,
  type = 'button',
}) => {
  const iconEl = Icon ? <Icon size={iconSize[size]} /> : null;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={disabled ? undefined : (variant === 'primary' ? { scale: 1.03, y: -2 } : { scale: 1.02 })}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      className={`
        inline-inline-flex items-center justify-center gap-2 rounded-xl font-semibold
        transition-all duration-200
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {iconPosition === 'left' && iconEl}
      {children}
      {iconPosition === 'right' && iconEl}
    </motion.button>
  );
};
