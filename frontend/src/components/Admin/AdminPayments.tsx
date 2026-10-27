import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { adminService, type RaterPayment } from '../../services/adminService';
import { notificationService } from '../../services/notificationService';
import { GlassCard } from '../UI/GlassCard';
import {
    Users,
    Search,
    RefreshCw,
    Banknote,
    Clock,
    CheckCircle,
    XCircle,
    FileText,
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    processing: 'bg-blue-100 text-blue-800',
    paid: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
    pending: <Clock size={14} />,
    processing: <RefreshCw size={14} className="animate-spin" />,
    paid: <CheckCircle size={14} />,
    failed: <XCircle size={14} />,
};

const formatNaira = (amount: number) => `₦${(amount || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export const AdminPayments: React.FC = () => {
    const navigate = useNavigate();
    const user = authService.getUser();
    const isAdmin = user?.role === 'admin';

    const [raters, setRaters] = useState<RaterPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [processingPayments, setProcessingPayments] = useState<Set<string>>(new Set());
    const [paymentStatusEdits, setPaymentStatusEdits] = useState<Record<string, RaterPayment['paymentStatus']>>({});
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [selectedRater, setSelectedRater] = useState<RaterPayment | null>(null);

    useEffect(() => {
        if (!isAdmin) {
            navigate('/dashboard');
        }
    }, [isAdmin, navigate]);

    const fetchRaters = useCallback(async () => {
        if (!isAdmin) return;
        setLoading(true);
        try {
            const response = await adminService.getRaterPayments({
                page: currentPage,
                limit: 50,
                paymentStatus: statusFilter || undefined,
                search: searchTerm || undefined,
            });
            setRaters(response.data);
            setTotalPages(response.pagination.totalPages);
            setTotalItems(response.pagination.totalItems);
        } catch (err) {
            console.error('Failed to load raters:', err);
        } finally {
            setLoading(false);
        }
    }, [isAdmin, currentPage, statusFilter, searchTerm]);

    useEffect(() => {
        const load = async () => { await fetchRaters(); };
        load();
    }, [fetchRaters]);

    useEffect(() => {
        const unsubscribe = notificationService.subscribePaymentDetailsChanged(() => {
            void fetchRaters();
            if (selectedRater) {
                void adminService.getRaterPaymentDetails(selectedRater._id)
                    .then(response => setSelectedRater(response.data))
                    .catch(err => console.error('Failed to refresh rater payment details:', err));
            }
        });
        notificationService.connect();
        return unsubscribe;
    }, [fetchRaters, selectedRater]);

    const handleApprovePayment = async (rater: RaterPayment) => {
        setProcessingPayments(prev => new Set(prev).add(rater._id));
        try {
            const availableAmount = (rater.totalEarned || 0) - (rater.totalPaid || 0);
            if (rater.pendingPayoutReference) {
                const result = await adminService.verifyPayout(rater._id, rater.pendingPayoutReference);
                alert(`Paystack transfer status: ${result.data.status}`);
            } else {
                if (!rater.paymentDetails?.isVerified || !rater.paymentDetails?.bankCode || availableAmount <= 0) {
                    alert('A positive balance and Paystack-verified bank details are required.');
                    return;
                }
                if (!window.confirm(`Approve a Paystack transfer of ₦${availableAmount.toLocaleString()} to ${rater.paymentDetails.accountName} at ${rater.paymentDetails.bankName}?`)) {
                    return;
                }
                const result = await adminService.initiatePayout(rater._id, {
                    amount: availableAmount,
                    reason: `Admin-approved rater payout for ${rater.userName}`,
                });
                alert(result.data.status === 'success'
                    ? 'Paystack confirmed this payout.'
                    : `Payout submitted to Paystack. Reference: ${result.data.reference}`);
            }
            await fetchRaters();
        } catch (err) {
            console.error('Failed to process payment:', err);
            alert(err instanceof Error ? err.message : 'Failed to process Paystack payout');
        } finally {
            setProcessingPayments(prev => {
                const next = new Set(prev);
                next.delete(rater._id);
                return next;
            });
        }
    };

    const handleRecordManualPayment = async (rater: RaterPayment) => {
        const availableAmount = Math.max(0, (rater.totalEarned || 0) - (rater.totalPaid || 0));
        if (availableAmount <= 0 || rater.pendingPayoutReference || rater.paymentStatus === 'processing') return;
        if (!window.confirm(`Record ${formatNaira(availableAmount)} as paid to ${rater.userName} outside Paystack? This will mark the full outstanding balance as paid.`)) return;

        setProcessingPayments(prev => new Set(prev).add(rater._id));
        try {
            const result = await adminService.recordManualPayment(rater._id, `Manual payment approved by admin for ${rater.userName}`);
            alert(`${formatNaira(result.data.amount)} recorded as paid. Reference: ${result.data.reference}`);
            await fetchRaters();
        } catch (err) {
            console.error('Failed to record manual payment:', err);
            alert(err instanceof Error ? err.message : 'Failed to record manual payment');
        } finally {
            setProcessingPayments(prev => {
                const next = new Set(prev);
                next.delete(rater._id);
                return next;
            });
        }
    };

    const handleUpdatePaymentStatus = async (rater: RaterPayment) => {
        const paymentStatus = paymentStatusEdits[rater._id];
        if (!paymentStatus || paymentStatus === rater.paymentStatus) return;
        const reason = window.prompt(
            `Manually change ${rater.userName}'s payment status from ${rater.paymentStatus || 'pending'} to ${paymentStatus}. This does not change paid totals or Paystack records. Optional reason:`,
            '',
        );
        if (reason === null) return;

        setProcessingPayments(prev => new Set(prev).add(rater._id));
        try {
            await adminService.updateRaterPaymentStatus(rater._id, paymentStatus, reason);
            setPaymentStatusEdits(prev => {
                const next = { ...prev };
                delete next[rater._id];
                return next;
            });
            await fetchRaters();
        } catch (err) {
            console.error('Failed to manually update payment status:', err);
            alert(err instanceof Error ? err.message : 'Failed to update payment status');
        } finally {
            setProcessingPayments(prev => {
                const next = new Set(prev);
                next.delete(rater._id);
                return next;
            });
        }
    };

    const handleViewDetails = async (raterId: string) => {
        try {
            const response = await adminService.getRaterPaymentDetails(raterId);
            setSelectedRater(response.data);
            setShowDetailsModal(true);
        } catch (err) {
            console.error('Failed to load rater details:', err);
            alert('Failed to load rater details');
        }
    };

    const handleReviewManualDetails = async (decision: 'approved' | 'rejected') => {
        if (!selectedRater) return;
        const promptedNote = decision === 'rejected'
            ? window.prompt('Optional reason for rejecting these payment details:')
            : '';
        if (promptedNote === null) return;
        const note = promptedNote;
        try {
            const response = await adminService.reviewManualPaymentDetails(selectedRater._id, decision, note);
            setSelectedRater(response.data);
            await fetchRaters();
        } catch (err) {
            console.error('Failed to review manual payment details:', err);
            alert(err instanceof Error ? err.message : 'Unable to review payment details');
        }
    };

    if (!isAdmin) return null;

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Payments</h1>
                        <p className="text-slate-400 text-sm mt-1">Manage rater payment details and process payments</p>
                    </div>
                    <button
                        onClick={() => fetchRaters()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all text-sm"
                    >
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <GlassCard className="p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search by name or email..."
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-all text-sm"
                            />
                        </div>
                        <div>
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:outline-none focus:border-cyan-400 transition-all text-sm"
                            >
                                <option value="">All Statuses</option>
                                <option value="pending">Pending</option>
                                <option value="processing">Processing</option>
                                <option value="paid">Paid</option>
                                <option value="failed">Failed</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => { setSearchTerm(''); setStatusFilter(''); setCurrentPage(1); }}
                                className="px-4 py-2 bg-slate-800/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all text-sm"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </GlassCard>

                {/* Stats */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    <GlassCard className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">{totalItems}</div>
                        <div className="text-xs text-slate-400">Total Raters</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-2xl font-bold text-cyan-400">
                            {raters.reduce((sum, r) => sum + (r.totalEarned || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">Total Earned</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {raters.reduce((sum, r) => sum + (r.totalPaid || 0), 0).toLocaleString()}
                        </div>
                        <div className="text-xs text-slate-400">Total Paid</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-2xl font-bold text-yellow-400">
                            {raters.filter(r => r.paymentStatus === 'pending').length}
                        </div>
                        <div className="text-xs text-slate-400">Pending Payouts</div>
                    </GlassCard>
                </div>

                {/* Raters Table */}
                <GlassCard className="p-6" delay={0.2}>
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : raters.length === 0 ? (
                        <div className="text-center py-8 text-slate-400">
                            <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No raters found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-white/10">
                                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Rater</th>
                                        <th className="text-left py-3 px-4 text-slate-300 font-semibold">Proxy</th>
                                        <th className="text-right py-3 px-4 text-slate-300 font-semibold">Earned</th>
                                        <th className="text-right py-3 px-4 text-slate-300 font-semibold">Paid</th>
                                        <th className="text-center py-3 px-4 text-slate-300 font-semibold">Status</th>
                                        <th className="text-right py-3 px-4 text-slate-300 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {raters.map((rater) => (
                                        <tr key={rater._id} className="border-b border-white/5 hover:bg-white/5 transition-all">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                                                        {(rater.userName || rater.email || 'U').slice(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-white">{rater.userName || rater.email}</div>
                                                        <div className="text-xs text-slate-500">{rater.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-slate-300">{rater.proxy || 'N/A'}</td>
                                            <td className="py-3 px-4 text-right text-cyan-400">
                                                {formatNaira(rater.totalEarned || 0)}
                                            </td>
                                            <td className="py-3 px-4 text-right text-green-400">
                                                {formatNaira(rater.totalPaid || 0)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${STATUS_COLORS[rater.paymentStatus] || STATUS_COLORS.pending}`}>
                                                    {STATUS_ICONS[rater.paymentStatus] || STATUS_ICONS.pending}
                                                    {rater.paymentStatus || 'pending'}
                                                </div>
                                                <div className="mt-2 flex items-center gap-1.5">
                                                    <select
                                                        aria-label={`Set payment status for ${rater.userName}`}
                                                        value={paymentStatusEdits[rater._id] || rater.paymentStatus || 'pending'}
                                                        onChange={(event) => setPaymentStatusEdits(prev => ({
                                                            ...prev,
                                                            [rater._id]: event.target.value as RaterPayment['paymentStatus'],
                                                        }))}
                                                        className="rounded border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
                                                    >
                                                        <option value="pending">Pending</option>
                                                        <option value="processing">Processing</option>
                                                        <option value="paid">Paid</option>
                                                        <option value="failed">Failed</option>
                                                    </select>
                                                    {paymentStatusEdits[rater._id] && paymentStatusEdits[rater._id] !== rater.paymentStatus && (
                                                        <button
                                                            type="button"
                                                            onClick={() => void handleUpdatePaymentStatus(rater)}
                                                            disabled={processingPayments.has(rater._id)}
                                                            className="rounded bg-indigo-500/20 px-2 py-1 text-xs text-indigo-200 hover:bg-indigo-500/30 disabled:opacity-50"
                                                            title="Manually override status; payment totals and Paystack records are unchanged"
                                                        >
                                                            {processingPayments.has(rater._id) ? 'Saving…' : 'Save'}
                                                        </button>
                                                    )}
                                                </div>
                                                {rater.paymentDetails?.method === 'manual' && (
                                                    <div className="mt-1 text-xs text-amber-300">
                                                        Details {rater.paymentDetails.verificationStatus?.replace('_', ' ') || 'pending review'}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleViewDetails(rater._id)}
                                                        className="px-2.5 py-1.5 text-xs bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all"
                                                        title="View Details"
                                                    >
                                                        <FileText size={14} />
                                                    </button>
                                                    {(rater.totalEarned || 0) > (rater.totalPaid || 0) && (
                                                        <>
                                                            <button
                                                                onClick={() => handleApprovePayment(rater)}
                                                                disabled={processingPayments.has(rater._id) || (rater.paymentStatus !== 'processing' && (!rater.paymentDetails?.isVerified || !rater.paymentDetails?.bankCode || rater.totalEarned <= rater.totalPaid))}
                                                                className="px-2.5 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
                                                                title={rater.pendingPayoutReference ? 'Verify Paystack transfer' : 'Pay through Paystack'}
                                                            >
                                                                {processingPayments.has(rater._id) ? (
                                                                    <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                                                                ) : (
                                                                    <Banknote size={14} />
                                                                )}
                                                            </button>
                                                            <button
                                                                onClick={() => handleRecordManualPayment(rater)}
                                                                disabled={processingPayments.has(rater._id) || Boolean(rater.pendingPayoutReference) || rater.paymentStatus === 'processing'}
                                                                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/20 px-2.5 py-1.5 text-xs text-cyan-300 transition-all hover:bg-cyan-500/30 disabled:opacity-50"
                                                                title="Mark as paid manually without gateway verification"
                                                                aria-label={`Mark ${rater.userName} as paid manually`}
                                                            >
                                                                <CheckCircle size={14} />
                                                                <span className="hidden xl:inline">Mark paid</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/10">
                            <div className="text-xs text-slate-400">
                                Page {currentPage} of {totalPages} ({totalItems} total)
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1 || loading}
                                    className="px-3 py-1 text-xs bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-50"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || loading}
                                    className="px-3 py-1 text-xs bg-slate-800/50 text-slate-300 rounded-lg hover:bg-slate-700/50 transition-all disabled:opacity-50"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    )}
                </GlassCard>
            </div>

            {/* Details Modal */}
            {showDetailsModal && selectedRater && (
                <PaymentDetailsModal
                    rater={selectedRater}
                    onClose={() => setShowDetailsModal(false)}
                    onReviewManualDetails={handleReviewManualDetails}
                    onRecordManualPayment={() => {
                        void handleRecordManualPayment(selectedRater);
                        setShowDetailsModal(false);
                    }}
                    onApprovePayment={() => {
                        if (selectedRater._id) {
                            handleApprovePayment(selectedRater);
                        }
                        setShowDetailsModal(false);
                    }}
                />
            )}
        </div>
    );
};

const PaymentDetailsModal: React.FC<{
    rater: RaterPayment;
    onClose: () => void;
    onApprovePayment: () => void;
    onRecordManualPayment: () => void;
    onReviewManualDetails: (decision: 'approved' | 'rejected') => void;
}> = ({ rater, onClose, onApprovePayment, onRecordManualPayment, onReviewManualDetails }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 p-3 backdrop-blur-sm sm:items-center sm:p-5">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-white/10 bg-slate-900 p-4 shadow-2xl sm:max-h-[calc(100dvh-2.5rem)] sm:p-6"
            >
                <h3 className="text-lg font-semibold text-white mb-4">Rater Payment Details</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Payment method</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.paymentProvider || (rater.paymentDetails?.method === 'manual' ? 'Other payment method' : 'Paystack')}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Bank Name</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.bankName || 'Not set'}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Account holder</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.accountName || 'Not set'}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Account Number</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.accountNumber || 'Not set'}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Currency</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.currency || 'N/A'}</div>
                    </GlassCard>
                    {rater.paymentDetails?.country && <GlassCard className="p-4"><label className="text-xs text-slate-400 uppercase">Country</label><div className="text-white mt-1">{rater.paymentDetails.country}</div></GlassCard>}
                    {rater.paymentDetails?.routingNumber && <GlassCard className="p-4"><label className="text-xs text-slate-400 uppercase">Routing number</label><div className="text-white mt-1">{rater.paymentDetails.routingNumber}</div></GlassCard>}
                    {rater.paymentDetails?.iban && <GlassCard className="p-4"><label className="text-xs text-slate-400 uppercase">IBAN</label><div className="text-white mt-1">{rater.paymentDetails.iban}</div></GlassCard>}
                    {rater.paymentDetails?.swiftCode && <GlassCard className="p-4"><label className="text-xs text-slate-400 uppercase">SWIFT / BIC</label><div className="text-white mt-1">{rater.paymentDetails.swiftCode}</div></GlassCard>}
                    {rater.paymentDetails?.method === 'manual' && (
                        <GlassCard className="p-4 sm:col-span-2">
                            <label className="text-xs text-slate-400 uppercase">Details review</label>
                            <div className="text-white mt-1">{rater.paymentDetails.verificationStatus?.replace('_', ' ') || 'pending review'}</div>
                            {rater.paymentDetails.verificationNote && <div className="mt-1 text-sm text-slate-400">{rater.paymentDetails.verificationNote}</div>}
                        </GlassCard>
                    )}
                </div>

                <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
                    <GlassCard className="p-4 text-center">
                        <div className="text-xl font-bold text-cyan-400">{formatNaira(rater.totalEarned || 0)}</div>
                        <div className="text-xs text-slate-400">Total Earned</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-xl font-bold text-green-400">{formatNaira(rater.totalPaid || 0)}</div>
                        <div className="text-xs text-slate-400">Total Paid</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-sm font-semibold text-yellow-400 capitalize">
                            {rater.paymentStatus || 'pending'}
                        </div>
                        <div className="text-xs text-slate-400">Status</div>
                    </GlassCard>
                </div>

                <div className="flex flex-wrap justify-end gap-2 sm:gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all"
                    >
                        Close
                    </button>
                    {rater.paymentStatus !== 'paid' && rater.paymentDetails?.method !== 'manual' && (
                        <button
                            onClick={onApprovePayment}
                            disabled={rater.paymentStatus !== 'processing' && (!rater.paymentDetails?.isVerified || !rater.paymentDetails?.bankCode || rater.totalEarned <= rater.totalPaid)}
                            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                            <Banknote size={16} />
                            {rater.pendingPayoutReference ? 'Verify transfer' : 'Approve payment'}
                        </button>
                    )}
                    {rater.paymentStatus !== 'paid' && (rater.totalEarned || 0) > (rater.totalPaid || 0) && rater.paymentStatus !== 'processing' && !rater.pendingPayoutReference && (
                        <button
                            onClick={onRecordManualPayment}
                            className="inline-flex items-center gap-2 rounded-xl bg-cyan-500/20 px-4 py-2 text-cyan-200 transition-all hover:bg-cyan-500/30"
                            title="Mark as paid manually without gateway verification"
                        >
                            <CheckCircle size={16} />
                            Mark paid manually
                        </button>
                    )}
                    {rater.paymentDetails?.method === 'manual' && rater.paymentDetails.verificationStatus === 'pending_review' && (
                        <>
                            <button onClick={() => onReviewManualDetails('rejected')} className="px-4 py-2 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all">
                                Reject details
                            </button>
                            <button onClick={() => onReviewManualDetails('approved')} className="px-4 py-2 bg-cyan-500/20 text-cyan-200 rounded-xl hover:bg-cyan-500/30 transition-all">
                                Approve details
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AdminPayments;
