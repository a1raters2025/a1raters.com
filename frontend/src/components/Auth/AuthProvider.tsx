import React, { useEffect, useState } from 'react';
import { authService } from '../../services/authService';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    authService.init().then(() => {
      if (mounted) setAuthReady(true);
    });
    return () => { mounted = false; };
  }, []);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};