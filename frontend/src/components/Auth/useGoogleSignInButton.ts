import { useEffect, useRef, useState } from 'react';
import { APP_CONFIG } from '../../config/appConfig';

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdentityApi {
  accounts: {
    id: {
      initialize: (options: {
        client_id: string;
        callback: (response: GoogleCredentialResponse) => void;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: { theme: 'outline'; size: 'large'; text: 'continue_with'; width: number }
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentityApi;
  }
}

let googleApiPromise: Promise<GoogleIdentityApi> | null = null;

const loadGoogleIdentityApi = (): Promise<GoogleIdentityApi> => {
  if (window.google) return Promise.resolve(window.google);
  if (googleApiPromise) return googleApiPromise;

  const loadingPromise = new Promise<GoogleIdentityApi>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    const handleLoad = () => {
      if (window.google) resolve(window.google);
      else reject(new Error('Google Identity Services did not initialize'));
    };

    if (!script) {
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
    }

    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', () => reject(new Error('Google Identity Services failed to load')), { once: true });
    if (!script.isConnected) document.head.appendChild(script);
  }).catch((error: unknown) => {
    googleApiPromise = null;
    throw error;
  });
  googleApiPromise = loadingPromise;
  return loadingPromise;
};

export const useGoogleSignInButton = (onCredential: (credential: string) => Promise<void>) => {
  const buttonRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const credentialInFlight = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const clientId = APP_CONFIG.googleClientId;

  useEffect(() => {
    onCredentialRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!clientId) return;

    let active = true;
    void loadGoogleIdentityApi().then((google) => {
      const button = buttonRef.current;
      if (!active || !button) return;

      google.accounts.id.initialize({
        client_id: clientId,
        callback: ({ credential }) => {
          if (credentialInFlight.current || !credential) return;
          credentialInFlight.current = true;
          void onCredentialRef.current(credential).then(
            () => { credentialInFlight.current = false; },
            () => { credentialInFlight.current = false; }
          );
        },
      });

      button.replaceChildren();
      button.style.width = '50px';
      button.style.height = '50px';
      button.style.display = 'flex';
      button.style.justifyContent = 'center';
      button.style.alignItems = 'center';
      google.accounts.id.renderButton(button, {
        theme: 'outline',
        size: 'large',
        text: 'none',
        width: 50,
        height: 50,
      });
      setIsReady(true);
    }).catch((error: unknown) => {
      console.error('Google sign-in could not be initialized:', error);
    });

    return () => { active = false; };
  }, [clientId]);

  return { buttonRef, isReady };
};