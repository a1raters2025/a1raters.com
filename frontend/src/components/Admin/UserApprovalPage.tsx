import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService, type User } from '../../services/authService';
import { adminService, type PayoutApproval } from '../../services/adminService';
import { GlassCard } from '../UI/GlassCard';
import {
  AlertCircle,
  ArrowLeft,
  Banknote,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Shield,
  User as UserIcon,
  Users,
  Wallet,
  X,
  Trash2,
} from 'lucide-react';

type ApprovalTab = 'accounts' | 'payouts';

const ROLE_OPTIONS = ['user', 'client'] as const;

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'client':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
};

const formatDate = (date?: string | null) => {
  if (!date) return '—';
  const parsedDate = new Date(date);
  return Number.isNaN(parsedDate.getTime())
    ? '—'
    : parsedDate.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatNaira = (amount: number) => new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 2,
}).format(amount || 0);

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export const UserApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ApprovalTab>('accounts');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [payouts, setPayouts] = useState<PayoutApproval[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingPayouts, setLoadingPayouts] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [payoutsError, setPayoutsError] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [accountActionId, setAccountActionId] = useState<string | null>(null);
  const [payoutActionId, setPayoutActionId] = useState<string | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchPendingUsers = useCallback(async () => {
    setLoadingUsers(true);
    setUsersError('');
    try {
      const result = await authService.getPendingUsers(1, 100, roleFilter === 'all' ? undefined : roleFilter);
      setPendingUsers(result.users);
    } catch (error) {
      setUsersError(getErrorMessage(error, 'Unable to load account requests.'));
      setPendingUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }, [roleFilter]);

  const fetchPayouts = useCallback(async () => {
    setLoadingPayouts(true);
    setPayoutsError('');
    try {
      const firstPage = await adminService.getPayoutApprovals({ page: 1, limit: 100 });
      const remainingPages = await Promise.all(
        Array.from({ length: Math.max(0, firstPage.pagination.totalPages - 1) }, (_, index) =>
          adminService.getPayoutApprovals({ page: index + 2, limit: 100 })
        ),
      );
      setPayouts([...firstPage.data, ...remainingPages.flatMap((result) => result.data)]);
    } catch (error) {
      setPayoutsError(getErrorMessage(error, 'Unable to load payout approvals.'));
      setPayouts([]);
    } finally {
      setLoadingPayouts(false);
    }
  }, []);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchPendingUsers(), fetchPayouts()]);
  }, [fetchPendingUsers, fetchPayouts]);

  useEffect(() => {
    let mounted = true;
    const initialize = async () => {
      try {
        await authService.init();
        if (mounted) await refreshAll();
      } catch (error) {
        if (mounted) {
          setUsersError(getErrorMessage(error, 'Unable to initialize admin access.'));
          setLoadingUsers(false);
          setLoadingPayouts(false);
        }
      }
    };
    void initialize();
    return () => { mounted = false; };
  }, [refreshAll]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return pendingUsers.filter((user) =>
      !query || `${user.userName || user.username} ${user.email || ''}`.toLowerCase().includes(query)
    );
  }, [pendingUsers, search]);

  const filteredPayouts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return payouts.filter((payout) =>
      !query || `${payout.userName} ${payout.email} ${payout.paymentDetails.bankName || ''}`.toLowerCase().includes(query)
    );
  }, [payouts, search]);

  const pendingPayouts = payouts.filter((payout) => payout.availableAmount > 0 && payout.paymentStatus !== 'processing');
  const processingPayouts = payouts.filter((payout) => payout.paymentStatus === 'processing');
  const totalReadyToPay = pendingPayouts.reduce((sum, payout) => sum + payout.availableAmount, 0);

  const handleApproveAccount = async (user: User) => {
    if (!user._id || !window.confirm(`Approve ${user.userName || user.username}'s account?`)) return;
    const reason = window.prompt('Reason for approval (optional):');
    if (reason === null) return;
    setAccountActionId(user._id);
    try {
      await authService.approveUser(user._id, reason.trim());
      setPendingUsers((current) => current.filter((item) => item._id !== user._id));
      setNotice({ type: 'success', text: `${user.userName || user.username}'s account was approved.` });
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error, 'Unable to approve this account.') });
    } finally {
      setAccountActionId(null);
    }
  };

  const handleRejectAccount = async (user: User) => {
    const reason = rejectReasons[user._id || '']?.trim();
    if (!user._id || !reason) return;
    setAccountActionId(user._id);
    try {
      await authService.rejectUser(user._id, reason);
      setPendingUsers((current) => current.filter((item) => item._id !== user._id));
      setRejectingUserId(null);
      setNotice({ type: 'success', text: `${user.userName || user.username}'s account request was rejected.` });
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error, 'Unable to reject this account.') });
    } finally {
      setAccountActionId(null);
    }
  };

  const handleRemoveUnapproved = async () => {
    if (!window.confirm('This will permanently remove ALL unapproved (anonymous) user accounts. Only approved accounts will be kept. This cannot be undone. Continue?')) return;
    setIsRemoving(true);
    try {
      const result = await adminService.removeUnapprovedUsers();
      if (result.status === 'success') {
        setPendingUsers([]);
        void fetchPendingUsers();
        setNotice({ type: 'success', text: `Removed ${result.data.deletedCount} unapproved user account(s).` });
      } else {
        setNotice({ type: 'error', text: result.message || 'Unable to remove unapproved accounts.' });
      }
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error, 'Unable to remove unapproved accounts.') });
    } finally {
      setIsRemoving(false);
    }
  };

  const handleApprovePayment = async (payout: PayoutApproval) => {
    if (!payout._id) return;
    const amount = payout.pendingPayoutAmount || payout.availableAmount;
    if (payout.pendingPayoutReference) {
      setPayoutActionId(payout._id);
      setNotice(null);
      try {
        const result = await adminService.verifyPayout(payout._id, payout.pendingPayoutReference);
        setNotice({
          type: result.data.status === 'success' ? 'success' : 'error',
          text: result.data.status === 'success'
            ? `Payment to ${payout.userName} was confirmed.`
            : `Paystack reports this transfer as ${result.data.status}.`,
        });
        await fetchPayouts();
      } catch (error) {
        setNotice({ type: 'error', text: getErrorMessage(error, 'Unable to verify this Paystack transfer.') });
      } finally {
        setPayoutActionId(null);
      }
      return;
    }

    if (!payout.paymentDetails.isVerified || !payout.paymentDetails.bankCode || amount <= 0) return;
    const confirmed = window.confirm(
      `Approve a Paystack transfer of ${formatNaira(amount)} to ${payout.paymentDetails.accountName} at ${payout.paymentDetails.bankName}, account ${payout.paymentDetails.accountNumberMasked || 'ending unknown'}?`
    );
    if (!confirmed) return;

    setPayoutActionId(payout._id);
    setNotice(null);
    try {
      const result = await adminService.initiatePayout(payout._id, {
        amount,
        reason: `Admin-approved rater payout for ${payout.userName}`,
      });
      setNotice({
        type: 'success',
        text: result.data.status === 'success'
          ? `${formatNaira(amount)} was paid to ${payout.userName}.`
          : `Payout submitted to Paystack for ${payout.userName}. Reference: ${result.data.reference}`,
      });
      await fetchPayouts();
    } catch (error) {
      setNotice({ type: 'error', text: getErrorMessage(error, 'Unable to initiate the Paystack payout.') });
      await fetchPayouts();
    } finally {
      setPayoutActionId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.header
          className="mb-8 flex flex-wrap items-start justify-between gap-4"
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              aria-label="Back to dashboard"
              className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
                <Shield size={14} /> Admin workspace
              </div>
              <h1 className="text-2xl font-bold text-white sm:text-3xl">Approvals & payouts</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
                Review new account requests and approve Paystack bank transfers for eligible raters.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void refreshAll()}
            disabled={loadingUsers || loadingPayouts}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw size={15} className={loadingUsers || loadingPayouts ? 'animate-spin' : ''} />
            Refresh queue
          </button>
        </motion.header>

        {notice && (
          <div className={`mb-5 flex items-start gap-3 rounded-xl border p-4 text-sm ${
            notice.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-200'
          }`} role="status">
            {notice.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
            <span>{notice.text}</span>
            <button type="button" className="ml-auto opacity-70 hover:opacity-100" onClick={() => setNotice(null)} aria-label="Dismiss message">
              <X size={16} />
            </button>
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <GlassCard className="p-5" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Account requests</p>
                <p className="mt-2 text-2xl font-bold text-white">{pendingUsers.length}</p>
              </div>
              <span className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300"><Users size={20} /></span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Registrations awaiting review</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Payouts ready</p>
                <p className="mt-2 text-2xl font-bold text-white">{pendingPayouts.length}</p>
              </div>
              <span className="rounded-xl bg-cyan-500/15 p-3 text-cyan-300"><Wallet size={20} /></span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Raters with an available balance</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Ready to pay</p>
                <p className="mt-2 text-xl font-bold text-emerald-300">{formatNaira(totalReadyToPay)}</p>
              </div>
              <span className="rounded-xl bg-emerald-500/15 p-3 text-emerald-300"><Banknote size={20} /></span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Pending eligible balances</p>
          </GlassCard>
          <GlassCard className="p-5" hover={false}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-400">Transfers processing</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">{processingPayouts.length}</p>
              </div>
              <span className="rounded-xl bg-amber-500/15 p-3 text-amber-300"><Clock size={20} /></span>
            </div>
            <p className="mt-3 text-xs text-slate-500">Verify a reference before retrying</p>
          </GlassCard>
        </div>

        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="inline-flex w-fit rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('accounts')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'accounts' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Account requests <span className="ml-1.5 opacity-75">{pendingUsers.length}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('payouts')}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                activeTab === 'payouts' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'
              }`}
            >
              Payout approvals <span className="ml-1.5 opacity-75">{pendingPayouts.length + processingPayouts.length}</span>
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative min-w-0 flex-1 sm:min-w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={activeTab === 'accounts' ? 'Search name or email' : 'Search rater, email, or bank'}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-indigo-400"
              />
            </div>
            {activeTab === 'accounts' && (
              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                aria-label="Filter accounts by role"
                className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-400"
              >
                <option value="all">All roles</option>
                {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role === 'user' ? 'Raters' : 'Clients'}</option>)}
              </select>
            )}
          </div>
        </div>

        {activeTab === 'accounts' ? (
          <section aria-labelledby="account-requests-heading">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 id="account-requests-heading" className="text-lg font-semibold text-white">Registration review</h2>
                <p className="mt-1 text-sm text-slate-400">Confirm new users before granting platform access.</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-slate-500">{filteredUsers.length} shown</span>
                <button
                  type="button"
                  onClick={handleRemoveUnapproved}
                  disabled={isRemoving || filteredUsers.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 size={14} /> Remove unapproved
                </button>
              </div>
            </div>
            {usersError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                <AlertCircle size={16} /> {usersError}
              </div>
            )}
            {loadingUsers ? (
              <div className="flex justify-center py-14 text-slate-400"><Loader2 size={22} className="mr-2 animate-spin" />Loading registration requests…</div>
            ) : filteredUsers.length === 0 ? (
              <GlassCard className="p-10 text-center" hover={false}>
                <CheckCircle2 size={30} className="mx-auto mb-3 text-emerald-400" />
                <h3 className="font-semibold text-white">{pendingUsers.length ? 'No matching accounts' : 'All caught up'}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {pendingUsers.length ? 'Try changing your search or role filter.' : 'New registration requests will appear here.'}
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const id = user._id || '';
                  const name = user.userName || user.username || 'New user';
                  const rejecting = rejectingUserId === id;
                  return (
                    <GlassCard key={id} className="p-5" hover={false}>
                      <div className="flex flex-col gap-4 md:flex-row md:items-center">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          {user.image ? (
                            <img src={user.image} alt="" className="h-11 w-11 rounded-xl object-cover" />
                          ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 font-bold text-indigo-200">
                              {name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-white">{name}</h3>
                              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize ${getRoleBadge(user.role || 'user')}`}>
                                {user.role === 'user' ? 'Rater' : user.role || 'User'}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                              <span className="inline-flex items-center gap-1.5"><Mail size={13} />{user.email || 'No email provided'}</span>
                              <span className="inline-flex items-center gap-1.5"><Calendar size={13} />Registered {formatDate(user.createdAt)}</span>
                            </div>
                            {user.categories?.length ? (
                              <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500">
                                <UserIcon size={13} />{user.categories.join(', ')}
                              </p>
                            ) : null}
                          </div>
                        </div>
                        {!rejecting ? (
                          <div className="flex gap-2 md:shrink-0">
                            <button
                              type="button"
                              onClick={() => void handleApproveAccount(user)}
                              disabled={accountActionId === id}
                              className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:opacity-50"
                            >
                              {accountActionId === id ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                              Approve account
                            </button>
                            <button
                              type="button"
                              onClick={() => setRejectingUserId(id)}
                              className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/20"
                            >
                              <X size={15} /> Reject
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 md:shrink-0">
                            <button
                              type="button"
                              onClick={() => setRejectingUserId(null)}
                              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                      {rejecting && (
                        <div className="mt-4 border-t border-white/10 pt-4">
                          <label htmlFor={`reject-${id}`} className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Rejection reason
                          </label>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <textarea
                              id={`reject-${id}`}
                              rows={2}
                              maxLength={500}
                              value={rejectReasons[id] || ''}
                              onChange={(event) => setRejectReasons((current) => ({ ...current, [id]: event.target.value }))}
                              placeholder="Explain why this account request cannot be approved."
                              className="min-w-0 flex-1 resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-rose-400"
                            />
                            <button
                              type="button"
                              onClick={() => void handleRejectAccount(user)}
                              disabled={accountActionId === id || !rejectReasons[id]?.trim()}
                              className="inline-flex items-center justify-center gap-2 self-start rounded-lg bg-rose-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-400 disabled:opacity-50"
                            >
                              {accountActionId === id ? <Loader2 size={15} className="animate-spin" /> : <X size={15} />}
                              Confirm rejection
                            </button>
                          </div>
                        </div>
                      )}
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <section aria-labelledby="payout-approvals-heading">
            <div className="mb-3">
              <h2 id="payout-approvals-heading" className="text-lg font-semibold text-white">Rater payout review</h2>
              <p className="mt-1 text-sm text-slate-400">Approve a verified Nigerian bank account transfer through Paystack. Transfers already in progress must be verified before retrying.</p>
            </div>
            {payoutsError && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
                <AlertCircle size={16} /> {payoutsError}
              </div>
            )}
            {loadingPayouts ? (
              <div className="flex justify-center py-14 text-slate-400"><Loader2 size={22} className="mr-2 animate-spin" />Loading payout approvals…</div>
            ) : filteredPayouts.length === 0 ? (
              <GlassCard className="p-10 text-center" hover={false}>
                <Banknote size={30} className="mx-auto mb-3 text-slate-500" />
                <h3 className="font-semibold text-white">{payouts.length ? 'No matching payouts' : 'No payouts awaiting review'}</h3>
                <p className="mt-1 text-sm text-slate-400">
                  {payouts.length ? 'Try another search term.' : 'Raters with eligible balances and verified bank details will appear here.'}
                </p>
              </GlassCard>
            ) : (
              <div className="space-y-3">
                {filteredPayouts.map((payout) => {
                  const busy = payoutActionId === payout._id;
                  const verifying = payout.paymentStatus === 'processing' && Boolean(payout.pendingPayoutReference);
                  const canPay = payout.availableAmount > 0 && payout.paymentDetails.isVerified && Boolean(payout.paymentDetails.bankCode);
                  return (
                    <GlassCard key={payout._id} className="p-5" hover={false}>
                      <div className="flex flex-col gap-5 xl:flex-row xl:items-center">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold text-white">{payout.userName || payout.email}</h3>
                            <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">Rater</span>
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                              verifying ? 'bg-amber-500/15 text-amber-200' :
                              payout.paymentStatus === 'failed' ? 'bg-rose-500/15 text-rose-200' :
                              'bg-indigo-500/15 text-indigo-200'
                            }`}>
                              {verifying ? 'Transfer processing' : `${payout.paymentStatus || 'pending'} payout`}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-400">{payout.email}</p>
                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Available balance</p>
                              <p className="mt-1 font-semibold text-emerald-300">{formatNaira(payout.availableAmount)}</p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Bank</p>
                              <p className="mt-1 truncate text-sm font-medium text-white">{payout.paymentDetails.bankName || 'Not added'}</p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Account</p>
                              <p className="mt-1 truncate text-sm font-medium text-white">{payout.paymentDetails.accountName || 'Not verified'}</p>
                              <p className="mt-0.5 text-xs text-slate-500">{payout.paymentDetails.accountNumberMasked || 'No account on file'}</p>
                            </div>
                            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3">
                              <p className="text-[11px] uppercase tracking-wide text-slate-500">Payment details</p>
                              <p className={`mt-1 inline-flex items-center gap-1.5 text-sm font-medium ${
                                payout.paymentDetails.isVerified ? 'text-emerald-300' : 'text-amber-200'
                              }`}>
                                {payout.paymentDetails.isVerified ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
                                {payout.paymentDetails.isVerified ? 'Paystack verified' : 'Verification required'}
                              </p>
                            </div>
                          </div>
                          {payout.pendingPayoutReference && (
                            <p className="mt-3 break-all text-xs text-amber-200/80">
                              Transfer reference: {payout.pendingPayoutReference}
                              {payout.pendingPayoutAmount ? ` · ${formatNaira(payout.pendingPayoutAmount)}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 xl:w-48 xl:shrink-0">
                          <button
                            type="button"
                            onClick={() => void handleApprovePayment(payout)}
                            disabled={busy || (verifying ? !payout.pendingPayoutReference : !canPay)}
                            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                              verifying
                                ? 'bg-amber-500/80 hover:bg-amber-500'
                                : 'bg-emerald-500 hover:bg-emerald-400'
                            }`}
                          >
                            {busy ? <Loader2 size={16} className="animate-spin" /> : verifying ? <RefreshCw size={16} /> : <Banknote size={16} />}
                            {busy ? 'Processing…' : verifying ? 'Verify transfer' : 'Approve payment'}
                          </button>
                          {!verifying && !canPay && (
                            <p className="text-center text-xs text-amber-200/80">
                              {payout.availableAmount <= 0 ? 'No balance is available.' : 'Verified bank details are required.'}
                            </p>
                          )}
                          {payout.paymentStatus === 'processing' && !payout.pendingPayoutReference && (
                            <p className="text-center text-xs text-rose-200">Transfer reference missing; contact support before retrying.</p>
                          )}
                          <p className="inline-flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
                            <CreditCard size={12} /> Direct NGN bank transfer
                          </p>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
};
