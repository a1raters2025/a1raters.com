import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';
import { clientService, type ClientDashboardResponse } from '../../services/clientService';
import type { RequestReport } from '../../services/reportService';
import { GlassCard } from '../UI/GlassCard';
import { BarChart3, Clock, FileText, LogOut, Mail, Search, Users } from 'lucide-react';

const emptyData: ClientDashboardResponse['data'] = {
  reports: [],
  summary: { totalHours: 0, totalTasks: 0, totalReports: 0, uniqueEmails: 0, uniqueRaters: 0 },
  emailStats: [],
  raterStats: [],
  pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 50 },
};

export const ClientDashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [email, setEmail] = useState('');
  const [data, setData] = useState<ClientDashboardResponse['data']>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = async (emailFilter?: string) => {
    setLoading(true);
    setError('');
    try {
      const response = await clientService.getDashboard({ limit: 100, email: emailFilter || undefined });
      setData(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load submitted work.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;
    clientService
      .getDashboard({ limit: 100 })
      .then((response) => {
        if (active) setData(response.data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : 'Unable to load submitted work.');
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

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const statItems = [
    { label: 'Hours worked', value: data.summary.totalHours, icon: Clock, color: 'cyan' },
    { label: 'Submitted reports', value: data.summary.totalReports, icon: FileText, color: 'indigo' },
    { label: 'Rater accounts', value: data.summary.uniqueRaters, icon: Users, color: 'violet' },
    { label: 'Email accounts', value: data.summary.uniqueEmails, icon: BarChart3, color: 'amber' },
  ];

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-cyan-400">
                Client workspace
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white">Submitted rater work</h1>
              <p className="mt-2 text-slate-400">
                Review hours, accounts, and every report submitted by your raters.
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-all font-semibold"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </motion.button>
          </div>
        </header>

        {/* Search Form */}
        <GlassCard className="p-4 mb-8" delay={0.1} hover={false}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void loadReports(email.trim());
            }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                type="email"
                placeholder="Search by rater account email"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold shadow-lg transition-colors"
            >
              <Search className="h-4 w-4" /> Search account
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                setEmail('');
                void loadReports();
              }}
              whileHover={{ scale: 1.03 }}
              className="px-5 py-2.5 rounded-lg border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-semibold"
            >
              Show all
            </motion.button>
          </form>
        </GlassCard>

        {error && (
          <motion.div
            className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* Stats Grid */}
        <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statItems.map((item, i) => (
            <GlassCard key={item.label} delay={i * 0.08} className="p-5">
              <div className="flex flex-col items-center text-center">
                <motion.div
                  className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-3"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <item.icon className="w-5 h-5 text-cyan-400" />
                </motion.div>
                <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                <p className="text-2xl font-bold text-white">{item.value}</p>
              </div>
            </GlassCard>
          ))}
        </section>

        {/* Reports Table */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <GlassCard className="overflow-hidden" delay={0.4} hover={false}>
            <div className="px-6 py-4 border-b border-white/5">
              <h2 className="font-bold text-white">{email ? `Work for ${email}` : 'All submitted work'}</h2>
              <p className="mt-1 text-sm text-slate-400">
                {data.summary.totalReports} report{data.summary.totalReports === 1 ? '' : 's'} found
              </p>
            </div>

            {loading ? (
              <p className="p-8 text-center text-slate-400">Loading submitted work...</p>
            ) : data.reports.length === 0 ? (
              <p className="p-8 text-center text-slate-400">
                No submitted work found for this search.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-5 py-3">Rater</th>
                      <th className="px-5 py-3">Account email</th>
                      <th className="px-5 py-3">Hours</th>
                      <th className="px-5 py-3">Tasks</th>
                      <th className="px-5 py-3">Category</th>
                      <th className="px-5 py-3">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {(data.reports as RequestReport[]).map((report) => (
                      <motion.tr
                        key={report._id || `${report.email}-${report.date}-${report.raterName}`}
                        className="hover:bg-white/5 transition-colors"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                      >
                        <td className="px-5 py-4 font-semibold text-white">{report.raterName}</td>
                        <td className="px-5 py-4 text-cyan-300">{report.email}</td>
                        <td className="px-5 py-4 text-slate-300">{report.hoursWorked}</td>
                        <td className="px-5 py-4 text-slate-300">{report.tasksWorked}</td>
                        <td className="px-5 py-4 text-slate-300">{report.category}</td>
                        <td className="px-5 py-4 text-slate-400">{formatDate(report.date)}</td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </motion.div>

        <p className="mt-4 text-xs text-slate-500">
          Signed in as {user?.email || user?.username}
        </p>
      </div>
    </div>
  );
};
