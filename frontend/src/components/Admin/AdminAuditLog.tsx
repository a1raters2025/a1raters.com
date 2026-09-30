import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { reportService, type AuditLogEntry } from '../../services/reportService';
import { GlassCard } from '../UI/GlassCard';
import {
  Home,
  Search,
  User,
  RefreshCw,
  Clock,
  FileText,
  Shield,
} from 'lucide-react';

const ACTION_TYPE_COLORS: Record<string, string> = {
  create: 'bg-blue-100 text-blue-800',
  update: 'bg-amber-100 text-amber-800',
  delete: 'bg-red-100 text-red-800',
  status_change: 'bg-purple-100 text-purple-800',
  resubmit: 'bg-indigo-100 text-indigo-800',
  penalty_applied: 'bg-orange-100 text-orange-800',
};

const formatFieldValue = (value: unknown): string => {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    try {
      const obj = value as Record<string, unknown>;
      if (typeof value === 'object' && value !== null && '_id' in value && 'userName' in value) {
        return (value as { userName: string }).userName || '';
      }
      if (Array.isArray(value)) {
        return `[${value.map(formatFieldValue).join(', ')}]`;
      }
      if (obj) {
        return JSON.stringify(obj);
      }
    } catch {
      return String(value);
    }
  }
  return String(value);
};

export const AdminAuditLog: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
   const [dateTo, setDateTo] = useState('');

  const fetchAuditLogs = useCallback(async () => {
    if (!user?.isAdmin) {
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    try {
      const data = await reportService.getAuditLog();
      setAuditLogs(data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      alert('Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchAuditLogs();
  }, [fetchAuditLogs]);

  const filteredLogs = auditLogs.filter((log) => {
    if (actionFilter !== 'all' && log.actionType !== actionFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        log.changedByName?.toLowerCase().includes(term) ||
        log.fieldName?.toLowerCase().includes(term) ||
        log.reason?.toLowerCase().includes(term)
      );
    }
    if (dateFrom && new Date(log.createdAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(log.createdAt) > new Date(dateTo)) return false;
    return true;
  });

  const handleViewReport = async (log: AuditLogEntry) => {
    let reportId: string | null = null;
    if (typeof log.reportId === 'string') {
      reportId = log.reportId;
    } else if (log.reportId && typeof log.reportId === 'object' && '_id' in log.reportId) {
      reportId = (log.reportId as Record<string, unknown>)._id as string;
    }
    if (reportId) {
      window.open(`/reports/${reportId}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/admin/settings')}
            className="flex items-center px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors font-medium"
          >
            <Home className="w-4 h-4 mr-2" /> Home
          </button>
          <div className="flex items-center gap-4">
            <Shield className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold text-white">Audit Log</h2>
          </div>
        </div>

        <GlassCard className="p-4 mb-6" delay={0.1} hover={false}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by user, field, or reason..."
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
              <option value="all">All Actions</option>
              <option value="create">Create</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="status_change">Status Change</option>
              <option value="resubmit">Resubmit</option>
              <option value="penalty_applied">Penalty Applied</option>
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
            <button
              onClick={() => void fetchAuditLogs()}
              className="px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white transition-colors flex items-center text-sm font-medium"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </GlassCard>

        <GlassCard className="overflow-hidden" delay={0.2} hover={false}>
          <div className="px-6 py-4 border-b border-white/5">
            <h3 className="text-lg font-bold text-white">
              {filteredLogs.length} audit {filteredLogs.length === 1 ? 'entry' : 'entries'} found
            </h3>
          </div>

          {loading ? (
            <p className="p-8 text-center text-slate-400">Loading audit log...</p>
          ) : filteredLogs.length === 0 ? (
            <p className="p-8 text-center text-slate-400">
              No audit entries match your filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Timestamp</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Report</th>
                    <th className="px-4 py-3">Field Changed</th>
                    <th className="px-4 py-3">Old Value</th>
                    <th className="px-4 py-3">New Value</th>
                    <th className="px-4 py-3">By</th>
                    <th className="px-4 py-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredLogs.map((log) => {
                    const actionColor = ACTION_TYPE_COLORS[log.actionType] || 'bg-gray-100 text-gray-800';
                    let reportRef = '';
                    if (typeof log.reportId === 'string') {
                      reportRef = log.reportId;
                    } else if (log.reportId && typeof log.reportId === 'object' && '_id' in log.reportId) {
                      const r = log.reportId as Record<string, unknown>;
                      reportRef = `${r.raterName || ''} - ${r.email || ''}`;
                    }

                    return (
                      <tr key={log._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${actionColor}`}>
                            {log.actionType}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300">
                          {reportRef || log.reportId?.toString().slice(-8)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                          {log.fieldName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400 font-mono">
                          {formatFieldValue(log.oldValue)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-300 font-mono">
                          {formatFieldValue(log.newValue)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {log.changedByName || (typeof log.changedBy === 'object' && log.changedBy ? (log.changedBy as { userName: string }).userName : '') || ''}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {log.reportId && typeof log.reportId === 'object' && '_id' in log.reportId ? (
                            <button
                              onClick={() => handleViewReport(log)}
                              className="text-indigo-400 hover:text-indigo-300 p-1"
                              title="View Report"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500">—</span>
                          )}
                          {log.reason && (
                            <span
                              title={log.reason}
                              className="ml-2 text-xs text-slate-500 cursor-help"
                            >
                              ⓘ
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};
