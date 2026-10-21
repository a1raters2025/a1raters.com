import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, FileText, RefreshCw, TrendingUp } from 'lucide-react';
import { reportService, type RequestReport } from '../../services/reportService';
import { authService } from '../../services/authService';
import { GlassCard } from '../UI/GlassCard';

interface ReportWeek {
  start: string;
  reports: RequestReport[];
}

const getWeekStart = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

const formatDate = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString(undefined, {
  day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
});

const getWeekEnd = (start: string) => {
  const date = new Date(`${start}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 6);
  return date.toISOString().slice(0, 10);
};

const reportEarnings = (report: RequestReport) => Math.max(
  0,
  (Number(report.hoursWorked) || 0) * (Number(report.hourlyRate) || 0) - (Number(report.latePenalty) || 0),
);

const formatNaira = (amount: number) => `₦${amount.toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export const WeeklyReportsPage: React.FC = () => {
  const user = authService.getUser();
  const isAdmin = user?.role === 'admin';
  const [reports, setReports] = useState<RequestReport[]>([]);
  const [selectedWeek, setSelectedWeek] = useState('');
  const [selectedRater, setSelectedRater] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReports = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const loadedReports = isAdmin
        ? await reportService.getAllReportsFromServer()
        : await reportService.getMyReportsFromServer();
      setReports(loadedReports.filter((report) => !report.isDeleted));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load your weekly reports.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const raters = useMemo(() => {
    const byRater = new Map<string, string>();
    reports.forEach((report) => {
      const submittedBy = report.submittedBy;
      const id = submittedBy && typeof submittedBy === 'object' ? submittedBy._id : '';
      const key = id || report.email.toLowerCase();
      const name = (submittedBy && typeof submittedBy === 'object' ? submittedBy.userName : '') || report.raterName || report.email;
      if (key) byRater.set(key, name);
    });
    return Array.from(byRater, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [reports]);

  const visibleReports = useMemo(() => isAdmin && selectedRater !== 'all'
    ? reports.filter((report) => {
      const submittedBy = report.submittedBy;
      const id = submittedBy && typeof submittedBy === 'object' ? submittedBy._id : '';
      return (id || report.email.toLowerCase()) === selectedRater;
    })
    : reports, [isAdmin, reports, selectedRater]);

  const weeks = useMemo<ReportWeek[]>(() => {
    const grouped = new Map<string, RequestReport[]>();
    visibleReports.forEach((report) => {
      const start = getWeekStart(report.date);
      if (!start) return;
      grouped.set(start, [...(grouped.get(start) || []), report]);
    });
    return Array.from(grouped, ([start, weekReports]) => ({
      start,
      reports: weekReports.sort((a, b) => b.date.localeCompare(a.date)),
    })).sort((a, b) => b.start.localeCompare(a.start));
  }, [visibleReports]);

  const activeWeek = weeks.find((week) => week.start === selectedWeek) || weeks[0];
  const weeklyReports = activeWeek?.reports || [];
  const totals = weeklyReports.reduce((summary, report) => {
    summary.tasks += Number(report.tasksWorked) || 0;
    summary.hours += Number(report.hoursWorked) || 0;
    summary.penalties += Number(report.latePenalty) || 0;
    if (report.reviewStatus === 'approved') summary.earned += reportEarnings(report);
    return summary;
  }, { tasks: 0, hours: 0, penalties: 0, earned: 0 });

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="eyebrow"><CalendarDays size={14} /> Reporting</div>
            <h1 className="mt-2 text-3xl font-bold text-white">Weekly Reports</h1>
            <p className="mt-1 text-sm text-slate-400">{isAdmin ? 'Browse weekly reports across all raters.' : `${user?.username ? `${user.username} · ` : ''}All your reports grouped by task publication week.`} Weeks run Monday–Sunday.</p>
          </div>
          <button onClick={() => void loadReports()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-slate-200 hover:bg-white/10 disabled:opacity-50">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>

        {!loading && !error && (isAdmin ? raters.length > 0 : weeks.length > 0) && (
          <div className="mb-6 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2">
            {isAdmin && (
              <div>
                <label htmlFor="weekly-report-rater" className="mb-1.5 block text-sm font-medium text-slate-300">Rater</label>
                <select id="weekly-report-rater" value={selectedRater} onChange={(event) => setSelectedRater(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400">
                  <option value="all">All raters</option>
                  {raters.map((rater) => <option key={rater.id} value={rater.id}>{rater.name}</option>)}
                </select>
              </div>
            )}
            {weeks.length > 0 && (
              <div>
                <label htmlFor="weekly-report-week" className="mb-1.5 block text-sm font-medium text-slate-300">Select week</label>
                <select id="weekly-report-week" value={activeWeek?.start || ''} onChange={(event) => setSelectedWeek(event.target.value)} className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 text-white outline-none focus:border-indigo-400">
                  {weeks.map((week) => <option key={week.start} value={week.start}>{formatDate(week.start)} – {formatDate(getWeekEnd(week.start))} ({week.reports.length} reports)</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        {loading ? (
          <GlassCard className="p-10 text-center text-slate-300">Loading your reports…</GlassCard>
        ) : error ? (
          <GlassCard className="p-10 text-center text-rose-300">
            <p>{error}</p>
            <button onClick={() => void loadReports()} className="mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-white">Try again</button>
          </GlassCard>
        ) : !activeWeek ? (
          <GlassCard className="p-10 text-center text-slate-400">
            <FileText className="mx-auto mb-3 opacity-40" size={36} />
            <p>No reports found yet.</p>
          </GlassCard>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
              <SummaryCard label="Reports" value={weeklyReports.length.toLocaleString()} icon={FileText} />
              <SummaryCard label="Tasks" value={totals.tasks.toLocaleString()} icon={TrendingUp} />
              <SummaryCard label="Hours" value={`${totals.hours.toFixed(2)}h`} icon={Clock} />
              <SummaryCard label="Approved earnings" value={formatNaira(totals.earned)} icon={TrendingUp} />
              <SummaryCard label="Late penalties" value={formatNaira(totals.penalties)} icon={Clock} />
            </div>

            <GlassCard strong className="overflow-hidden p-0" hover={false}>
              <div className="border-b border-white/10 p-4">
                <h2 className="font-semibold text-white">Reports for {formatDate(activeWeek.start)} – {formatDate(getWeekEnd(activeWeek.start))}</h2>
                <p className="mt-1 text-xs text-slate-400">Earnings include approved reports only. Pending or rejected reports remain listed here.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Task date</th>
                      {isAdmin && <th className="px-4 py-3">Rater</th>}
                      <th className="px-4 py-3">Profile / email</th>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3 text-right">Tasks</th>
                      <th className="px-4 py-3 text-right">Hours</th>
                      <th className="px-4 py-3 text-right">Penalty</th>
                      <th className="px-4 py-3">Review status</th>
                      <th className="px-4 py-3 text-right">Earned</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {weeklyReports.map((report) => (
                      <tr key={report._id || `${report.date}-${report.email}-${report.profileName}`} className="text-slate-300 hover:bg-white/5">
                        <td className="whitespace-nowrap px-4 py-3">{formatDate(report.date.slice(0, 10))}</td>
                        {isAdmin && <td className="px-4 py-3">{report.raterName}</td>}
                        <td className="px-4 py-3">
                          <div className="font-medium text-white">{report.profileName}</div>
                          <div className="text-xs text-slate-500">{report.email}</div>
                        </td>
                        <td className="px-4 py-3">{report.category}</td>
                        <td className="px-4 py-3 text-right">{Number(report.tasksWorked) || 0}</td>
                        <td className="px-4 py-3 text-right">{(Number(report.hoursWorked) || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-rose-300">{formatNaira(report.latePenalty || 0)}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs capitalize">{report.reviewStatus || 'pending'}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-emerald-300">
                          {report.reviewStatus === 'approved' ? formatNaira(reportEarnings(report)) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </>
        )}
      </div>
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ElementType }> = ({ label, value, icon: Icon }) => (
  <GlassCard className="p-4 text-center" hover={false}>
    <Icon className="mx-auto mb-2 h-4 w-4 text-indigo-300" />
    <div className="text-lg font-bold text-white">{value}</div>
    <div className="text-xs text-slate-400">{label}</div>
  </GlassCard>
);
