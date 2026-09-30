import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { GlassCard } from './GlassCard';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  color?: 'indigo' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose';
  delay?: number;
}

const colorMap: Record<string, { iconBg: string; textColor: string; glow: string }> = {
  indigo: { iconBg: 'bg-indigo-500/20', textColor: 'text-indigo-300', glow: 'rgba(99,102,241,0.3)' },
  violet: { iconBg: 'bg-violet-500/20', textColor: 'text-violet-300', glow: 'rgba(139,92,246,0.3)' },
  cyan: { iconBg: 'bg-cyan-500/20', textColor: 'text-cyan-300', glow: 'rgba(6,182,212,0.3)' },
  emerald: { iconBg: 'bg-emerald-500/20', textColor: 'text-emerald-300', glow: 'rgba(16,185,129,0.3)' },
  amber: { iconBg: 'bg-amber-500/20', textColor: 'text-amber-300', glow: 'rgba(245,158,11,0.3)' },
  rose: { iconBg: 'bg-rose-500/20', textColor: 'text-rose-300', glow: 'rgba(239,68,68,0.3)' },
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, trend, color = 'indigo', delay = 0 }) => {
  const c = colorMap[color];
  return (
    <GlassCard delay={delay} className="p-5 relative overflow-hidden">
      <div
        className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl opacity-20"
        style={{ background: c.glow }}
      />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <motion.div
            className={`w-11 h-11 rounded-xl ${c.iconBg} flex items-center justify-center`}
            whileHover={{ rotate: 5, scale: 1.1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            <Icon className={`w-5 h-5 ${c.textColor}`} />
          </motion.div>
          {trend && (
            <motion.span
              className={`text-xs font-bold px-2 py-1 rounded-full ${
                trend.positive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
              }`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: delay + 0.2, duration: 0.3 }}
            >
              {trend.positive ? '↑' : '↓'} {trend.value}
            </motion.span>
          )}
        </div>
        <p className="text-sm text-slate-400 font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </GlassCard>
  );
};
