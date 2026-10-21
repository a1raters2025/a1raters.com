import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';
import { reportService, type RequestReport } from '../../services/reportService';
import { GlassCard } from '../UI/GlassCard';
import {
  Home,
  Trash2,
  RefreshCw,
  Clock,
  AlertTriangle,
  FileText,
  Search,
  Edit2,
  Save,
  X,
} from 'lucide-react';

const CATEGORY_DISPLAY: Record<string, string> = {
  'App Store': 'App Store (37/hour)',
  'Mac App Store': 'Mac App Store (38/hour)',
  'Video': 'Video (25/hour)',
  'Video Hint': 'Video Hint (35/hour)',
  'Podcast': 'Podcast (35/hour)',
  'AI Assist': 'AI Assist',
  'App Image Accessibility': 'App Image Accessibility (20/hour)',
  'Music': 'Music (35/hour)',
  'Manual Invoice': 'Manual Invoice',
};

const REPORT_CATEGORIES = [
  'AI Assist',
  'App Image Accessibility',
  'App Store',
  'Mac App Store',
  'Music',
  'Podcast',
  'Video',
  'Video Hint',
];
const REPORT_PROXIES = ['US', 'UK', 'Japan', 'China', 'Germany', 'France', 'Canada', 'Australia'];

export const RaterReportHistory: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();
  const [reports, setReports] = useState<RequestReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<RequestReport>>({});
  const [editError, setEditError] = useState('');

  const fetchMyReports = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    setLoading(true);
    try {
      const data = await reportService.getMyReportsFromServer();
      setReports(data);
    } catch (err) {
      console.error('Failed to load reports:', err);
      alert('Failed to load your reports.');
    } finally {
      setLoading(false);
    }
  }, [user, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchMyReports();
  }, [fetchMyReports]);

  const filteredReports = reports.filter((r) => {
    if (!r.isDeleted) {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          r.email?.toLowerCase().includes(term) ||
          r.profileName?.toLowerCase().includes(term) ||
          r.raterName?.toLowerCase().includes(term) ||
          r.category?.toLowerCase().includes(term)
        );
      }
    }
    return !r.isDeleted;
  });

  const handleDeleteReport = async (report: RequestReport) => {
    if (!report._id) return;

    const confirmed = window.confirm(
      `Delete report for ${report.profileName} (${report.email})?\n\n` +
        `This will: Remove the report from your active list and update all calculations.\n` +
        `You will need to submit a new corrected report.\n\n` +
        `The deletion will be logged for administrators.`
    );

    if (!confirmed) return;

    try {
      await reportService.deleteReport(report._id, 'Rater-initiated correction/resubmission');
      setReports((prev) => prev.filter((r) => r._id !== report._id));
      alert(`Report deleted. You can now submit a corrected version via "Submit Report" on the dashboard.`);
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report. Please try again.');
    }
  };

  const handleResubmit = (report: RequestReport) => {
    navigate('/report', {
      state: {
        resubmitFrom: report,
      },
    });
  };

  const handleViewDetail = (report: RequestReport) => {
    setSelectedReportId(report._id || null);
    setViewMode('detail');
  };

  const beginEdit = (report: RequestReport) => {
    if (!report._id) return;
    setEditingId(report._id);
    setEditError('');
    setEditForm({
      date: report.date ? new Date(report.date).toISOString().slice(0, 10) : '',
      profileName: report.profileName,
      email: report.email,
      category: report.category,
      proxy: report.proxy,
      status: report.status,
      tasksWorked: report.tasksWorked,
      hoursWorked: report.hoursWorked,
      hourlyRate: report.hourlyRate || 2000,
      description: report.description,
    });
  };

  const saveEdit = async (reportId: string) => {
    setEditError('');
    try {
      const updated = await reportService.updateMyReport(reportId, editForm);
      setReports((current) => current.map((report) => report._id === reportId ? updated : report));
      setEditingId(null);
      setEditForm({});
    } catch (error: unknown) {
      setEditError(error instanceof Error ? error.message : 'Unable to update this report.');
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedReportId(null);
  };

  const selectedReport = selectedReportId
    ? reports.find((r) => r._id === selectedReportId)
    : null;

  const formatSubmissionTime = (time?: string) => {
    if (!time) return 'N/A';
    const d = new Date(time);
    const isLate = Boolean(selectedReport?.latePenalty);
    return (
      <span className={`flex items-center gap-1 ${isLate ? 'text-red-500' : 'text-gray-600'}`}>
        {d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
        {isLate && <AlertTriangle className="w-4 h-4" />}
      </span>
    );
  };

  const totalHours = filteredReports.reduce((sum, r) => sum + (Number(r.hoursWorked) || 0), 0);
  const totalTasks = filteredReports.reduce((sum, r) => sum + (Number(r.tasksWorked) || 0), 0);
  const totalLatePenalty = filteredReports.reduce((sum, r) => sum + (r.latePenalty || 0), 0);
  const weeklyReports = Object.values(filteredReports.reduce<Record<string, {
    weekStart: string;
    reports: number;
    hours: number;
    tasks: number;
    penalty: number;
  }>>((weeks, report) => {
    const taskDate = new Date(report.date);
    if (Number.isNaN(taskDate.getTime())) return weeks;
    taskDate.setUTCHours(0, 0, 0, 0);
    taskDate.setUTCDate(taskDate.getUTCDate() - ((taskDate.getUTCDay() + 6) % 7));
    const weekStart = taskDate.toISOString().slice(0, 10);
    const week = weeks[weekStart] || { weekStart, reports: 0, hours: 0, tasks: 0, penalty: 0 };
    week.reports += 1;
    week.hours += Number(report.hoursWorked) || 0;
    week.tasks += Number(report.tasksWorked) || 0;
    week.penalty += report.latePenalty || 0;
    weeks[weekStart] = week;
    return weeks;
  }, {})).sort((left, right) => right.weekStart.localeCompare(left.weekStart));

   if (viewMode === 'detail' && selectedReport) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center relative">
        <div className="w-full max-w-5xl bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={handleBackToList}
              className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
            >
              <Home className="w-4 h-4 mr-2" /> Back to List
            </button>
            <h2 className="text-2xl font-bold text-gray-900">Report Details</h2>
          </div>

          <GlassCard className="p-6 mb-6" delay={0.1} hover={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Report Information</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-gray-400">Rater Name</dt>
                    <dd className="font-semibold text-gray-900">{selectedReport.raterName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Profile Name</dt>
                    <dd className="font-semibold text-gray-900">{selectedReport.profileName}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Email Address</dt>
                    <dd className="font-semibold text-gray-900">{selectedReport.email}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Category</dt>
                    <dd className="font-semibold text-gray-900">{CATEGORY_DISPLAY[selectedReport.category] || selectedReport.category}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Proxy</dt>
                    <dd className="font-semibold text-gray-900">{selectedReport.proxy}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Status</dt>
                    <dd className="font-semibold text-gray-900">{selectedReport.status}</dd>
                  </div>
                </dl>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Work Metrics</h3>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-xs text-gray-400">Tasks Worked</dt>
                    <dd className="font-semibold text-gray-900 text-2xl">{selectedReport.tasksWorked}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Hours Worked</dt>
                    <dd className="font-semibold text-gray-900 text-2xl">{selectedReport.hoursWorked}h</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Hourly Rate</dt>
                    <dd className="font-semibold text-gray-900">
                      ₦{(selectedReport.hourlyRate || 2000).toLocaleString()} per hour
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Report Date</dt>
                    <dd className="font-semibold text-gray-900">
                      {selectedReport.date ? new Date(selectedReport.date).toLocaleDateString() : 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Submission Time</dt>
                    <dd className="font-semibold text-gray-900">{formatSubmissionTime(selectedReport.submissionTime)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Late Penalty</dt>
                    <dd className={`font-semibold ${selectedReport.latePenalty && selectedReport.latePenalty > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {selectedReport.latePenalty && selectedReport.latePenalty > 0
                        ? `₦${Number(selectedReport.latePenalty).toLocaleString()} (Late submission)`
                        : 'None — On time'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-gray-400">Resubmitted</dt>
                    <dd className="font-semibold text-gray-900">
                      {selectedReport.isResubmitted ? 'Yes (corrected resubmission)' : 'No'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {selectedReport.description && (
              <div className="mt-6">
                <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Description</h3>
                <p className="text-gray-700">{selectedReport.description}</p>
              </div>
            )}
          </GlassCard>

          <div className="flex justify-end gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleResubmit(selectedReport)}
              className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Resubmit Corrected Report
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleDeleteReport(selectedReport)}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-lg shadow-lg transition-colors flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Report
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center relative">
      <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg p-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <Home className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-gray-900">My Report History</h2>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {user?.username}
            </span>
          </div>
        </div>

        <div className="mb-4 flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by email, profile, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
            />
          </div>
          <button
            onClick={() => void fetchMyReports()}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <GlassCard className="p-4 text-center" delay={0.1} hover={false}>
            <div className="text-2xl font-bold text-blue-600">{filteredReports.length}</div>
            <div className="text-xs text-gray-500">Total Reports</div>
          </GlassCard>
          <GlassCard className="p-4 text-center" delay={0.15} hover={false}>
            <div className="text-2xl font-bold text-indigo-600">{totalHours.toFixed(2)}h</div>
            <div className="text-xs text-gray-500">Total Hours</div>
          </GlassCard>
          <GlassCard className="p-4 text-center" delay={0.2} hover={false}>
            <div className="text-2xl font-bold text-amber-600">{totalTasks}</div>
            <div className="text-xs text-gray-500">Total Tasks</div>
          </GlassCard>
          <GlassCard className="p-4 text-center" delay={0.25} hover={false}>
            <div className={`text-2xl font-bold ${totalLatePenalty > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {totalLatePenalty > 0 ? `₦${totalLatePenalty.toLocaleString()}` : '₦0'}
            </div>
            <div className="text-xs text-gray-500">Late Penalties</div>
          </GlassCard>
        </div>

        {user?.role === 'user' && weeklyReports.length > 0 && (
          <section className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50 p-5">
            <h3 className="mb-3 text-lg font-semibold text-gray-900">Weekly reports</h3>
            <div className="space-y-2">
              {weeklyReports.map((week) => {
                const start = new Date(`${week.weekStart}T00:00:00Z`);
                const end = new Date(start);
                end.setUTCDate(end.getUTCDate() + 6);
                return (
                  <div key={week.weekStart} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white px-4 py-3 text-sm">
                    <span className="font-medium text-gray-800">
                      {start.toLocaleDateString()} - {end.toLocaleDateString()}
                    </span>
                    <span className="text-gray-600">
                      {week.reports} reports, {week.tasks} tasks, {week.hours.toFixed(2)} hours
                    </span>
                    {week.penalty > 0 && <span className="font-medium text-red-600">₦{week.penalty.toLocaleString()} penalty</span>}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {loading ? (
          <p className="text-center py-12 text-gray-400">Loading your reports...</p>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>No reports found matching your search.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Penalty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredReports.map((report) => {
                  const isLate = Boolean(report.latePenalty);
                  const penalty = report.latePenalty || 0;
                  return (
                    <React.Fragment key={report._id || report.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        {report.date ? new Date(report.date).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {report.profileName}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {report.email}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {CATEGORY_DISPLAY[report.category] || report.category}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {report.tasksWorked}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700">
                        {report.hoursWorked}h (₦{(report.hourlyRate || 2000).toLocaleString()}/hr)
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {report.submissionTime ? (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(report.submissionTime).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            {isLate && <AlertTriangle className="w-3 h-3 text-red-500" />}
                          </div>
                        ) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm">
                        {penalty > 0 ? (
                          <span className="text-red-600 font-bold">₦{penalty.toLocaleString()}</span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleViewDetail(report)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="View Details"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          {report._id && report.status !== 'Paid' && !(typeof report.invoiceId === 'object' && report.invoiceId?.status === 'Paid') && (
                            <button
                              onClick={() => beginEdit(report)}
                              className="text-emerald-600 hover:text-emerald-800 p-1"
                              title={report.reviewStatus === 'approved' ? 'Edit report; changes will need approval again' : 'Edit report'}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleResubmit(report)}
                            className="text-indigo-600 hover:text-indigo-800 p-1"
                            title="Resubmit corrected report"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteReport(report)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Delete report"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === report._id && (
                      <tr>
                        <td colSpan={9} className="bg-indigo-50 px-4 py-4">
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                            <label className="text-xs font-medium text-gray-600">Task date
                              <input type="date" value={String(editForm.date || '')} onChange={(event) => setEditForm((current) => ({ ...current, date: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm" />
                            </label>
                            <label className="text-xs font-medium text-gray-600">Profile
                              <input value={String(editForm.profileName || '')} onChange={(event) => setEditForm((current) => ({ ...current, profileName: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm" />
                            </label>
                            <label className="text-xs font-medium text-gray-600">Email
                              <input type="email" value={String(editForm.email || '')} onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm" />
                            </label>
                            <label className="text-xs font-medium text-gray-600">Category
                              <select value={String(editForm.category || '')} onChange={(event) => setEditForm((current) => ({ ...current, category: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm">
                                {REPORT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                              </select>
                            </label>
                            <label className="text-xs font-medium text-gray-600">Proxy
                              <select value={String(editForm.proxy || '')} onChange={(event) => setEditForm((current) => ({ ...current, proxy: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm">
                                {REPORT_PROXIES.map((proxy) => <option key={proxy} value={proxy}>{proxy}</option>)}
                              </select>
                            </label>
                            <label className="text-xs font-medium text-gray-600">Status
                              <select value={String(editForm.status || 'Active')} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value as RequestReport['status'] }))} className="mt-1 w-full rounded border p-2 text-sm">
                                {['Active', 'Restricted', 'Sacked'].map((status) => <option key={status} value={status}>{status}</option>)}
                              </select>
                            </label>
                            <label className="text-xs font-medium text-gray-600">Tasks
                              <input type="number" min="0" value={String(editForm.tasksWorked || '')} onChange={(event) => setEditForm((current) => ({ ...current, tasksWorked: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm" />
                            </label>
                            <label className="text-xs font-medium text-gray-600">Hours
                              <input type="number" min="0" step="0.01" value={String(editForm.hoursWorked || '')} onChange={(event) => setEditForm((current) => ({ ...current, hoursWorked: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm" />
                            </label>
                            <label className="text-xs font-medium text-gray-600">Hourly rate
                              <select value={String(editForm.hourlyRate || 2000)} onChange={(event) => setEditForm((current) => ({ ...current, hourlyRate: Number(event.target.value) }))} className="mt-1 w-full rounded border p-2 text-sm">
                                {[2000, 2500, 3000, 3500, 4000].map((rate) => <option key={rate} value={rate}>₦{rate.toLocaleString()}</option>)}
                              </select>
                            </label>
                            <label className="text-xs font-medium text-gray-600 sm:col-span-2">Description
                              <input value={String(editForm.description || '')} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} className="mt-1 w-full rounded border p-2 text-sm" />
                            </label>
                          </div>
                          {editError && <p role="alert" className="mt-3 text-sm text-red-600">{editError}</p>}
                          <div className="mt-3 flex justify-end gap-2">
                            <button type="button" onClick={() => { setEditingId(null); setEditError(''); }} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm text-gray-700"><X size={15} /> Cancel</button>
                            <button type="button" onClick={() => void saveEdit(report._id!)} className="inline-flex items-center gap-1 rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white"><Save size={15} /> Save changes</button>
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
