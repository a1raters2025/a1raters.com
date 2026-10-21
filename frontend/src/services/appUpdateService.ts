import { registerSW } from 'virtual:pwa-register';

type UpdateListener = () => void;

const listeners = new Set<UpdateListener>();
let applyUpdate: (reloadPage?: boolean) => Promise<void> = async () => undefined;
let started = false;
let updateAvailable = false;

export const appUpdateService = {
  start() {
    if (started || !('serviceWorker' in navigator)) return;
    started = true;
    applyUpdate = registerSW({
      immediate: true,
      onNeedRefresh: () => {
        updateAvailable = true;
        listeners.forEach(listener => listener());
      },
      onRegisteredSW: (_url, registration) => {
        if (!registration) return;
        const checkForUpdate = () => {
          if (document.visibilityState === 'visible' && navigator.onLine) {
            void registration.update().catch(() => undefined);
          }
        };
        // Check active sessions frequently; browsers may throttle SW checks,
        // while focus/online events trigger an immediate check when possible.
        checkForUpdate();
        window.setInterval(checkForUpdate, 30_000);
        window.addEventListener('focus', checkForUpdate);
        window.addEventListener('online', checkForUpdate);
        document.addEventListener('visibilitychange', checkForUpdate);
      },
    });
  },
  subscribe(listener: UpdateListener) {
    listeners.add(listener);
    if (updateAvailable) listener();
    return () => { listeners.delete(listener); };
  },
  apply() {
    return applyUpdate(true);
  },
};
