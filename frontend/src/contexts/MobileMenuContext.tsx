/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useCallback } from 'react';

interface MobileMenuContextValue {
  isOpen: boolean;
  toggle: () => void;
  open: () => void;
  close: () => void;
}

const MobileMenuContext = createContext<MobileMenuContextValue | undefined>(undefined);

export const useMobileMenu = () => {
  const ctx = useContext(MobileMenuContext);
  if (!ctx) {
    throw new Error('useMobileMenu must be used within MobileMenuProvider');
  }
  return ctx;
};

export const MobileMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return (
    <MobileMenuContext.Provider value={{ isOpen, toggle, open, close }}>
      {children}
    </MobileMenuContext.Provider>
  );
};
