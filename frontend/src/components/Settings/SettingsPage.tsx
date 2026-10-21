import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Lock, UserRound, Globe } from 'lucide-react';
import { authService } from '../../services/authService';
import { GlassCard } from '../UI/GlassCard';

export const SettingsPage: React.FC = () => {
  const user = authService.getUser();

  const settings = [
    {
      icon: <UserRound size={19} />,
      iconBg: 'bg-indigo-500/20',
      iconColor: 'text-indigo-300',
      title: 'Profile details',
      description: 'Account name',
      value: user?.username || 'Not available',
      subDescription: 'Email address',
      subValue: user?.email || 'Not available',
      delay: 0,
    },
    {
      icon: <Bell size={19} />,
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-300',
      title: 'Notifications',
      description: 'Stay informed about new training and task assignments.',
      extra: true,
      delay: 0.1,
    },
    {
      icon: <Lock size={19} />,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-300',
      title: 'Security',
      description: 'Your account is protected by authenticated workspace access.',
      badge: true,
      badgeText: `Role: ${user?.role || 'user'}`,
      delay: 0.2,
    },
    {
      icon: <Globe size={19} />,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-300',
      title: 'Appearance',
      description: 'Dark mode provides the best contrast for evaluation work.',
      badge: true,
      badgeText: 'Dark mode',
      delay: 0.3,
    },
  ];

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">
            <UserRound size={14} /> Account
          </span>
          <h1>Settings</h1>
          <p>Review your profile and workspace preferences.</p>
        </div>
      </section>

      <motion.section
        className="settings-grid"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {settings.map((setting) => (
          <GlassCard
            key={setting.title}
            className="settings-card"
            delay={setting.delay}
          >
            <motion.div
              className={`settings-card-icon ${setting.iconBg}`}
              whileHover={{ rotate: 5, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              {React.cloneElement(setting.icon as React.ReactElement<{ className?: string }>, { className: setting.iconColor })}
            </motion.div>

            <div className="flex-1">
              <h2 className="text-white font-semibold mb-1">{setting.title}</h2>
              <p className="text-sm text-slate-400 mb-2">{setting.description}</p>

              {setting.value && (
                <p className="text-sm text-slate-200 font-medium">{setting.value}</p>
              )}
              {setting.subValue && (
                <p className="text-xs text-slate-500 mt-1">{setting.subDescription}: {setting.subValue}</p>
              )}

              {setting.extra && (
                <label className="setting-toggle">
                  <input type="checkbox" defaultChecked />
                  <span>Email updates</span>
                </label>
              )}

              {setting.badge && (
                <span className="status-pill">{setting.badgeText}</span>
              )}
            </div>
          </GlassCard>
        ))}
      </motion.section>
    </div>
  );
};
