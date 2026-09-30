import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import { useMobileMenu } from '../../contexts/MobileMenuContext';
import { Menu, Bell, Search, ChevronDown, LogOut, Settings, User, Moon, Sun } from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationService, type AppNotification } from '../../services/notificationService';

interface Breadcrumb {
  label: string;
  to?: string;
}

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toggle } = useMobileMenu();
  const user = authService.getUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [notifications, setNotifications] = useState<AppNotification[]>(notificationService.getAll());
  React.useEffect(() => notificationService.subscribe(setNotifications), []);

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs: Breadcrumb[] = [
    { label: 'Home', to: '/' },
    ...pathSegments.map((seg, i) => {
      const to = '/' + pathSegments.slice(0, i + 1).join('/');
      return { label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '), to };
    }),
  ];

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <motion.header
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="page-header app-header-layer"
      style={{
        background: 'rgba(10,14,26,0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Left: Menu + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          className="lg:hidden mobile-menu-btn w-10 h-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Open menu"
          onClick={toggle}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0 overflow-hidden">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.to}>
              {i > 0 && <span className="text-slate-600 flex-shrink-0">/</span>}
              <button
                onClick={() => crumb.to && navigate(crumb.to)}
                className={`flex-shrink-0 truncate max-w-[140px] ${i === breadcrumbs.length - 1 ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks, users..."
            className="w-48 lg:w-64 pl-9 pr-3 py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Toggle theme"
        >
          {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications */}
        <button onClick={() => navigate('/notifications')} aria-label="Open notifications" className="relative w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <Bell className="w-4 h-4" />
          {notifications.some(item => !item.read) && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500" />}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-2 pr-2 py-1.5 rounded-lg hover:bg-white/5 transition-all"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {initials}
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-50"
              style={{
                background: 'rgba(15,21,37,0.95)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              }}
            >
              <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="text-sm font-semibold text-white truncate">{user?.username || 'User'}</div>
                <div className="text-xs text-slate-400 truncate">{user?.email || ''}</div>
              </div>
              <div className="py-1">
                <button onClick={() => { navigate('/settings'); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                  <User className="w-4 h-4" /> Profile
                </button>
                <button onClick={() => { navigate('/settings'); setMenuOpen(false); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-all">
                  <Settings className="w-4 h-4" /> Settings
                </button>
              </div>
              <div className="border-t py-1" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <button
                  onClick={async () => { await authService.logout(); navigate('/login'); setMenuOpen(false); }}
                  className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-rose-300 hover:bg-rose-500/10 transition-all"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.header>
  );
};