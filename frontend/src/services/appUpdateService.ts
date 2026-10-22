import { registerSW } from 'virtual:pwa-register';

type UpdateListener = () => void;

const listeners = new Set<UpdateListener>();
let applyUpdate: (reloadPage?: boolean) => Promise<void> = async () => undefined;
let serviceWorkerRegistration: ServiceWorkerRegistration | undefined;
let started = false;
let updateAvailable = false;
let announcedVersion = '';

const announceUpdate = (version = 'service-worker-update') => {
  if (announcedVersion === version) return;
  announcedVersion = version;
  updateAvailable = true;
  listeners.forEach(listener => listener());
};

const checkForDeployedVersion = async () => {
  if (document.visibilityState !== 'visible' || !navigator.onLine) return;

  try {
    const response = await fetch(`/version.json?check=${Date.now()}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache', Pragma: 'no-cache' },
    });
    if (!response.ok) return;

    const deployment = await response.json() as { version?: string };
    if (deployment.version && deployment.version !== __APP_VERSION__) {
      announceUpdate(deployment.version);
    }
  } catch {
    // Stay quiet while offline or if the deployment marker is temporarily unavailable.
  }
};

export const appUpdateService = {
  start() {
    if (started) return;
    started = true;

    if ('serviceWorker' in navigator) {
      applyUpdate = registerSW({
        immediate: true,
        onNeedRefresh: () => announceUpdate(),
        onRegisteredSW: (_url, registration) => {
          if (!registration) return;
          serviceWorkerRegistration = registration;
          void registration.update().catch(() => undefined);
        },
      });
    }

    void checkForDeployedVersion();
    window.setInterval(() => {
      void checkForDeployedVersion();
      if (document.visibilityState === 'visible' && navigator.onLine) {
        void serviceWorkerRegistration?.update().catch(() => undefined);
      }
    }, 30_000);
    window.addEventListener('focus', () => void checkForDeployedVersion());
    window.addEventListener('online', () => void checkForDeployedVersion());
    document.addEventListener('visibilitychange', () => void checkForDeployedVersion());
  },
  subscribe(listener: UpdateListener) {
    listeners.add(listener);
    if (updateAvailable) listener();
    return () => { listeners.delete(listener); };
  },
  async apply() {
    if ('serviceWorker' in navigator && serviceWorkerRegistration) {
      await applyUpdate(true);
      return;
    }
    window.location.reload();
  },
};
