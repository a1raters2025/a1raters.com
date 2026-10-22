import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { authService } from '../../services/authService';
import {
  reportService,
  type RequestReport,
} from '../../services/reportService';
import { GlassCard } from '../UI/GlassCard';
import { formatNigeriaDate, formatNigeriaDateTime } from '../../utils/dateTime';
import { EVALUATION_CATEGORIES } from '../../constants/reportCategories';

const CATEGORIES = [
  'All categories',
  ...EVALUATION_CATEGORIES,
  'Manual Invoice',
] as const;

type ReviewFilter = 'pending' | 'all' | 'approved' | 'rejected';

const STATUS_LABELS: Record<ReviewFilter, string> = {
  pending: 'Needs review',
  all: 'All reports',
  approved: 'Approved',
  rejected: 'Rejected',
};

const getReviewStatus = (report: RequestReport): Exclude<ReviewFilter, 'all'> =>
  report.reviewStatus || 'pending';

const REVIEW_STYLES: Record<Exclude<ReviewFilter, 'all'>, string> = {
  pending: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
  approved: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
  rejected: 'border-rose-400/20 bg-rose-400/10 text-rose-300',
};

export const RaterReportReviewPage: React.FC = () => {
  const navigate = useNavigate();
  const isAdmin = authService.getUser()?.role === 'admin';
  const [category, setCategory] = useState<string>('All categories');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('pending');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [reports, setReports] = useState<RequestReport[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!isAdmin) navigate('/dashboard', { replace: true });
  }, [isAdmin, navigate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const loadReports = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError('');
    try {
      const result = await reportService.getAdminReportReviews({
        page,
        limit: 50,
        category: category === 'All categories' ? 'all' : category,
        reviewStatus: reviewFilter,
        raterName: search || undefined,
      });
      setReports(result.data);
      setTotalItems(result.pagination.totalItems);
      setTotalPages(Math.max(1, result.pagination.totalPages));
    } catch (loadError) {
      console.error('Failed to load rater report reviews:', loadError);
      setError(loadError instanceof Error ? loadError.message : 'Could not load rater reports.');
      setReports([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  }, [category, isAdmin, page, reviewFilter, search]);

  useEffect(() => {
    const fetch = async () => {
      await loadReports();
    };
    void fetch();
  }, [loadReports]);

  const changeReview = async (
    report: RequestReport,
    reviewStatus: 'approved' | 'rejected',
  ) => {
    if (!report._id) {
      setNotice({ type: 'error', message: 'This report has no server ID and cannot be reviewed.' });
      return;
    }
    const note = reviewStatus === 'rejected'
      ? (rejectionNotes[report._id] || '').trim()
      : '';
    if (reviewStatus === 'rejected' && !note) {
      setNotice({ type: 'error', message: 'Add a reason before rejecting this report.' });
      return;
    }

    setActiveReportId(report._id);
    setNotice(null);
    try {
      await reportService.updateReportReview(report._id, reviewStatus, note);
      setNotice({
        type: 'success',
        message: `Report ${reviewStatus === 'approved' ? 'approved' : 'rejected'} successfully.`,
      });
      setRejectingReportId(null);
      setRejectionNotes((current) => {
        const next = { ...current };
        delete next[report._id!];
        return next;
      });
      await loadReports();
    } catch (reviewError) {
      console.error(`Failed to ${reviewStatus} report:`, reviewError);
      setNotice({
        type: 'error',
        message: reviewError instanceof Error ? reviewError.message : 'Could not update this report review.',
      });
    } finally {
      setActiveReportId(null);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-slate-950 p-4 text-slate-100 sm:p-6">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-cyan-300">
              <FileCheck2 size={20} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">Rater review</span>
            </div>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Raters’ Submitted Reports</h1>
            <p className="mt-1 text-sm text-slate-400">
              Review submissions by work category and record an approval decision.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadReports()}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </header>

        {notice && (
          <div
            role="status"
            className={`mb-5 rounded-xl border px-4 py-3 text-sm ${
              notice.type === 'success'
                ? 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                : 'border-rose-400/20 bg-rose-400/10 text-rose-200'
            }`}
          >
            {notice.message}
          </div>
        )}

        <GlassCard className="mb-5 p-4 sm:p-5" hover={false}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-sm font-semibold text-white">Browse by category</h2>
              <p className="mt-1 text-xs text-slate-400">Select a category to focus review on that work type.</p>
            </div>
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Filter by rater name"
                aria-label="Filter by rater name"
                className="w-full rounded-xl border border-white/10 bg-slate-900/70 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/50"
              />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => { setCategory(item); setPage(1); }}
                className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  category === item
                    ? 'border-cyan-400/30 bg-cyan-400/10 text-cyan-200'
                    : 'border-white/10 bg-white/[0.03] text-slate-400 hover:bg-white/[0.08] hover:text-white'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </GlassCard>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(STATUS_LABELS) as ReviewFilter[]).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => { setReviewFilter(status); setPage(1); }}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                  reviewFilter === status
                    ? 'bg-slate-100 text-slate-950'
                    : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
          <div className="text-xs text-slate-400">
            {totalItems.toLocaleString()} report{totalItems === 1 ? '' : 's'}
          </div>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <GlassCard className="overflow-hidden" hover={false}>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-400">
              <LoaderCircle className="animate-spin" size={18} />
              Loading submitted reports…
            </div>
          ) : reports.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileCheck2 className="mx-auto mb-3 text-slate-600" size={32} />
              <h3 className="font-semibold text-slate-200">No reports found</h3>
              <p className="mt-1 text-sm text-slate-500">
                Try another category, review status, or rater name.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {reports.map((report) => {
                const reportId = report._id || String(report.id);
                const status = getReviewStatus(report);
                const isBusy = activeReportId === reportId;
                const isRejecting = rejectingReportId === reportId;
                return (
                  <article key={reportId} className="p-4 sm:p-5">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-white">{report.raterName}</h3>
                          <span className="text-xs text-slate-500">{report.email}</span>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${REVIEW_STYLES[status]}`}>
                            {STATUS_LABELS[status]}
                          </span>
                          {report.isResubmitted && (
                            <span className="rounded-full border border-violet-400/20 bg-violet-400/10 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
                              Resubmitted
                            </span>
                          )}
                        </div>

                        <dl className="grid grid-cols-2 gap-x-5 gap-y-3 text-sm sm:grid-cols-3 xl:grid-cols-6">
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Category</dt>
                            <dd className="mt-1 font-medium text-cyan-200">{report.category}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Profile</dt>
                            <dd className="mt-1 truncate font-medium text-slate-200">{report.profileName}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Task published</dt>
                            <dd className="mt-1 text-slate-300">{formatNigeriaDate(report.date)}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Hours</dt>
                            <dd className="mt-1 text-slate-300">{report.hoursWorked || '0'}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Tasks</dt>
                            <dd className="mt-1 text-slate-300">{report.tasksWorked || '0'}</dd>
                          </div>
                          <div>
                            <dt className="text-[11px] uppercase tracking-wide text-slate-500">Submitted</dt>
                            <dd className="mt-1 text-slate-300">{formatNigeriaDateTime(report.submissionTime)}</dd>
                          </div>
                        </dl>

                        {report.description && (
                          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-400">
                            {report.description}
                          </p>
                        )}
                        {report.reviewNote && (
                          <p className="mt-3 rounded-lg border border-white/5 bg-black/10 px-3 py-2 text-xs text-slate-400">
                            Review note: {report.reviewNote}
                          </p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                        {report.reviewStatus !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => void changeReview(report, 'approved')}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/25 disabled:opacity-50"
                          >
                            {isBusy ? <LoaderCircle className="animate-spin" size={14} /> : <Check size={14} />}
                            Approve
                          </button>
                        )}
                        {report.reviewStatus !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setRejectingReportId(isRejecting ? null : reportId);
                              setNotice(null);
                            }}
                            disabled={isBusy}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500/15 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/25 disabled:opacity-50"
                          >
                            <X size={14} />
                            Reject
                          </button>
                        )}
                      </div>
                    </div>

                    {isRejecting && (
                      <div className="mt-4 rounded-xl border border-rose-400/15 bg-rose-400/[0.04] p-3 sm:ml-auto sm:max-w-xl">
                        <label htmlFor={`reject-note-${reportId}`} className="mb-2 block text-xs font-semibold text-rose-200">
                          Rejection reason
                        </label>
                        <textarea
                          id={`reject-note-${reportId}`}
                          value={rejectionNotes[reportId] || ''}
                          onChange={(event) => setRejectionNotes((current) => ({
                            ...current,
                            [reportId]: event.target.value,
                          }))}
                          maxLength={1000}
                          rows={2}
                          placeholder="Explain what needs correction so the rater can address it."
                          className="w-full resize-y rounded-lg border border-white/10 bg-slate-950/70 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-rose-400/40"
                        />
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <span className="text-[11px] text-slate-500">
                            {(rejectionNotes[reportId] || '').length}/1000
                          </span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setRejectingReportId(null)}
                              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-400 hover:bg-white/5 hover:text-white"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => void changeReview(report, 'rejected')}
                              disabled={isBusy || !(rejectionNotes[reportId] || '').trim()}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-400 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isBusy && <LoaderCircle className="animate-spin" size={14} />}
                              Confirm rejection
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </GlassCard>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages} · 50 reports per page
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={loading || page <= 1}
              aria-label="Previous page"
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={loading || page >= totalPages}
              aria-label="Next page"
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-300 hover:bg-white/10 disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
