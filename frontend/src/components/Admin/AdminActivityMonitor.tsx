import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { adminService, type ActivityEntry, type ActivityFilter, type AdminStats, type ActiveSession } from '../../services/adminService';
import { GlassCard } from '../UI/GlassCard';
import {
  Activity,
  Users,
  Clock,
  Shield,
  Search,
  User,
  LogIn,
  LogOut,
  AlertCircle,
  RefreshCw,
  BarChart3,
  Eye,
} from 'lucide-react';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  login: <LogIn size={14} className="text-green-400" />,
  login_failed: <AlertCircle size={14} className="text-red-400" />,
  logout: <LogOut size={14} className="text-blue-400" />,
  account_approved: <Shield size={14} className="text-emerald-400" />,
  create_report: <Activity size={14} className="text-indigo-400" />,
  update_report: <Activity size={14} className="text-amber-400" />,
  delete_report: <Activity size={14} className="text-red-400" />,
  submit_invoice: <Activity size={14} className="text-cyan-400" />,
  take_test: <Activity size={14} className="text-violet-400" />,
  upload_file: <Activity size={14} className="text-fuchsia-400" />,
  view_page: <Eye size={14} className="text-slate-400" />,
  token_refreshed: <Clock size={14} className="text-amber-400" />,
};

const ACTION_COLORS: Record<string, string> = {
  login: 'bg-green-100 text-green-800',
  login_failed: 'bg-red-100 text-red-800',
  logout: 'bg-blue-100 text-blue-800',
  account_approved: 'bg-emerald-100 text-emerald-800',
  create_report: 'bg-indigo-100 text-indigo-800',
  update_report: 'bg-amber-100 text-amber-800',
  delete_report: 'bg-red-100 text-red-800',
  submit_invoice: 'bg-cyan-100 text-cyan-800',
  take_test: 'bg-violet-100 text-violet-800',
  upload_file: 'bg-fuchsia-100 text-fuchsia-800',
  account_suspended: 'bg-orange-100 text-orange-800',
  token_refreshed: 'bg-yellow-100 text-yellow-800',
};

const formatActionType = (action: string): string => {
  return action.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
};

export const AdminActivityMonitor: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const isAdmin = user?.isAdmin || user?.role === 'admin';

  const [activeTab, setActiveTab] = useState<'activity' | 'sessions' | 'stats'>('activity');
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [recentActivity, setRecentActivity] = useState<ActivityEntry[]>([]);

  const fetchActivityLogs = useCallback(async () => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    try {
      const filters: ActivityFilter = {
        page: currentPage,
        limit: 50,
        ...(actionFilter && { action: actionFilter }),
        ...(roleFilter && { role: roleFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      };

      const response = await adminService.getActivityLog(filters);
      setLogs(response.data.logs);
      setTotalPages(response.data.pagination.totalPages);
      setTotalItems(response.data.pagination.totalItems);
    } catch (err) {
      console.error('Failed to load activity logs:', err);
      alert('Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, navigate, currentPage, actionFilter, roleFilter, dateFrom, dateTo]);

  const fetchSessions = useCallback(async () => {
    if (!isAdmin) return;
    setSessionsLoading(true);
    try {
      const response = await adminService.getSessions();
      setSessions(response.data);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [isAdmin]);

  const fetchStats = useCallback(async () => {
    if (!isAdmin) return;
    setStatsLoading(true);
    try {
      const response = await adminService.getStats();
      setStats(response.data.stats);
      setRecentActivity(response.data.recentActivity);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setStatsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchActivityLogs();
      void fetchSessions();
      void fetchStats();
    }
  }, [fetchActivityLogs, fetchSessions, fetchStats, isAdmin]);

  const filteredLogs = logs.filter((log) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.userName?.toLowerCase().includes(term) ||
        log.action?.toLowerCase().includes(term) ||
        log.ipAddress?.toLowerCase().includes(term) ||
        log.resourceType?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  const handleRefresh = () => {
    void fetchActivityLogs();
    void fetchSessions();
    void fetchStats();
  };

  const statCards = stats ? [
    { label: 'Logins Today', value: stats.loginsToday, icon: LogIn, color: 'cyan' },
    { label: 'Failed Logins', value: stats.failedLoginsToday, icon: AlertCircle, color: 'red' },
    { label: 'Active Users (7d)', value: stats.activeUsersLast7d, icon: Users, color: 'indigo' },
    { label: 'Total Reports', value: stats.totalReports, icon: BarChart3, color: 'amber' },
    { label: 'Total Users', value: stats.totalUsers, icon: User, color: 'violet' },
  ] : [];

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow">
            <Shield size={14} /> Admin panel
          </span>
          <h1>Activity Monitor</h1>
          <p>Track user activity, monitor active sessions, and review platform statistics.</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleRefresh}
          className="btn-glass px-4 py-2"
        >
          <RefreshCw size={15} /> Refresh
        </motion.button>
      </section>

      <div className="flex gap-1 mb-6 bg-white/5 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
            activeTab === 'activity' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Activity size={15} /> Activity Log
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
            activeTab === 'sessions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users size={15} /> Active Sessions
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
            activeTab === 'stats' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 size={15} /> Statistics
        </button>
      </div>

      {activeTab === 'activity' && (
        <>
          <GlassCard className="p-4 mb-6" delay={0.1} hover={false}>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by user, action, IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-indigo-400 outline-none text-sm"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 outline-none text-sm"
              >
                <option value="">All Actions</option>
                <option value="login">Login</option>
                <option value="login_failed">Failed Login</option>
                <option value="logout">Logout</option>
                <option value="create_report">Create Report</option>
                <option value="update_report">Update Report</option>
                <option value="delete_report">Delete Report</option>
                <option value="submit_invoice">Submit Invoice</option>
                <option value="take_test">Take Test</option>
                <option value="account_approved">Account Approved</option>
                <option value="account_suspended">Account Suspended</option>
              </select>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 outline-none text-sm"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="user">Rater</option>
                <option value="client">Client</option>
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white outline-none text-sm"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white outline-none text-sm"
              />
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden" delay={0.2} hover={false}>
            <div className="px-4 sm:px-6 py-4 border-b border-white/5 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">
                {totalItems} activities found
              </h3>
              {totalPages > 1 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 rounded-lg bg-white/5 text-slate-300 disabled:opacity-50 text-sm"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-slate-400">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 rounded-lg bg-white/5 text-slate-300 disabled:opacity-50 text-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading activity log...</div>
            ) : filteredLogs.length === 0 ? (
              <div className="p-8 text-center text-slate-400">No activity entries match your filters.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Time</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">User</th>
                      <th className="px-4 py-3">Role</th>
                      <th className="px-4 py-3">Resource</th>
                      <th className="px-4 py-3">IP Address</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredLogs.map((log) => {
                      const colorClass = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-800';
                      return (
                        <tr key={log._id} className="hover:bg-white/5 transition-colors">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${colorClass}`}>
                              {ACTION_ICONS[log.action] || null}
                              {formatActionType(log.action)}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                            {log.userName || '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                            {log.userRole || '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                            {log.resourceType ? `${log.resourceType}${log.resourceId ? '/' + log.resourceId.slice(-8) : ''}` : '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                            {log.ipAddress || '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                            {log.statusCode ? (log.statusCode >= 400 ? 'Error' : 'Success') : '—'}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400 text-right">
                            {log.durationMs !== undefined ? `${log.durationMs}ms` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </>
      )}

      {activeTab === 'sessions' && (
        <GlassCard className="p-6" delay={0.2} hover={false}>
          <h3 className="text-lg font-bold text-white mb-4">Active Sessions</h3>
          {sessionsLoading ? (
            <div className="p-8 text-center text-slate-400">Loading sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center text-slate-400">No active sessions found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Last Login</th>
                    <th className="px-4 py-3">Last Seen</th>
                    <th className="px-4 py-3">Login Count</th>
                    <th className="px-4 py-3">Login IP</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sessions.map((session) => (
                    <tr key={session._id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">{session.userName || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">{session.email || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          session.role === 'admin' ? 'bg-indigo-100 text-indigo-800' :
                          session.role === 'client' ? 'bg-amber-100 text-amber-800' :
                          'bg-cyan-100 text-cyan-800'
                        }`}>
                          {session.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                        {session.lastLoginAt ? new Date(session.lastLoginAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                        {session.lastSeenAt ? new Date(session.lastSeenAt).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">{session.loginCount || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">{session.lastLoginIp || '—'}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={async () => {
                            if (window.confirm(`Force logout ${session.userName}?`)) {
                              try {
                                await adminService.forceLogout(session._id);
                                setSessions((prev) => prev.filter((s) => s._id !== session._id));
                              } catch {
                                alert('Failed to force logout.');
                              }
                            }
                          }}
                          className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-medium"
                        >
                          Force logout
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            )}
        </GlassCard>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-6">
          {statCards.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {statCards.map((stat) => (
                <GlassCard key={stat.label} className="p-4 text-center" delay={0.1} hover={false}>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/10 mx-auto mb-2">
                    <stat.icon size={20} className="text-indigo-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </GlassCard>
              ))}
            </div>
          )}

          <GlassCard className="p-6" delay={0.2} hover={false}>
            <h3 className="text-lg font-bold text-white mb-4">Recent activity</h3>
            {statsLoading ? (
              <div className="p-8 text-center text-slate-400">Loading statistics...</div>
            ) : recentActivity.length === 0 ? (
              <div className="p-4 text-center text-slate-500">No recent activity.</div>
            ) : (
              <div className="space-y-3">
                {recentActivity.map((entry) => (
                  <div key={entry._id} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors">
                    {ACTION_ICONS[entry.action] || <Activity size={14} className="text-slate-500" />}
                    <span className="text-sm text-slate-300">{entry.userName || 'System'}</span>
                    <span className="text-xs text-slate-500">{formatActionType(entry.action)}</span>
                    <time className="text-xs text-slate-500 ml-auto">
                      {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
};
