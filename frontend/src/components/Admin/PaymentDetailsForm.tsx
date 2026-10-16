import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Building, User, CreditCard, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';
import { adminService, type PaymentBank } from '../../services/adminService';
import { authService } from '../../services/authService';

export const PaymentDetailsForm: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [banks, setBanks] = useState<PaymentBank[]>([]);
    const [accountVerified, setAccountVerified] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [paymentDetails, setPaymentDetails] = useState({
        bankName: '',
        bankCode: '',
        accountNumber: '',
        accountName: '',
        currency: 'NGN',
    });

    const fetchPaymentDetails = async () => {
        const [detailsResult, banksResult] = await Promise.allSettled([
                adminService.getPaymentDetails(),
                adminService.getPaymentBanks(),
        ]);
        const loadErrors: string[] = [];

        if (detailsResult.status === 'fulfilled') {
            const detailsResponse = detailsResult.value;
            if (detailsResponse.status === 'success' && detailsResponse.data?.paymentDetails) {
                const pd = detailsResponse.data.paymentDetails;
                setPaymentDetails({
                    bankName: pd.bankName || '',
                    bankCode: pd.bankCode || '',
                    accountNumber: pd.accountNumber || '',
                    accountName: pd.accountName || '',
                    currency: 'NGN',
                });
                setAccountVerified(Boolean(pd.isVerified && pd.bankCode));
            }
        } else {
            loadErrors.push(detailsResult.reason instanceof Error ? detailsResult.reason.message : 'Unable to load saved payment details');
        }

        if (banksResult.status === 'fulfilled') {
            setBanks(banksResult.value.data);
        } else {
            loadErrors.push(banksResult.reason instanceof Error ? banksResult.reason.message : 'Unable to load bank information from Paystack');
        }

        setError(loadErrors.join('. '));
        setLoading(false);
    };

    useEffect(() => {
        const load = async () => { await fetchPaymentDetails(); };
        load();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountVerified) {
            setError('Verify your bank account with Paystack before saving it.');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await adminService.updatePaymentDetails(paymentDetails);
            if (response.status === 'success') {
                const savedDetails = response.data.paymentDetails;
                setPaymentDetails({
                    bankName: savedDetails.bankName || '',
                    bankCode: savedDetails.bankCode || '',
                    accountNumber: savedDetails.accountNumber || '',
                    accountName: savedDetails.accountName || '',
                    currency: savedDetails.currency || 'NGN',
                });
                setAccountVerified(Boolean(savedDetails.isVerified && savedDetails.bankCode));
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

    const handleVerifyAccount = async () => {
        setVerifying(true);
        setError('');
        setSuccess('');
        setAccountVerified(false);
        try {
            const response = await adminService.resolvePaymentAccount(paymentDetails.accountNumber, paymentDetails.bankCode);
            setPaymentDetails((current) => ({
                ...current,
                accountNumber: response.data.accountNumber,
                accountName: response.data.accountName,
            }));
            setAccountVerified(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to verify this bank account');
        } finally {
            setVerifying(false);
        }
    };

    const handleBankChange = (bankCode: string) => {
        const bank = banks.find((item) => item.code === bankCode);
        setPaymentDetails((current) => ({
            ...current,
            bankCode,
            bankName: bank?.name || '',
            accountName: '',
        }));
        setAccountVerified(false);
        setError('');
        setSuccess('');
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
                            NGN {user?.totalEarned?.toLocaleString() || '0'}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">Total Earned</div>
                    </GlassCard>
                    <GlassCard className="p-4 text-center">
                        <div className="text-2xl font-bold text-green-400">
                            NGN {user?.totalPaid?.toLocaleString() || '0'}
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
                            <label htmlFor="payment-bank" className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">
                                Nigerian bank
                            </label>
                            <div className="relative">
                                <select
                                    id="payment-bank"
                                    required
                                    value={paymentDetails.bankCode}
                                    onChange={(e) => handleBankChange(e.target.value)}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white focus:bg-white/10 focus:border-cyan-400 transition-all duration-200 text-sm outline-none"
                                >
                                    <option value="" className="text-gray-900">Select your bank</option>
                                    {banks.map((bank) => (
                                        <option key={bank.code} value={bank.code} className="text-gray-900">{bank.name}</option>
                                    ))}
                                </select>
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
                                    inputMode="numeric"
                                    autoComplete="off"
                                    maxLength={10}
                                    value={paymentDetails.accountNumber}
                                    onChange={(e) => {
                                        setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value.replace(/\D/g, '').slice(0, 10), accountName: '' });
                                        setAccountVerified(false);
                                    }}
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="10-digit account number"
                                />
                                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                            <button
                                type="button"
                                onClick={handleVerifyAccount}
                                disabled={verifying || paymentDetails.accountNumber.length !== 10 || !paymentDetails.bankCode}
                                className="mt-2 inline-flex items-center gap-2 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-xs font-semibold text-cyan-200 transition hover:bg-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {verifying ? 'Verifying with Paystack…' : 'Verify bank account'}
                            </button>
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
                                    readOnly
                                    className="block w-full px-4 py-3 pl-10 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:bg-white/10 focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/20 transition-all duration-200 text-sm outline-none"
                                    placeholder="Verified account name appears here"
                                />
                                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                            </div>
                            {accountVerified && (
                                <p className="mt-2 flex items-center gap-1.5 text-xs text-emerald-300">
                                    <ShieldCheck size={14} /> Account verified by Paystack
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase mb-1.5 ml-1">Payout currency</label>
                            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                                <ShieldCheck className="h-4 w-4 text-cyan-300" />
                                NGN · Nigerian Naira
                            </div>
                        </div>

                        <div className="pt-4">
                            <motion.button
                                type="submit"
                                disabled={saving || !accountVerified || banks.length === 0}
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
