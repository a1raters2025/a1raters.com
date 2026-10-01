import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';
import { clientService, type ClientDashboardResponse, type TaskActivityResult } from '../../services/clientService';
import type { RequestReport } from '../../services/reportService';
import { GlassCard } from '../UI/GlassCard';
import { BarChart3, Clock, FileText, LogOut, Mail, Search, Users, Activity, Wallet, BarChart2, Timer, CheckCircle, AlertCircle, PauseCircle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'raters' | 'activity'>('overview');

  const [taskActivities, setTaskActivities] = useState<TaskActivityResult[]>([]);

  const loadReports = useCallback(async (emailFilter?: string) => {
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
  }, []);

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

  const loadTaskActivities = useCallback(async () => {
    try {
      const response = await clientService.getTaskActivity({ limit: 200 });
      setTaskActivities(response.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load task activity.');
    }
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    navigate('/login');
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const totalHours = data.summary.totalHours;
  const totalTasks = data.summary.totalTasks;
  const totalReports = data.summary.totalReports;
  const totalRaters = data.summary.uniqueRaters;
  const totalLatePenalty = (data.reports as RequestReport[]).reduce(
    (sum, r) => sum + (Number(r.latePenalty) || 0),
    0
  );
  const totalEstimatedEarnings = totalHours * 2000;
  const netEarnings = totalEstimatedEarnings - totalLatePenalty;

  const statItems = [
    { label: 'Total Hours Worked', value: totalHours, suffix: ' hrs', icon: Clock, color: 'cyan' },
    { label: 'Total Tasks Completed', value: totalTasks, icon: FileText, color: 'indigo' },
    { label: 'Total Reports', value: totalReports, icon: BarChart2, color: 'violet' },
    { label: 'Rater Accounts', value: totalRaters, icon: Users, color: 'amber' },
    { label: 'Late Penalties', value: totalLatePenalty > 0 ? `₦${totalLatePenalty.toLocaleString()}` : '₦0', icon: Activity, color: 'red', isCurrency: true },
    { label: 'Net Earnings (est.)', value: netEarnings > 0 ? `₦${netEarnings.toLocaleString()}` : '₦0', icon: Wallet, color: 'green', isCurrency: true },
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
              <h1 className="text-3xl font-bold tracking-tight text-white">Account Performance</h1>
              <p className="mt-2 text-slate-400">
                Review aggregated hours, tasks, and every report submitted by all raters working on your account(s).
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

        {/* Search / Filter */}
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
                placeholder="Search by account email (leave blank for all)"
                className="w-full pl-10 pr-3 py-2.5 rounded-lg text-sm bg-white/5 border border-white/10 text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white/10 transition-all"
              />
            </div>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-bold shadow-lg transition-colors"
            >
              <Search className="h-4 w-4" /> Search
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

        {/* Tabs */}
        <div className="flex space-x-1 mb-6 bg-white/5 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'overview' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <BarChart3 className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <FileText className="w-4 h-4" /> Reports
          </button>
          <button
            onClick={() => setActiveTab('raters')}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'raters' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Users className="w-4 h-4" /> Rater Breakdown
          </button>
          <button
            onClick={() => {
              setActiveTab('activity');
              void loadTaskActivities();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'activity' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-white'}`}
          >
            <Timer className="w-4 h-4" /> Task Activity
          </button>
        </div>

        {error && (
          <motion.div
            className="mb-6 rounded-lg border border-red-500/30 bg-red-950/40 p-4 text-sm text-red-200"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {error}
          </motion.div>
        )}

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <section className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
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
                    <p className="text-xl font-bold text-white">{item.value}</p>
                  </div>
                </GlassCard>
              ))}
            </section>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <GlassCard className="p-6" delay={0.4} hover={false}>
                <h2 className="text-xl font-bold text-white mb-4">Performance Summary</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Aggregated Metrics</h3>
                    <dl className="space-y-3">
                      <div>
                        <dt className="text-xs text-slate-400">Total Hours Worked</dt>
                        <dd className="text-2xl font-bold text-cyan-300">{totalHours} hours</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Total Tasks Completed</dt>
                        <dd className="text-2xl font-bold text-indigo-300">{totalTasks} tasks</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Total Reports Submitted</dt>
                        <dd className="text-2xl font-bold text-violet-300">{totalReports} reports</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Total Late Penalties</dt>
                        <dd className={`text-2xl font-bold ${totalLatePenalty > 0 ? 'text-red-400' : 'text-green-300'}`}>
                          ₦{totalLatePenalty.toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-slate-400">Estimated Net Earnings</dt>
                        <dd className="text-2xl font-bold text-emerald-300">
                          ₦{netEarnings.toLocaleString()}
                          {totalLatePenalty > 0 && (
                            <span className="text-sm text-slate-500 block">
                              (₦{totalEstimatedEarnings.toLocaleString()} gross - ₦{totalLatePenalty.toLocaleString()} penalties)
                            </span>
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-300 uppercase mb-3">Raters Working On This Account</h3>
                    {data.raterStats.length > 0 ? (
                      <div className="space-y-2">
                        {data.raterStats.map((rater, idx) => {
                          const r = rater as Record<string, unknown>;
                          return (
                            <div key={idx} className="flex justify-between items-center py-2 border-b border-white/5">
                              <span className="text-slate-300">{r.raterName as string}</span>
                              <div className="text-right">
                                <span className="text-cyan-300 font-bold">{r.totalHours as number}h</span>
                                <span className="text-xs text-slate-500 block">{r.totalTasks as number} tasks</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-slate-500 text-sm">No rater breakdown available yet.</p>
                    )}
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <GlassCard className="overflow-hidden" delay={0.4} hover={false}>
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="font-bold text-white">
                  {email ? `Work for ${email}` : 'All submitted work'}
                </h2>
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
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Rater</th>
                        <th className="px-5 py-3">Account email</th>
                        <th className="px-5 py-3">Hours</th>
                        <th className="px-5 py-3">Tasks</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Submitted</th>
                        <th className="px-5 py-3">Late Penalty</th>
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
                          <td className="px-5 py-4 text-slate-300">{report.category} ({report.proxy})</td>
                          <td className="px-5 py-4 text-slate-400">{formatDate(report.date)}</td>
                          <td className="px-5 py-4 text-slate-400">
                            {report.submissionTime ? new Date(report.submissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </td>
                          <td className="px-5 py-4">
                            {report.latePenalty && report.latePenalty > 0 ? (
                              <span className="text-red-400 font-bold">₦{Number(report.latePenalty).toLocaleString()}</span>
                            ) : (
                              <span className="text-slate-500">None</span>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* RATER BREAKDOWN TAB */}
        {activeTab === 'raters' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <GlassCard className="overflow-hidden" delay={0.4} hover={false}>
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="font-bold text-white">Rater Performance Breakdown</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Aggregated data across all raters working on your account(s).
                </p>
              </div>

              {data.emailStats.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Email Account</th>
                        <th className="px-5 py-3">Hours</th>
                        <th className="px-5 py-3">Tasks</th>
                        <th className="px-5 py-3">Reports</th>
                        <th className="px-5 py-3">Raters</th>
                        <th className="px-5 py-3">Categories</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {data.emailStats.map((stat, idx) => {
                        const s = stat as Record<string, unknown>;
                        const statuses = (s.statuses as string[]) || [];
                        const hasRestricted = statuses.includes('Restricted');
                        const hasSacked = statuses.includes('Sacked');
                        return (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4 text-cyan-300 font-medium">{s.email as string}</td>
                            <td className="px-5 py-4 text-slate-300">{s.totalHours as number}h</td>
                            <td className="px-5 py-4 text-slate-300">{s.totalTasks as number}</td>
                            <td className="px-5 py-4 text-slate-300">{s.totalReports as number}</td>
                            <td className="px-5 py-4 text-slate-300">{(s.raters as string[]).join(', ')}</td>
                            <td className="px-5 py-4 text-slate-400">{(s.categories as string[]).join(', ')}</td>
                            <td className="px-5 py-4">
                              {hasSacked ? (
                                <span className="px-2 py-1 bg-red-500/20 text-red-300 text-xs rounded-full">Sacked</span>
                              ) : hasRestricted ? (
                                <span className="px-2 py-1 bg-amber-500/20 text-amber-300 text-xs rounded-full">Restricted</span>
                              ) : (
                                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-full">Active</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="p-8 text-center text-slate-400">No rater performance data available.</p>
              )}
             </GlassCard>
           </motion.div>
         )}

        {/* TASK ACTIVITY TAB */}
        {activeTab === 'activity' && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <GlassCard className="overflow-hidden" delay={0.4} hover={false}>
              <div className="px-6 py-4 border-b border-white/5">
                <h2 className="font-bold text-white">Task Activity</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Real-time view of rater activities, task durations, and status changes.
                </p>
              </div>

              {taskActivities.length === 0 ? (
                <p className="p-8 text-center text-slate-400">
                  No task activity recorded yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Rater</th>
                        <th className="px-5 py-3">Task</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Duration</th>
                        <th className="px-5 py-3">Started</th>
                        <th className="px-5 py-3">Completed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {taskActivities.map((item) => {
                        const statusIcon =
                          item.status === 'done' ? <CheckCircle size={16} className="text-emerald-400" /> :
                          item.status === 'processing' ? <PauseCircle size={16} className="text-amber-400" /> :
                          item.status === 'expired' ? <AlertCircle size={16} className="text-rose-400" /> :
                          <Timer size={16} className="text-slate-400" />;
                        return (
                          <tr key={item.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-5 py-4 font-semibold text-white">{item.raterName || '—'}</td>
                            <td className="px-5 py-4 text-slate-300">{item.taskQuery || item.taskId}</td>
                            <td className="px-5 py-4 text-slate-400">{item.category || '—'}</td>
                            <td className="px-5 py-4">
                              <span className="flex items-center gap-1">
                                {statusIcon}
                                {item.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 text-slate-300">{item.duration ? `${Math.round(item.duration)} min` : '—'}</td>
                            <td className="px-5 py-4 text-slate-400">{item.startedAt ? formatDate(item.startedAt) : '—'}</td>
                            <td className="px-5 py-4 text-slate-400">{item.completedAt ? formatDate(item.completedAt) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </motion.div>
         )}

        <p className="mt-4 text-xs text-slate-500">
          Signed in as {user?.email || user?.username} ({user?.role})
        </p>
      </div>
    </div>
  );
};
