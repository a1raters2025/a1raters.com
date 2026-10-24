import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, RefreshCw } from 'lucide-react';
import { authService } from '../../services/authService';
import { clientService, type ClientDashboardResponse } from '../../services/clientService';
import { GlassCard } from '../UI/GlassCard';

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ClientDashboardResponse['data']>({ dailyTotals: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadHours = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await clientService.getDashboard();
      setData(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load hours worked.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    clientService.getDashboard()
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load hours worked.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Client activity</p>
            <h1 className="mt-2 text-3xl font-bold">Daily Task Summary</h1>
            <p className="mt-2 text-sm text-slate-400">Daily task and hour totals from raters working on your tasks.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>

        <GlassCard className="p-6" hover={false}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Daily totals</h2>
            <button
              type="button"
              onClick={() => void loadHours()}
              disabled={loading}
              aria-label="Refresh hours"
              className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/5 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
          {loading ? (
            <p className="text-sm text-slate-400">Loading hours...</p>
          ) : data.dailyTotals.length ? (
            <ul className="divide-y divide-white/10">
              {data.dailyTotals.map(({ date, totalTasks, totalHours }) => (
                <li key={date} className="flex items-center justify-between gap-4 py-4">
                  <span className="font-medium text-slate-200">{date}</span>
                  <span className="text-right font-bold text-cyan-300">{totalTasks} tasks<span className="block text-xs font-normal text-slate-400">{totalHours} hours</span></span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No task activity has been reported yet.
            </p>
          )}
        </GlassCard>

      </div>
    </main>
  );
};
