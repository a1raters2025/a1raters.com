import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Building, User, CreditCard, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';
import { adminService, type PaymentBank } from '../../services/adminService';
import { authService } from '../../services/authService';

type PaymentFormValues = {
    bankName: string;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    currency: string;
    paymentProvider: string;
    paypalEmail: string;
    routingNumber: string;
    iban: string;
    swiftCode: string;
    country: string;
    verificationStatus: '' | 'pending_review' | 'approved' | 'rejected';
    verificationNote: string;
};

export const PaymentDetailsForm: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [banks, setBanks] = useState<PaymentBank[]>([]);
    const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'manual' | 'paypal'>('paystack');
    const [accountVerified, setAccountVerified] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [paymentDetails, setPaymentDetails] = useState<PaymentFormValues>({
        bankName: '',
        bankCode: '',
        accountNumber: '',
        accountName: '',
        currency: 'NGN',
        paymentProvider: '',
        paypalEmail: '',
        routingNumber: '',
        iban: '',
        swiftCode: '',
        country: '',
        verificationStatus: '',
        verificationNote: '',
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
                setPaymentMethod(pd.method === 'manual' || pd.method === 'paypal' ? pd.method : 'paystack');
                setPaymentDetails({
                    bankName: pd.bankName || '',
                    bankCode: pd.bankCode || '',
                    accountNumber: pd.accountNumber || '',
                    accountName: pd.accountName || '',
                    currency: pd.currency || 'NGN',
                    paymentProvider: pd.paymentProvider || '',
                    paypalEmail: pd.paypalEmail || '',
                    routingNumber: pd.routingNumber || '',
                    iban: pd.iban || '',
                    swiftCode: pd.swiftCode || '',
                    country: pd.country || '',
                    verificationStatus: pd.verificationStatus || '',
                    verificationNote: pd.verificationNote || '',
                });
                setAccountVerified(Boolean(pd.isVerified && (pd.method !== 'manual' && pd.bankCode)));
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
        if (paymentMethod === 'paystack' && !accountVerified) {
            setError('Verify your bank account with Paystack before saving it.');
            return;
        }
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await adminService.updatePaymentDetails({
                method: paymentMethod,
                bankName: paymentDetails.bankName,
                bankCode: paymentDetails.bankCode,
                accountNumber: paymentDetails.accountNumber,
                accountName: paymentDetails.accountName,
                currency: paymentDetails.currency,
                paymentProvider: paymentDetails.paymentProvider,
                paypalEmail: paymentDetails.paypalEmail,
                routingNumber: paymentDetails.routingNumber,
                iban: paymentDetails.iban,
                swiftCode: paymentDetails.swiftCode,
                country: paymentDetails.country,
            });
            if (response.status === 'success') {
                const savedDetails = response.data.paymentDetails;
                setPaymentMethod(savedDetails.method === 'manual' || savedDetails.method === 'paypal' ? savedDetails.method : 'paystack');
                setPaymentDetails({
                    bankName: savedDetails.bankName || '',
                    bankCode: savedDetails.bankCode || '',
                    accountNumber: savedDetails.accountNumber || '',
                    accountName: savedDetails.accountName || '',
                    currency: savedDetails.currency || 'NGN',
                    paymentProvider: savedDetails.paymentProvider || '',
                    paypalEmail: savedDetails.paypalEmail || '',
                    routingNumber: savedDetails.routingNumber || '',
                    iban: savedDetails.iban || '',
                    swiftCode: savedDetails.swiftCode || '',
                    country: savedDetails.country || '',
                    verificationStatus: savedDetails.verificationStatus || '',
                    verificationNote: savedDetails.verificationNote || '',
                });
                setAccountVerified(Boolean(savedDetails.isVerified && savedDetails.method !== 'manual' && savedDetails.bankCode));
                setSuccess(paymentMethod !== 'paystack'
                    ? 'Payment details submitted for administrator review.'
                    : 'Payment details updated successfully');
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

    const handleMethodChange = (method: 'paystack' | 'manual' | 'paypal') => {
        setPaymentMethod(method);
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
                            <span className="block text-xs font-bold text-slate-300 uppercase mb-2 ml-1">Payment method</span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleMethodChange('paystack')}
                                    className={`rounded-xl border p-4 text-left transition ${paymentMethod === 'paystack' ? 'border-cyan-400 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
                                >
                                    <span className="block font-semibold">Paystack · Nigerian bank</span>
                                    <span className="mt-1 block text-xs text-slate-400">Verify an NGN account automatically</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMethodChange('manual')}
                                    className={`rounded-xl border p-4 text-left transition ${paymentMethod === 'manual' ? 'border-cyan-400 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
                                >
                                    <span className="block font-semibold">Other payment details</span>
                                    <span className="mt-1 block text-xs text-slate-400">Submit an account for administrator review</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleMethodChange('paypal')}
                                    className={`rounded-xl border p-4 text-left transition ${paymentMethod === 'paypal' ? 'border-cyan-400 bg-cyan-400/10 text-white' : 'border-white/10 bg-white/5 text-slate-300'}`}
                                >
                                    <span className="block font-semibold">PayPal</span>
                                    <span className="mt-1 block text-xs text-slate-400">Submit a PayPal email for administrator review</span>
                                </button>
                            </div>
                        </div>

                        {paymentMethod === 'paystack' ? (
                        <>
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
                        </>
                        ) : paymentMethod === 'manual' ? (
                            <>
                                <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                                    These details will be saved as unverified and sent to an administrator for review. They cannot receive automatic Paystack transfers.
                                </div>
                                {paymentDetails.verificationStatus && (
                                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                                        Review status: <span className="font-semibold">{paymentDetails.verificationStatus.replace('_', ' ')}</span>
                                        {paymentDetails.verificationNote && <p className="mt-1 text-slate-400">{paymentDetails.verificationNote}</p>}
                                        {paymentDetails.verificationStatus === 'approved' && <p className="mt-1 text-slate-400">An administrator approved these details. Payouts using this method are handled manually.</p>}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Payment method / provider
                                        <input required maxLength={100} value={paymentDetails.paymentProvider} onChange={(e) => setPaymentDetails((current) => ({ ...current, paymentProvider: e.target.value }))} placeholder="Bank transfer, Wise, etc." className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Account holder name
                                        <input required maxLength={160} value={paymentDetails.accountName} onChange={(e) => setPaymentDetails((current) => ({ ...current, accountName: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Account number
                                        <input required maxLength={100} autoComplete="off" value={paymentDetails.accountNumber} onChange={(e) => setPaymentDetails((current) => ({ ...current, accountNumber: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Bank name
                                        <input maxLength={100} value={paymentDetails.bankName} onChange={(e) => setPaymentDetails((current) => ({ ...current, bankName: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Routing number
                                        <input maxLength={100} value={paymentDetails.routingNumber} onChange={(e) => setPaymentDetails((current) => ({ ...current, routingNumber: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        IBAN
                                        <input maxLength={100} autoComplete="off" value={paymentDetails.iban} onChange={(e) => setPaymentDetails((current) => ({ ...current, iban: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        SWIFT / BIC
                                        <input maxLength={50} value={paymentDetails.swiftCode} onChange={(e) => setPaymentDetails((current) => ({ ...current, swiftCode: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Country
                                        <input required maxLength={100} value={paymentDetails.country} onChange={(e) => setPaymentDetails((current) => ({ ...current, country: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Currency (3-letter code)
                                        <input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={paymentDetails.currency} onChange={(e) => setPaymentDetails((current) => ({ ...current, currency: e.target.value.toUpperCase() }))} placeholder="USD" className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal uppercase text-white outline-none focus:border-cyan-400" />
                                    </label>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 p-3 text-sm text-amber-100">
                                    PayPal details are saved as unverified and sent to an administrator for review. PayPal payouts are handled manually after approval.
                                </div>
                                {paymentDetails.verificationStatus && (
                                    <div className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                                        Review status: <span className="font-semibold">{paymentDetails.verificationStatus.replace('_', ' ')}</span>
                                        {paymentDetails.verificationNote && <p className="mt-1 text-slate-400">{paymentDetails.verificationNote}</p>}
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        PayPal email
                                        <input required type="email" maxLength={254} autoComplete="email" value={paymentDetails.paypalEmail} onChange={(e) => setPaymentDetails((current) => ({ ...current, paypalEmail: e.target.value }))} placeholder="name@example.com" className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Account holder name
                                        <input maxLength={160} value={paymentDetails.accountName} onChange={(e) => setPaymentDetails((current) => ({ ...current, accountName: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Country
                                        <input required maxLength={100} value={paymentDetails.country} onChange={(e) => setPaymentDetails((current) => ({ ...current, country: e.target.value }))} className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal normal-case text-white outline-none focus:border-cyan-400" />
                                    </label>
                                    <label className="text-xs font-bold text-slate-300 uppercase">
                                        Currency (3-letter code)
                                        <input required minLength={3} maxLength={3} pattern="[A-Za-z]{3}" value={paymentDetails.currency} onChange={(e) => setPaymentDetails((current) => ({ ...current, currency: e.target.value.toUpperCase() }))} placeholder="USD" className="mt-1.5 block w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-normal uppercase text-white outline-none focus:border-cyan-400" />
                                    </label>
                                </div>
                            </>
                        )}

                        <div className="pt-4">
                            <motion.button
                                type="submit"
                                disabled={saving || (paymentMethod === 'paystack' && (!accountVerified || banks.length === 0))}
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
