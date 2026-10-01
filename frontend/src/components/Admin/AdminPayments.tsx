import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/authService';
import { adminService, type RaterPayment } from '../../services/adminService';
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

    const handleMarkAsPaid = async (rater: RaterPayment) => {
        setProcessingPayments(prev => new Set(prev).add(rater._id));
        try {
            const availableAmount = (rater.totalEarned || 0) - (rater.totalPaid || 0);
            await adminService.processPayment(rater._id, {
                paymentStatus: 'paid',
                amount: availableAmount,
                notes: 'Manual payment processed by admin',
            });
            setRaters(prev => prev.map(r =>
                r._id === rater._id
                    ? { ...r, paymentStatus: 'paid', totalPaid: (r.totalPaid || 0) + availableAmount, lastPaymentDate: new Date().toISOString() }
                    : r
            ));
        } catch (err) {
            console.error('Failed to process payment:', err);
            alert('Failed to process payment');
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
                                                ${(rater.totalEarned || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right text-green-400">
                                                ${(rater.totalPaid || 0).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${STATUS_COLORS[rater.paymentStatus] || STATUS_COLORS.pending}`}>
                                                    {STATUS_ICONS[rater.paymentStatus] || STATUS_ICONS.pending}
                                                    {rater.paymentStatus || 'pending'}
                                                </div>
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
                                                    {rater.paymentStatus !== 'paid' && (
                                                        <button
                                                            onClick={() => handleMarkAsPaid(rater)}
                                                            disabled={processingPayments.has(rater._id)}
                                                            className="px-2.5 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-all disabled:opacity-50"
                                                            title="Mark as Paid"
                                                        >
                                                            {processingPayments.has(rater._id) ? (
                                                                <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <Banknote size={14} />
                                                            )}
                                                        </button>
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
                    onMarkPaid={() => {
                        if (selectedRater._id) {
                            handleMarkAsPaid(selectedRater);
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
    onMarkPaid: () => void;
}> = ({ rater, onClose, onMarkPaid }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-slate-900 rounded-2xl border border-white/10 p-6 w-full max-w-2xl mx-4"
            >
                <h3 className="text-lg font-semibold text-white mb-4">Rater Payment Details</h3>

                <div className="grid grid-cols-2 gap-4 mb-6">
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Bank Name</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.bankName || 'Not set'}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Account Number</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.accountNumber || 'Not set'}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Account Name</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.accountName || 'Not set'}</div>
                    </GlassCard>
                    <GlassCard className="p-4">
                        <label className="text-xs text-slate-400 uppercase">Currency</label>
                        <div className="text-white mt-1">{rater.paymentDetails?.currency || 'N/A'}</div>
                    </GlassCard>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-6">
                    <GlassCard className="p-4 text-center">
                        <div className="text-xl font-bold text-cyan-400">${rater.totalEarned || 0}</div>
                        <div className="text-xs text-slate-400">Total Earned</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-xl font-bold text-green-400">${rater.totalPaid || 0}</div>
                        <div className="text-xs text-slate-400">Total Paid</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-sm font-semibold text-yellow-400 capitalize">
                            {rater.paymentStatus || 'pending'}
                        </div>
                        <div className="text-xs text-slate-400">Status</div>
                    </GlassCard>
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-800/50 text-slate-300 rounded-xl hover:bg-slate-700/50 transition-all"
                    >
                        Close
                    </button>
                    {rater.paymentStatus !== 'paid' && (
                        <button
                            onClick={onMarkPaid}
                            className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30 transition-all flex items-center gap-2"
                        >
                            <Banknote size={16} />
                            Mark as Paid
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default AdminPayments;