import React, { useEffect, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { appUpdateService } from '../../services/appUpdateService';

export const UpdatePrompt: React.FC = () => {
  const [available, setAvailable] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => appUpdateService.subscribe(() => {
    setUpdateError('');
    setAvailable(true);
  }), []);

  const applyUpdate = async () => {
    setUpdating(true);
    setUpdateError('');
    try {
      await appUpdateService.apply();
    } catch {
      setUpdateError('The update could not be applied. Check your connection and try again.');
      setUpdating(false);
    }
  };

  if (!available) return null;
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="app-update-title">
    <section className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-6 shadow-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow"><RefreshCw size={14} /> Update available</span>
          <h2 id="app-update-title" className="mt-2 text-xl font-semibold text-white">A new version has been deployed</h2>
          <p className="mt-2 text-sm leading-6 text-slate-300">The latest version is ready. Update now to reload the app with the new version.</p>
        </div>
        <button type="button" aria-label="Remind me later" onClick={() => setAvailable(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white"><X size={18} /></button>
      </div>
      {updateError && <p className="mt-4 text-sm text-rose-300" role="alert">{updateError}</p>}
      <button type="button" disabled={updating} onClick={() => void applyUpdate()} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:opacity-60">
        <RefreshCw size={16} className={updating ? 'animate-spin' : ''} /> {updating ? 'Updating...' : 'Update app'}
      </button>
    </section>
  </div>;
};
