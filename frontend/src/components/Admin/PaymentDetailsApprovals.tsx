import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle, Clock, RefreshCw, ShieldCheck, XCircle } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';
import { adminService, type RaterPayment } from '../../services/adminService';
import { notificationService } from '../../services/notificationService';

export const PaymentDetailsApprovals: React.FC = () => {
  const [raters, setRaters] = useState<RaterPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadPaymentDetails = useCallback(async () => {
    try {
      const response = await adminService.getPaymentDetailsApprovals(currentPage);
      setRaters(response.data);
      setTotalPages(response.pagination.totalPages);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load submitted payment details');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  const refreshPaymentDetails = () => {
    setLoading(true);
    void loadPaymentDetails();
  };

  useEffect(() => {
    void Promise.resolve().then(loadPaymentDetails);
    notificationService.connect();
    return notificationService.subscribePaymentDetailsChanged(() => {
      void loadPaymentDetails();
    });
  }, [loadPaymentDetails]);

  const reviewDetails = async (rater: RaterPayment, decision: 'approved' | 'rejected') => {
    let note = '';
    if (decision === 'rejected') {
      const rejectionNote = window.prompt('Reason for rejecting these payment details (required):');
      if (rejectionNote === null) return;
      note = rejectionNote.trim();
      if (!note) {
        setError('A reason is required to reject payment details.');
        return;
      }
    } else {
      const approvalNote = window.prompt('Reason for approving these payment details (optional):');
      if (approvalNote === null) return;
      note = approvalNote.trim();
    }

    setBusyUserId(rater._id);
    setError('');
    try {
      await adminService.reviewManualPaymentDetails(rater._id, decision, note);
      await loadPaymentDetails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update payment details review');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="page-stack">
      <section className="page-intro">
        <div>
          <span className="eyebrow"><ShieldCheck size={14} /> Admin panel</span>
          <h1>Payment Details Approvals</h1>
          <p>Review rater-submitted PayPal and other payment details. New submissions appear here in real time.</p>
        </div>
        <button className="btn-glass px-4 py-2" onClick={refreshPaymentDetails} disabled={loading}>
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </section>

      {error && <div role="alert" className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {loading && raters.length === 0 ? (
        <GlassCard className="p-8 text-center text-slate-300">Loading payment details…</GlassCard>
      ) : raters.length === 0 ? (
        <GlassCard className="p-8 text-center">
          <Clock className="mx-auto mb-3 text-slate-400" size={28} />
          <h2 className="font-semibold text-white">No payment details submitted</h2>
          <p className="mt-1 text-sm text-slate-400">Submitted and Paystack-verified accounts will appear here.</p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {raters.map((rater) => {
            const details = rater.paymentDetails;
            const isPending = details.verificationStatus === 'pending_review';
            const isBusy = busyUserId === rater._id;
            const isPaystack = details.method === 'paystack' || (!details.method && Boolean(details.bankCode));
            const methodName = details.method === 'paypal'
              ? 'PayPal'
              : details.method === 'manual'
                ? details.paymentProvider || 'Other payment method'
                : 'Paystack';

            return (
              <GlassCard key={rater._id} className="p-5" hover={false}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold text-white">{rater.userName || rater.email}</h2>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-200">{methodName}</span>
                      <span className={`rounded-full px-2.5 py-1 text-xs ${isPending ? 'bg-amber-400/15 text-amber-200' : isPaystack || details.verificationStatus === 'approved' ? 'bg-emerald-400/15 text-emerald-200' : 'bg-red-400/15 text-red-200'}`}>
                        {isPaystack ? 'Paystack verified' : (details.verificationStatus || 'pending review').replace('_', ' ')}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-400">{rater.email}</p>

                    <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                      {details.paypalEmail && <div><dt className="text-xs uppercase text-slate-500">PayPal email</dt><dd className="mt-1 break-all text-slate-100">{details.paypalEmail}</dd></div>}
                      {details.accountName && <div><dt className="text-xs uppercase text-slate-500">Account holder</dt><dd className="mt-1 text-slate-100">{details.accountName}</dd></div>}
                      {details.accountNumber && <div><dt className="text-xs uppercase text-slate-500">Account number</dt><dd className="mt-1 break-all text-slate-100">{details.accountNumber}</dd></div>}
                      {details.bankName && <div><dt className="text-xs uppercase text-slate-500">Bank</dt><dd className="mt-1 text-slate-100">{details.bankName}</dd></div>}
                      {details.routingNumber && <div><dt className="text-xs uppercase text-slate-500">Routing number</dt><dd className="mt-1 break-all text-slate-100">{details.routingNumber}</dd></div>}
                      {details.iban && <div><dt className="text-xs uppercase text-slate-500">IBAN</dt><dd className="mt-1 break-all text-slate-100">{details.iban}</dd></div>}
                      {details.swiftCode && <div><dt className="text-xs uppercase text-slate-500">SWIFT / BIC</dt><dd className="mt-1 text-slate-100">{details.swiftCode}</dd></div>}
                      {details.country && <div><dt className="text-xs uppercase text-slate-500">Country</dt><dd className="mt-1 text-slate-100">{details.country}</dd></div>}
                      {details.currency && <div><dt className="text-xs uppercase text-slate-500">Currency</dt><dd className="mt-1 text-slate-100">{details.currency}</dd></div>}
                    </dl>
                    {details.verificationNote && <p className="mt-3 text-sm text-slate-400">Review note: {details.verificationNote}</p>}
                  </div>

                  {isPending && !isPaystack && (
                    <div className="flex shrink-0 gap-2">
                      <button
                        onClick={() => void reviewDetails(rater, 'rejected')}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-200 hover:bg-red-400/20 disabled:opacity-50"
                      >
                        <XCircle size={15} /> Reject
                      </button>
                      <button
                        onClick={() => void reviewDetails(rater, 'approved')}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200 hover:bg-emerald-400/20 disabled:opacity-50"
                      >
                        <CheckCircle size={15} /> Approve
                      </button>
                    </div>
                  )}
                </div>
              </GlassCard>
            );
          })}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-slate-300">
              <span>Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button className="btn-glass px-3 py-2 disabled:opacity-50" disabled={currentPage <= 1 || loading} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>Previous</button>
                <button className="btn-glass px-3 py-2 disabled:opacity-50" disabled={currentPage >= totalPages || loading} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentDetailsApprovals;
