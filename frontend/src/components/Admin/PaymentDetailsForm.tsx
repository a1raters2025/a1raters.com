import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Building, User, CreditCard, DollarSign } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';
import { adminService } from '../../services/adminService';
import { authService } from '../../services/authService';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN', 'CAD', 'AUD', 'JPY'];

export const PaymentDetailsForm: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [paymentDetails, setPaymentDetails] = useState({
        bankName: '',
        accountNumber: '',
        accountName: '',
        currency: 'USD',
    });

    const fetchPaymentDetails = async () => {
        try {
            const response = await adminService.getPaymentDetails();
            if (response.status === 'success' && response.data?.paymentDetails) {
                const pd = response.data.paymentDetails;
                setPaymentDetails({
                    bankName: pd.bankName || '',
                    accountNumber: pd.accountNumber || '',
                    accountName: pd.accountName || '',
                    currency: pd.currency || 'USD',
                });
            }
        } catch (err) {
            console.error('Failed to fetch payment details:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const load = async () => { await fetchPaymentDetails(); };
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await adminService.updatePaymentDetails(paymentDetails);
            if (response.status === 'success') {
                setSuccess('Payment details updated successfully');
            } else {
                setError(response.message || 'Failed to update payment details');
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to update payment details');
        } finally {
            setSaving(false);
        }
    };

    const user = authService.getUser();

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6">
            <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-white">Payment Details</h1>
                    <p className="text-slate-400 text-sm mt-1">Add your bank details to receive payments</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <GlassCard className="p-4 text-center">
                        <div className="text-2xl font-bold text-cyan-400">
                            {user?.totalEarned?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Total Earned</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                            {user?.totalPaid?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Total Paid</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-sm font-semibold capitalize text-slate-300">
                            {(user?.paymentStatus || 'pending').replace('_', ' ')}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Payment Status</div>
                    </GlassCard>
                </div>

                <GlassCard className="p-6">
                    {error && (
                        <div className="p-3 mb-4 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="p-3 mb-4 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-sm">
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">
                                Bank Name
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={paymentDetails.bankName}
                                    onChange={(e) => setPaymentDetails({ ...paymentDetails, bankName: e.target.value })}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="e.g. Chase Bank, Bank of America"
                                />
                                <Building className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">
                                Account Number
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={paymentDetails.accountNumber}
                                    onChange={(e) => setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value })}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="Your bank account number"
                                />
                                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">
                                Account Name
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    required
                                    value={paymentDetails.accountName}
                                    onChange={(e) => setPaymentDetails({ ...paymentDetails, accountName: e.target.value })}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="Full name on the bank account"
                                />
                                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">
                                Currency
                            </label>
                            <div className="relative">
                                <select
                                    value={paymentDetails.currency}
                                    onChange={(e) => setPaymentDetails({ ...paymentDetails, currency: e.target.value })}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-cyan-400 transition-all duration-200 text-sm outline-none appearance-none"
                                >
                                    {CURRENCIES.map((c) => (
                                        <option key={c} value={c} className="text-gray-900">{c}</option>
                                    ))}
                                </select>
                                <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                        </div>

                        <div className="pt-4">
                            <motion.button
                                type="submit"
                                disabled={saving}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-cyan-500 hover:bg-cyan-600 transition-all duration-200 shadow-lg ${
                                    saving ? 'opacity-80 cursor-wait' : ''
                                }`}
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        Save Payment Details
                                    </>
                                )}
                            </motion.button>
                        </div>
                    </form>
                </GlassCard>
            </div>
        </div>
    );
};

export default PaymentDetailsForm;
