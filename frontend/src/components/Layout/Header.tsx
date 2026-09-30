import React, { useState, useEffect, useRef } from 'react';
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
  const menuRef = useRef<HTMLDivElement>(null);
  React.useEffect(() => notificationService.subscribe(setNotifications), []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

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
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          className="lg:hidden mobile-menu-btn w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          aria-label="Open menu"
          onClick={toggle}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Breadcrumbs - responsive */}
        <nav className="flex items-center gap-1 text-sm min-w-0 overflow-hidden hidden sm:flex">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.to}>
              {i > 0 && <span className="text-slate-500 flex-shrink-0">/</span>}
              <button
                onClick={() => crumb.to && navigate(crumb.to)}
                className={`flex-shrink-0 truncate max-w-[120px] sm:max-w-[160px] ${i === breadcrumbs.length - 1 ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                {crumb.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        {/* Mobile breadcrumb - only show current page */}
        <div className="sm:hidden flex-1 truncate text-white font-medium text-sm">
          {breadcrumbs[breadcrumbs.length - 1]?.label || 'Home'}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Search - show on md and up, compact on sm */}
        <div className="relative hidden sm:flex">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search..."
            className="w-[180px] sm:w-[220px] md:w-[280px] pl-9 pr-3 py-1.5 sm:py-2 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
          />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={() => setDark(!dark)}
          className="w-9 h-9 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 transition-all"
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
        <div className="relative z-50" ref={menuRef}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-1.5 py-1.5 text-left shadow-sm shadow-slate-950/20 transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06] focus:outline-none focus:ring-2 focus:ring-indigo-500/60 sm:gap-2.5 sm:px-2"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            {user?.image ? (
              <img
                src={user.image}
                alt={user.username || 'User'}
                className="h-8 w-8 rounded-full object-cover ring-2 ring-white/10 sm:h-9 sm:w-9"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-white/10 sm:h-9 sm:w-9"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {initials}
              </div>
            )}

            <div className="hidden min-w-0 text-left md:block">
              <div className="truncate text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">Account</div>
              <div className="truncate text-sm font-semibold text-white">{user?.username || 'User'}</div>
            </div>

            <ChevronDown className={`hidden h-3.5 w-3.5 text-slate-400 transition-transform sm:block ${menuOpen ? 'rotate-180' : ''}`} />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-[1px] sm:hidden" onClick={() => setMenuOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 12, scale: 0.98 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="fixed left-3 right-3 top-[72px] z-50 max-h-[min(70vh,420px)] overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-slate-950/95 shadow-2xl shadow-slate-950/40 backdrop-blur-xl sm:absolute sm:inset-auto sm:right-0 sm:left-auto sm:top-[calc(100%+0.75rem)] sm:w-[260px] sm:max-h-none sm:overflow-visible sm:rounded-xl"
                style={{
                  borderColor: 'rgba(255,255,255,0.12)',
                  boxShadow: '0 24px 60px rgba(15, 23, 42, 0.7)',
                }}
              >
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    {user?.image ? (
                      <img src={user.image} alt={user.username || 'User'} className="h-10 w-10 rounded-full object-cover ring-2 ring-white/10" />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white ring-2 ring-white/10" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
                        {initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">{user?.username || 'User'}</div>
                      <div className="truncate text-[11px] text-slate-400">{user?.email || 'No email provided'}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="rounded-full p-2 text-slate-400 transition hover:bg-white/5 hover:text-white sm:hidden"
                    onClick={() => setMenuOpen(false)}
                    aria-label="Close account menu"
                  >
                    <ChevronDown className="h-4 w-4 rotate-90" />
                  </button>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => { navigate('/profile'); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-200">
                      <User className="h-4 w-4" />
                    </span>
                    <span className="font-medium">Profile</span>
                  </button>

                  <button
                    onClick={() => { navigate('/settings'); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slate-200 transition hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-200">
                      <Settings className="h-4 w-4" />
                    </span>
                    <span className="font-medium">Settings</span>
                  </button>
                </div>

                <div className="border-t border-white/10 p-2">
                  <button
                    onClick={async () => { await authService.logout(); navigate('/login'); setMenuOpen(false); }}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-rose-300 transition hover:bg-rose-500/10 hover:text-rose-200"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300">
                      <LogOut className="h-4 w-4" />
                    </span>
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </div>
      </div>
    </motion.header>
  );
};