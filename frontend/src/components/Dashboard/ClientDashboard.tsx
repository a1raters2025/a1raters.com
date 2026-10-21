import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { authService } from '../../services/authService';
import { clientService, type ClientDashboardResponse } from '../../services/clientService';
import { GlassCard } from '../UI/GlassCard';
import { notificationService, type AppNotification } from '../../services/notificationService';

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ClientDashboardResponse['data']>({ totalHours: 0, categoryHours: [], projectCategories: [] });
  const [notifications, setNotifications] = useState<AppNotification[]>(notificationService.getAll());
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

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setNotifications);
    notificationService.connect();
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    notificationService.disconnect();
    await authService.logout();
    navigate('/login');
  };

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-10 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">Client hours</p>
            <h1 className="mt-2 text-3xl font-bold">Hours in Your Projects</h1>
            <p className="mt-2 text-sm text-slate-400">Hours reported by raters assigned to work in your project categories.</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 font-semibold text-red-300 hover:bg-red-500/20"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </header>

        <GlassCard className="mb-5 p-6" hover={false}>
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <Clock className="h-6 w-6 text-cyan-300" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total hours worked</p>
              <p className="text-3xl font-bold text-white">{data.totalHours} hours</p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6" hover={false}>
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Hours by project and rater</h2>
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
          ) : data.categoryHours.length ? (
            <ul className="divide-y divide-white/10">
              {data.categoryHours.map(({ category, raterName, totalHours }) => (
                <li key={`${category}-${raterName}`} className="flex items-center justify-between gap-4 py-4">
                  <span className="font-medium text-slate-200">
                    {raterName}
                    <span className="block text-xs font-normal text-slate-400">{category}</span>
                  </span>
                  <span className="font-bold text-cyan-300">{totalHours} hours</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              {data.projectCategories.length
                ? 'No hours have been reported yet for raters assigned to your projects.'
                : 'No project categories are assigned to your account yet. Please contact an administrator.'}
            </p>
          )}
        </GlassCard>

        {notifications.length > 0 && (
          <GlassCard className="mt-5 p-6" hover={false}>
            <h2 className="mb-3 text-lg font-bold text-white">Recent notifications</h2>
            <ul className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <li key={notification.id} className="border-b border-white/10 pb-3 last:border-0">
                  <p className="font-semibold text-slate-100">{notification.title}</p>
                  <p className="mt-1 text-sm text-slate-400">{notification.message}</p>
                  <time className="mt-1 block text-xs text-slate-500">{new Date(notification.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          </GlassCard>
        )}
      </div>
    </main>
  );
};
