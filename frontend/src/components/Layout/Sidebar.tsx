import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import {
  LayoutDashboard,
  ClipboardCheck,
  BookOpen,
  FileText,
  History,
  Settings,
  LogOut,
  Shield,
  Send,
  Users,
  Video,
  FolderOpen,
  Trophy,
  User,
  FileDown,
  Bell,
  Activity,
  X,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMobileMenu } from '../../contexts/MobileMenuContext';

interface NavItem {
  label: string;
  to: string;
  icon: React.ElementType;
  badge?: string;
  section: string;
  clientOnly?: boolean;
  adminOnly?: boolean;
}

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const { close } = useMobileMenu();
  const user = authService.getUser();
  const isAdmin = user?.role === 'admin';
  const isClient = user?.role === 'client';
  const isRater = user?.role === 'user' || user?.role === 'admin';

  const allNav: NavItem[] = [
    {
      label: 'Overview',
      to: isClient ? '/client-dashboard' : '/dashboard',
      icon: LayoutDashboard,
      section: 'Workspace',
    },
    ...(isRater
      ? [
          {
            label: 'Task Workspace',
            to: '/tasks',
            icon: ClipboardCheck,
            section: 'Workspace',
          },
          { label: 'Leaderboard', to: '/leaderboard', icon: Trophy, section: 'Workspace' },
        ]
      : []),
    { label: 'Training Library', to: '/training', icon: BookOpen, section: 'Learning' },
    { label: 'Reports', to: '/report', icon: FileText, section: 'Reporting' },
    { label: 'My Reports', to: '/my-reports', icon: History, section: 'Reporting' },
    { label: 'History & Invoices', to: '/history', icon: History, section: 'Reporting' },
    { label: 'My Profile', to: '/profile', icon: User, section: 'Account' },
    { label: 'Contact', to: '/contact', icon: Send, section: 'Account' },
    { label: 'Notifications', to: '/notifications', icon: Bell, section: 'Account' },
    ...(isAdmin
      ? [
          { label: 'User Management', to: '/admin/users', icon: Users, section: 'Admin', adminOnly: true },
          { label: 'Task Management', to: '/admin/tasks', icon: FolderOpen, section: 'Admin', adminOnly: true },
          { label: 'Audit Log', to: '/admin/audit-log', icon: Shield, section: 'Admin', adminOnly: true },
          { label: 'Activity Monitor', to: '/admin/activity-monitor', icon: Activity, section: 'Admin', adminOnly: true },
          { label: 'Video Training', to: '/admin/training', icon: Video, section: 'Admin', adminOnly: true },
          { label: 'Import Data', to: '/import-data', icon: FileDown, section: 'Admin', adminOnly: true },
          { label: 'System Settings', to: '/admin/settings', icon: Shield, section: 'Admin', adminOnly: true },
        ]
      : []),
    { label: 'Settings', to: '/settings', icon: Settings, section: 'Account' },
  ];

  const filteredNav = allNav.filter((item) => {
    if (item.adminOnly && !isAdmin) return false;
    if (item.clientOnly && !isClient) return false;
    return true;
  });

  const sections = Array.from(new Set(filteredNav.map((item) => item.section)));

  const signOut = async () => {
    await authService.logout();
    navigate('/login');
  };

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  const itemVariants = {
    hidden: { opacity: 0, x: -12 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
    }),
  };

  return (
    <motion.aside
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col h-[100dvh] w-64 shrink-0 relative z-40 bg-gray-900 border-r border-gray-800"
    >
      {/* Brand */}
      <div
        className="px-5 py-5 flex items-center gap-3 border-b"
        style={{ borderColor: '#1a1f2e' }}
      >
        <button className="sidebar-mobile-close" aria-label="Close navigation" onClick={close}><X size={18} /></button>
        <motion.img
          src="/A1raters_black_bg.png"
          alt="A1 Raters Logo"
          className="w-11 h-11 rounded-xl"
          style={{
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          }}
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 300, damping: 20 }}
        />
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
        >
          <div className="font-bold text-white text-sm tracking-wide">A1 Raters</div>
          <div className="text-[10px] text-gray-500 uppercase tracking-wider">
            Evaluation Pro
          </div>
        </motion.div>
      </div>

      {/* User chip */}
      <motion.div
        className="px-4 py-3 border-b"
        style={{ borderColor: '#1a1f2e' }}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.4 }}
      >
        <div className="flex items-center gap-3 px-2 py-1.5">
          {user?.image ? (
            <img
              src={user.image}
              alt={user.username || 'User'}
              className="w-9 h-9 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs text-white flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">
              {user?.username || 'User'}
            </div>
            <div
              className="text-[10px] capitalize"
              style={{ color: isAdmin ? '#a78bfa' : isClient ? '#22d3ee' : '#94a3b8' }}
            >
              {user?.role || 'rater'} account
            </div>
          </div>
        </div>
      </motion.div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5">
        {sections.map((section, sIdx) => {
          const sectionItems = filteredNav.filter((item) => item.section === section);
          const isLast = sIdx === sections.length - 1;

          return (
            <div key={section} className={`mb-${isLast ? '4' : '5'}`}>
              <motion.div
                className="px-3 mb-1.5 flex items-center"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + sIdx * 0.1, duration: 0.35 }}
              >
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-wider">
                  {section}
                </span>
              </motion.div>

              <ul className="space-y-0.5">
                {sectionItems.map((item) => {
                  const globalIdx = filteredNav.indexOf(item);

                  return (
                    <motion.li key={item.to} custom={globalIdx} variants={itemVariants} initial="hidden" animate="visible">
                      <NavLink
                        to={item.to}
                        end
                        onClick={close}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 group ${
                            isActive
                              ? 'text-white'
                              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                          }`
                        }
                        style={({ isActive }) =>
                          isActive
                            ? {
                                backgroundColor: '#1a1f2e',
                                borderLeft: '3px solid #6366f1',
                              }
                            : {}
                        }
                      >
                        <motion.div
                          className="flex items-center justify-center flex-shrink-0"
                          whileHover={{ scale: 1.15, rotate: item.icon === LogOut ? 0 : 0 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                        >
                          <item.icon
                            className={`w-5 h-5 ${
                              item.icon === LogOut
                                ? 'text-rose-400/80 group-hover:text-rose-300'
                                : 'text-gray-500 group-hover:text-gray-300'
                            }`}
                          />
                        </motion.div>
                        <span className="truncate">{item.label}</span>
                        {item.badge && (
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </motion.li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Sign Out */}
      <motion.div
        className="border-t p-3"
        style={{ borderColor: '#1a1f2e' }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
      >
        <motion.button
          whileHover={{ x: 3, backgroundColor: 'rgba(239, 68, 68, 0.08)' }}
          whileTap={{ scale: 0.97 }}
          onClick={signOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium text-gray-400 hover:text-rose-300 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </motion.button>
      </motion.div>
    </motion.aside>
  );
};
