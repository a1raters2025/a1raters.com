import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Footer } from './Footer';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { MobileMenuProvider, useMobileMenu } from '../../contexts/MobileMenuContext';
import { notificationService } from '../../services/notificationService';
import { authService } from '../../services/authService';

const AppShellInner: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isOpen, close } = useMobileMenu();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const handleAuthChanged = () => {
      if (!authService.isAuthenticated()) {
        navigate('/login', { replace: true });
      }
    };
    window.addEventListener('auth-changed', handleAuthChanged);
    return () => window.removeEventListener('auth-changed', handleAuthChanged);
  }, [navigate]);

  React.useEffect(() => { notificationService.connect(); }, []);

  return (
    <div className="app-frame flex bg-gray-950 text-gray-100 overflow-hidden">
      {/* Ambient Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-700/30 rounded-full blur-[120px] mix-blend-screen opacity-30 animate-blob"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-cyan-700/30 rounded-full blur-[120px] mix-blend-screen opacity-30 animate-blob animation-delay-2000"></div>
        <div className="absolute top-[40%] left-[40%] w-[400px] h-[400px] bg-emerald-700/20 rounded-full blur-[100px] mix-blend-screen opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Persistent sidebar, collapsed to a compact rail on small screens */}
      <AnimatePresence>
        {isOpen && <motion.button aria-label="Close navigation" className="sidebar-backdrop" onClick={close} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>
      <div className={`app-sidebar-shell flex items-stretch flex-none z-40 ${isOpen ? 'sidebar-open' : ''}`}>
        <Sidebar />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative z-10">
        <Header />
        <div className="app-scroll flex-1 min-h-0 overflow-y-auto">
          <main className="px-6 py-6 max-w-7xl mx-auto w-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <MobileMenuProvider>
      <AppShellInner>{children}</AppShellInner>
    </MobileMenuProvider>
  );
};
