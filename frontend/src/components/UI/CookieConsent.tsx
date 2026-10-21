import React, { useState } from 'react';
import { Cookie } from 'lucide-react';

const CONSENT_COOKIE = 'device_assessment_consent';
const hasChoice = () => document.cookie.split('; ').some(value => value.startsWith(`${CONSENT_COOKIE}=`));

export const CookieConsent: React.FC = () => {
  const [visible, setVisible] = useState(() => !hasChoice());

  const choose = (choice: 'accepted' | 'denied') => {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${CONSENT_COOKIE}=${choice}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`;
    localStorage.setItem(CONSENT_COOKIE, choice);
    setVisible(false);
  };

  if (!visible) return null;
  return <div className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6" role="dialog" aria-modal="true" aria-labelledby="cookie-consent-title">
    <section className="mx-auto max-w-3xl rounded-2xl border border-white/15 bg-slate-900/95 p-5 shadow-2xl backdrop-blur-xl sm:p-6">
      <div className="flex items-start gap-3">
        <Cookie className="mt-1 shrink-0 text-cyan-300" size={22} />
        <div>
          <h2 id="cookie-consent-title" className="text-lg font-semibold text-white">Cookie and device assessment</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">We use essential cookies to keep you signed in. If you accept, we will also use your browser and device information from site requests to assess compatibility and help protect your account. You can continue without optional device assessment.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" onClick={() => choose('accepted')} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Accept</button>
            <button type="button" onClick={() => choose('denied')} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">Continue without optional assessment</button>
          </div>
        </div>
      </div>
    </section>
  </div>;
};
