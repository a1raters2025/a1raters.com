import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from '../../services/authService';
import type { RequestReport } from '../../services/reportService';
import { reportService } from '../../services/reportService';
import { invoiceService, type Invoice, type ManualReportItem } from '../../services/invoiceService';
import { PasswordField } from '../UI/PasswordField';
import { Home, Edit2, Trash2, Check, X, ArrowRight, ArrowLeft, AlertTriangle, UserX, FileText, Send, Plus, Mail, Briefcase, Shield, UserPlus, Clock } from 'lucide-react';

interface AccountStatusSummary {
    email: string;
    hasRestricted: boolean;
    hasSacked: boolean;
}

export const ReportHistory: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const user = authService.getUser();
    const isAdmin = user?.role === 'admin';

    // Super Client Logic (Legacy support + Godswill Admin View)
    const SUPER_CLIENT_EMAIL = 'godswillobayi@gmail.com';
    const clientEmail = localStorage.getItem('a1_client_email');
    const isSuperClient = clientEmail === SUPER_CLIENT_EMAIL;

    // Effective Admin viewing all accounts
    const canViewAllAccounts = isAdmin || isSuperClient;

    const [reports, setReports] = useState<RequestReport[]>([]);
    const [activeTab, setActiveTab] = useState<'reports' | 'invoices'>('reports');
    const [invoices, setInvoices] = useState<Invoice[]>([]); // New Invoices State
    const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
    const [selectedEmail, setSelectedEmail] = useState<string | null>(null);

    const [accountList, setAccountList] = useState<AccountStatusSummary[]>([]);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<RequestReport>>({});

    // Invoice/Dispute State
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [invoiceType, setInvoiceType] = useState<'Invoice' | 'Dispute'>('Invoice');
    const [invoiceMessage, setInvoiceMessage] = useState('');
    const [editingInvoiceId, setEditingInvoiceId] = useState<number | null>(null);

    // Batch Manual Entry State
    const [batchItems, setBatchItems] = useState<ManualReportItem[]>([]);
    const [currentItem, setCurrentItem] = useState<Partial<ManualReportItem>>({
        profileName: '',
        email: '',
        proxy: '',
        dateRange: '',
        hours: ''
    });

    const [addTrainingBonus, setAddTrainingBonus] = useState(false);
    const [addAuditorBonus, setAddAuditorBonus] = useState(false);

    // Admin View Expanded Invoice State
    const [expandedInvoiceId, setExpandedInvoiceId] = useState<number | null>(null);

    // Month Navigation State
    const [viewDate, setViewDate] = useState(new Date());
    const [weekFilter, setWeekFilter] = useState<'All' | '1' | '2' | '3' | '4'>('All');

    const PROXIES = ['US', 'UK', 'Japan', 'China', 'Germany', 'France', 'Canada', 'Australia'];

    const [showRegisterModal, setShowRegisterModal] = useState(false);
    const [newRaterForm, setNewRaterForm] = useState({
        username: '',
        email: '',
        password: '',
        evaluation: 'Core',
        proxy: 'US'
    });

    const handleAdminRegister = () => {
        if (!newRaterForm.username || !newRaterForm.email) {
            alert('Username and Email are required.');
            return;
        }
        try {
            void authService.register(
                newRaterForm.username,
                newRaterForm.password,
                newRaterForm.email,
                newRaterForm.evaluation,
                newRaterForm.proxy
            );
            alert('User registered successfully!');
            setShowRegisterModal(false);
            setNewRaterForm({ username: '', email: '', password: '', evaluation: 'Core', proxy: 'US' });
            fetchInvoices(); // Refresh list to show new user
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : 'Registration failed');
        }
    };

    const fetchInvoices = useCallback(async () => {
        // 1. Admin / Super Client Logic
        if (canViewAllAccounts) {
            if (viewMode === 'list') {
                const all = await reportService.getAllReports();
                const statusMap = new Map<string, { hasRestricted: boolean, hasSacked: boolean }>();

                all.forEach(r => {
                    const current = statusMap.get(r.email) || { hasRestricted: false, hasSacked: false };
                    if (r.status === 'Restricted') current.hasRestricted = true;
                    if (r.status === 'Sacked') current.hasSacked = true;
                    statusMap.set(r.email, current);
                });

                // Also ensure verified raters are in the list even if no reports yet
                if (isAdmin) {
                    const allUsers = authService.getAllUsers();
                    allUsers.forEach(u => {
                        if (!statusMap.has(u.username) && u.username !== user.username) {
                            statusMap.set(u.username, { hasRestricted: false, hasSacked: false });
                        }
                    });
                }

                const summaryList: AccountStatusSummary[] = Array.from(statusMap.entries()).map(([email, status]) => ({
                    email,
                    ...status
                }));

                setAccountList(summaryList);
            } else if (viewMode === 'detail' && selectedEmail) {
                // Try getting by email first (legacy), then by rater name
                let found = await reportService.getReportsByEmail(selectedEmail);
                if (found.length === 0) {
                    found = await reportService.getReportsByRater(selectedEmail);
                }
                setReports(found);
            }
        }
        // 2. Client Logic
        else if (clientEmail) {
            setReports(await reportService.getReportsByEmail(clientEmail));
        }
        // 3. Rater Logic
        else if (user) {
            setReports(await reportService.getReportsByRater(user.username));
        } else {
            navigate('/login');
        }

        // Fetch Invoices
        // This was missing in the logic above, we should probably fetch invoices too
        // For now, let's assume invoiceService.getAllInvoices or similar is needed if we want to show them
        // The original code had setInvoices state but didn't populate it in fetchInvoices logic shown.
        // Let's add invoice fetching:
        const allInvoices = await invoiceService.getAllInvoices();
        setInvoices(allInvoices);

    // viewMode intentionally omitted from deps to avoid circular dependency; init handled in separate effect
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, isAdmin, navigate, clientEmail, isSuperClient, selectedEmail, canViewAllAccounts]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    // For raters, force detail view (set once on mount, not reactively)
    useEffect(() => {
        if (user && !canViewAllAccounts) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setViewMode('detail');
        }
    }, [user, canViewAllAccounts]);

    // Auto-switch specific month if reports exist but none in current view
    useEffect(() => {
        if (reports.length > 0) {
            const hasCurrentMonth = reports.some(r => {
                const d = new Date(r.date);
                return d.getMonth() === viewDate.getMonth() && d.getFullYear() === viewDate.getFullYear();
            });

            if (!hasCurrentMonth) {
                // Find most recent
                const sorted = [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                if (sorted.length > 0) {
                    // Derived view date from reports — initialize the month view on first load.
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setViewDate(new Date(sorted[0].date));
                }
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [reports]);

    const handleDelete = (id: number) => {
        const report = reports.find(r => r.id === id);
        const isOwner = report?.submittedBy && user?.username;
        const isRaterOwner = isOwner && report?.submittedBy?.userName === user?.username;
        if (!isAdmin && !isRaterOwner) return;
        const reason = isAdmin
            ? `Admin deleted report for ${report?.profileName}`
            : 'Rater deleted report for self-correction/resubmission';
        if (window.confirm('Are you sure you want to delete this report? This action is logged.')) {
            reportService.deleteReport(id, reason);
            setReports(prev => prev.filter(r => r.id !== id));
        }
    };

    const startEdit = (report: RequestReport) => {
        if (!isAdmin) return;
        setEditingId(report.id ?? null);
        setEditForm(report);
    };

    const saveEdit = () => {
        if (!editingId || !editForm) return;
        const original = reports.find(r => r.id === editingId);
        if (original) {
            const updated = { ...original, ...editForm } as RequestReport;
            reportService.updateReport(updated, 'Admin correction');
            setReports(prev => prev.map(r => r.id === editingId ? updated : r));
        }
        setEditingId(null);
        setEditForm({});
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const handleSelectEmail = (email: string) => {
        setSelectedEmail(email);
        setViewMode('detail');
    };

    const handleBackToList = () => {
        setSelectedEmail(null);
        setViewMode('list');
        setReports([]);
    };

    const nextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const prevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    // Bank Details State
    const [bankDetails, setBankDetails] = useState({
        bankName: '',
        accountNumber: '',
        accountName: ''
    });

    // ... (existing code for dates and months)

// Auto-open Modal from Dashboard
    const handleOpenInvoice = (type: 'Invoice' | 'Dispute') => {
        setInvoiceType(type);
        setInvoiceMessage('');
        setBatchItems([]);
        setCurrentItem({ profileName: '', email: '', proxy: '', dateRange: '', hours: '' });
        setBankDetails({ bankName: '', accountNumber: '', accountName: '' }); // Reset bank details
        setAddTrainingBonus(false);
        setAddAuditorBonus(false);
        setShowInvoiceModal(true);
    };

    // Auto-open Modal from Dashboard
    useEffect(() => {
        if (location.state && (location.state as Record<string, unknown>).openInvoice) {
            // Initialize invoice modal from navigation state on mount.
            // eslint-disable-next-line react-hooks/set-state-in-effect
            handleOpenInvoice('Invoice');
            // Clear state so it doesn't reopen on refresh?
            // Navigate replace to clear state
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location]);

    const addBatchItem = () => {
        if (!currentItem.profileName || !currentItem.email || !currentItem.hours) {
            return alert('Please fill in at least Profile Name, Email, and Hours.');
        }
        setBatchItems([
            ...batchItems,
            { ...currentItem, id: Date.now() } as ManualReportItem
        ]);
        setCurrentItem({
            profileName: '',
            email: '',
            proxy: '',
            dateRange: '',
            hours: ''
        });
    };

    const removeBatchItem = (id: number) => {
        setBatchItems(batchItems.filter(item => item.id !== id));
    };

    const handleSubmitInvoice = () => {
        if (!user) return;

        // Validation
        if (invoiceType === 'Dispute' && !invoiceMessage) {
            return alert('Please enter a description for the dispute.');
        }

        if (invoiceType === 'Invoice') {
            if (batchItems.length === 0) {
                return alert('Please add at least one report entry.');
            }
            if (!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName) {
                return alert('Please fill in all Account Details (Bank Name, Account Number, Full Name).');
            }
        }

        const bonuses = [];
        if (addTrainingBonus) bonuses.push({ type: 'Training' as const, amount: 10000 });
        if (addAuditorBonus) bonuses.push({ type: 'Auditor' as const, amount: 8000 });

        if (editingInvoiceId) {
            // Update Existing Invoice
            const existing = invoices.find(i => i.id === editingInvoiceId);
            if (existing) {
                invoiceService.updateInvoice({
                    ...existing,
                    type: invoiceType,
                    message: invoiceMessage,
                    items: invoiceType === 'Invoice' ? batchItems : undefined,
                    bonuses: invoiceType === 'Invoice' ? bonuses : undefined,
                    bankDetails: invoiceType === 'Invoice' ? bankDetails : undefined,
                    // Don't change date or raterName
                });
                alert('Invoice updated successfully!');
            }
        } else {
            // Create New Invoice
            invoiceService.createInvoice({
                raterName: user.username,
                type: invoiceType,
                message: invoiceMessage,
                items: invoiceType === 'Invoice' ? batchItems : undefined,
                bonuses: invoiceType === 'Invoice' ? bonuses : undefined,
                bankDetails: invoiceType === 'Invoice' ? bankDetails : undefined,
                month: viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })
            });
            alert(`${invoiceType} submitted successfully! Waiting for Admin Approval.`);
        }

        setShowInvoiceModal(false);
        setEditingInvoiceId(null);
        fetchInvoices(); // Refresh list
    };

    // ... (rest of the file)



    const handleApproveInvoice = (id: number, approve: boolean) => {
        if (!isAdmin) return;

        if (approve) {
            const invoice = invoices.find(i => i.id === id);
            if (invoice && invoice.items && invoice.items.length > 0) {
                // Convert Invoice Items to Reports
                const newReports: Omit<RequestReport, 'submissionTime'>[] = invoice.items.map(item => ({
                    id: Date.now() + Math.random(), // Ensure unique ID
                    raterName: invoice.raterName,
                    profileName: item.profileName,
                    email: item.email,
                    category: 'Manual Invoice',
                    proxy: item.proxy || 'N/A',
                    status: 'Active',
                    tasksWorked: '0',
                    hoursWorked: item.hours,
                    date: invoice.date,
                    paymentDetails: invoice.bankDetails,
                }));
                reportService.saveReports(newReports);
            }
        }

        invoiceService.updateInvoiceStatus(id, approve ? 'Approved' : 'Rejected');
        fetchInvoices();
    };

    const toggleExpandInvoice = (id: number) => {
        if (expandedInvoiceId === id) setExpandedInvoiceId(null);
        else setExpandedInvoiceId(id);
    };

    const handleDeleteInvoice = (id: number) => {
        // Admin can delete anything. Rater can only delete their own Pending invoices.
        if (!isAdmin) {
            const inv = invoices.find(i => i.id === id);
            if (!inv || inv.raterName !== user?.username || inv.status !== 'Pending') return;
        }

        if (window.confirm('Are you sure you want to delete this invoice?')) {
            invoiceService.deleteInvoice(id);
            fetchInvoices();
        }
    };

    const startEditInvoice = (invoice: Invoice) => {
        if (!isAdmin) return;
        setEditingInvoiceId(invoice.id ?? null);
        setInvoiceType(invoice.type);
        setInvoiceMessage(invoice.message || '');
        setBatchItems(invoice.items || []);

        if (invoice.bankDetails) {
            setBankDetails(invoice.bankDetails);
        } else {
            setBankDetails({ bankName: '', accountNumber: '', accountName: '' });
        }

        // Handle Bonuses
        setAddTrainingBonus(false);
        setAddAuditorBonus(false);
        if (invoice.bonuses) {
            invoice.bonuses.forEach(b => {
                if (b.type === 'Training') setAddTrainingBonus(true);
                if (b.type === 'Auditor') setAddAuditorBonus(true);
            });
        }

        setShowInvoiceModal(true);
    };


    // Derived State
    const monthName = viewDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    const filteredReports = reports.filter(r => {
        const rDate = new Date(r.date);
        const inMonth = rDate.getMonth() === viewDate.getMonth() && rDate.getFullYear() === viewDate.getFullYear();
        if (!inMonth) return false;

        if (weekFilter !== 'All') {
            const day = rDate.getDate();
            if (weekFilter === '1') return day >= 1 && day <= 7;
            if (weekFilter === '2') return day >= 8 && day <= 14;
            if (weekFilter === '3') return day >= 15 && day <= 21;
            if (weekFilter === '4') return day >= 22;
        }
        return true;
    });

    const totalHoursNum = filteredReports.reduce((sum, r) => sum + (Number(r.hoursWorked) || 0), 0);
    const totalHours = totalHoursNum.toFixed(2);

    // Payment Calculation: 2000 per hour (Automated)
    let totalPaymentNum = totalHoursNum * 2000;

    // Add Approved Invoices for this month
    const approvedInvoices = invoices.filter(i =>
        i.status === 'Approved' &&
        i.type === 'Invoice' &&
        i.month === monthName
    );

    approvedInvoices.forEach(inv => {
        // Exclude Paid invoices from total due
        if (inv.status === 'Paid') return;

        if (inv.amount) totalPaymentNum += Number(inv.amount);
        if (inv.items) {
            inv.items.forEach(item => totalPaymentNum += (Number(item.hours) * 2000));
        }
        if (inv.bonuses) {
            inv.bonuses.forEach(bonus => totalPaymentNum += bonus.amount);
        }
    });

    // Exclude Paid Reports from calculation if we counted them in totalHoursNum
    // The current totalHoursNum logic sums Active items. If report status is 'Paid', we should verify.
    // filteredReports above does not filter by status.
    // Let's refine totalPaymentNum base calculation:

    // Recalculate Base Payment (Reports) excluding Paid
    const unpaidReports = filteredReports.filter(r => r.status !== 'Paid');
    const unpaidHoursNum = unpaidReports.reduce((sum, r) => sum + (Number(r.hoursWorked) || 0), 0);
    // Reset base and re-add invoices
    totalPaymentNum = unpaidHoursNum * 2000;

    approvedInvoices.forEach(inv => {
        if (inv.status === 'Paid') return;
        if (inv.amount) totalPaymentNum += Number(inv.amount);
        if (inv.items) {
            inv.items.forEach(item => totalPaymentNum += (Number(item.hours) * 2000));
        }
        if (inv.bonuses) {
            inv.bonuses.forEach(bonus => totalPaymentNum += bonus.amount);
        }
    });

    const paymentAmount = totalPaymentNum.toLocaleString('en-NG', { style: 'currency', currency: 'NGN' });
    const showPayment = isAdmin || (user && !clientEmail && !isSuperClient);

    const handleResetPayment = () => {
        if (!confirm(`Are you sure you want to MARK ALL as PAID for ${monthName}?\nThis will reset the Payment Amount to ₦0.00.\nThis action cannot be undone easily.`)) return;

        // 1. Mark Reports as Paid
        const reportsToPay = filteredReports.filter(r => r.status !== 'Paid');
        reportsToPay.forEach(r => {
            reportService.updateReport({ ...r, status: 'Paid' });
        });

        // 2. Mark Approved Invoices as Paid
        const invoicesToPay = approvedInvoices.filter(i => i.status === 'Approved'); // Only Approved ones become Paid
        invoicesToPay.forEach(i => {
            invoiceService.updateInvoiceStatus(i.id, 'Paid');
        });

        alert('Payment status updated to PAID. Amount reset.');
        fetchInvoices();
    };

    // Pending Invoices for Admin to see
    const pendingInvoices = invoices.filter(i => {
        if (i.status !== 'Pending') return false;

        // Filter by selected rater in Detail View
        if (canViewAllAccounts && viewMode === 'detail' && selectedEmail) {
            const isSubmitter = i.raterName === selectedEmail;
            const hasItem = i.items && i.items.some(item => item.email === selectedEmail);
            return isSubmitter || hasItem;
        }
        return true;
    });


    // Render Account List
    if (canViewAllAccounts && viewMode === 'list') {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center">
                <div className="w-full max-w-4xl bg-white rounded-xl shadow-lg p-8">
                    <div className="flex justify-between items-center mb-6">
                        <button
                            onClick={() => navigate('/')}
                            className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                        >
                            <Home className="w-4 h-4 mr-2" /> Home
                        </button>
                        <h2 className="text-2xl font-bold text-gray-900">All Accounts</h2>
                        {isAdmin && (
                            <button
                                onClick={() => setShowRegisterModal(true)}
                                className="flex items-center px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors font-bold shadow-md"
                            >
                                <UserPlus className="w-4 h-4 mr-2" /> Add New Rater
                            </button>
                        )}
                    </div>

                    {/* ADMIN REGISTER MODAL */}
                    {showRegisterModal && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg animate-in fade-in zoom-in duration-200">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-xl font-bold text-gray-900">Register New Rater</h3>
                                    <button onClick={() => setShowRegisterModal(false)} className="text-gray-400 hover:text-gray-600">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Profile Name (Login)</label>
                                        <PasswordField
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newRaterForm.username}
                                            onChange={e => setNewRaterForm({ ...newRaterForm, username: e.target.value })}
                                            placeholder="e.g. John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email Address</label>
                                        <input
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newRaterForm.email}
                                            onChange={e => setNewRaterForm({ ...newRaterForm, email: e.target.value })}
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Evaluation</label>
                                            <select
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newRaterForm.evaluation}
                                                onChange={e => setNewRaterForm({ ...newRaterForm, evaluation: e.target.value })}
                                            >
                                                {['Core', 'Search', 'Ads', 'Map', 'AI Training'].map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Proxy</label>
                                            <select
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                                value={newRaterForm.proxy}
                                                onChange={e => setNewRaterForm({ ...newRaterForm, proxy: e.target.value })}
                                            >
                                                {PROXIES.map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                                        <input
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                            value={newRaterForm.password}
                                            onChange={e => setNewRaterForm({ ...newRaterForm, password: e.target.value })}
                                            placeholder="Generates default if empty"
                                        />
                                    </div>

                                    <button
                                        onClick={handleAdminRegister}
                                        className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg flex items-center justify-center"
                                    >
                                        <UserPlus className="w-5 h-5 mr-2" /> Create Account
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}


                    <div className="grid gap-4">
                        {accountList.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">No accounts found.</div>
                        ) : (
                            accountList.map(acc => {
                                const userDetails = authService.getAllUsers().find(u => u.username === acc.email);
                                return (
                                    <button
                                        key={acc.email}
                                        onClick={() => handleSelectEmail(acc.email)}
                                        className={`flex items-center justify-between w-full p-4 bg-white border rounded-lg hover:shadow-md transition-all text-left group
                                    ${acc.hasSacked ? 'border-red-300 bg-red-50 hover:bg-red-100 hover:border-red-400' :
                                                acc.hasRestricted ? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100 hover:border-yellow-400' :
                                                    'border-gray-200 hover:border-blue-300'
                                            }`}
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center space-x-3 mb-1">
                                                <span className={`font-bold text-lg ${acc.hasSacked ? 'text-red-800' : acc.hasRestricted ? 'text-yellow-800' : 'text-gray-800 group-hover:text-blue-600'}`}>
                                                    {acc.email}
                                                </span>
                                                {acc.hasSacked && <span className="flex items-center text-xs font-bold text-red-600 bg-red-200 px-2 py-0.5 rounded-full"><UserX className="w-3 h-3 mr-1" /> Sacked</span>}
                                                {acc.hasRestricted && !acc.hasSacked && <span className="flex items-center text-xs font-bold text-yellow-700 bg-yellow-200 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3 mr-1" /> Restricted</span>}
                                            </div>

                                            {/* New User Details Row */}
                                            <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                                                {userDetails?.email && (
                                                    <span className="bg-gray-100 px-2 py-1 rounded flex items-center">
                                                        <Mail className="w-3 h-3 mr-1" /> {userDetails.email}
                                                    </span>
                                                )}
                                                {userDetails?.evaluation && (
                                                    <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded flex items-center">
                                                        <Briefcase className="w-3 h-3 mr-1" /> {userDetails.evaluation}
                                                    </span>
                                                )}
                                                {userDetails?.proxy && (
                                                    <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded flex items-center">
                                                        <Shield className="w-3 h-3 mr-1" /> {userDetails.proxy}
                                                    </span>
                                                )}
                                                {!userDetails?.email && !userDetails?.evaluation && (
                                                    <span className="italic opacity-50">Legacy Account</span>
                                                )}
                                            </div>
                                            <span className="text-[10px] text-gray-400 mt-1">Click to view reports & status</span>
                                        </div>
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center
                                    ${acc.hasSacked ? 'bg-red-200 text-red-600' :
                                                acc.hasRestricted ? 'bg-yellow-200 text-yellow-600' :
                                                    'bg-blue-50 text-blue-500 group-hover:bg-blue-100'
                                            }`}>
                                            <ArrowRight className="w-5 h-5" />
                                        </div>
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Render Detail View
    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center relative">

            {/* Invoice/Dispute Modal */}
            {showInvoiceModal && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm p-4">
                    <div className="flex min-h-full items-center justify-center">
                        <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl animate-in fade-in zoom-in duration-200">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editingInvoiceId ? 'Edit Invoice' : (invoiceType === 'Invoice' ? 'Submit Manual Report (Batch)' : 'Raise Dispute')}
                                </h3>
                                <button onClick={() => setShowInvoiceModal(false)} className="text-gray-400 hover:text-gray-600">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                {/* DISPUTE FORM */}
                                {invoiceType === 'Dispute' && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Dispute Reason</label>
                                        <textarea
                                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none"
                                            placeholder="Describe the issue..."
                                            value={invoiceMessage}
                                            onChange={e => setInvoiceMessage(e.target.value)}
                                        ></textarea>
                                    </div>
                                )}

                                {/* MANUAL INVOICE BATCH FORM */}
                                {invoiceType === 'Invoice' && (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                                            <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                                                <Plus className="w-4 h-4 mr-1" /> Add Entry
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                                <input
                                                    placeholder="Profile Name"
                                                    className="px-3 py-2 border rounded text-sm"
                                                    value={currentItem.profileName}
                                                    onChange={e => setCurrentItem({ ...currentItem, profileName: e.target.value })}
                                                />
                                                <input
                                                    placeholder="Email"
                                                    className="px-3 py-2 border rounded text-sm"
                                                    value={currentItem.email}
                                                    onChange={e => setCurrentItem({ ...currentItem, email: e.target.value })}
                                                />
                                                <select
                                                    className="px-3 py-2 border rounded text-sm"
                                                    value={currentItem.proxy}
                                                    onChange={e => setCurrentItem({ ...currentItem, proxy: e.target.value })}
                                                >
                                                    <option value="">Select Proxy...</option>
                                                    {PROXIES.map(p => <option key={p} value={p}>{p}</option>)}
                                                </select>
                                                <input
                                                    placeholder="Date Range (e.g. 12th-30th Jan)"
                                                    className="px-3 py-2 border rounded text-sm"
                                                    value={currentItem.dateRange}
                                                    onChange={e => setCurrentItem({ ...currentItem, dateRange: e.target.value })}
                                                />
                                                <div className="col-span-2">
                                                    <input
                                                        type="number"
                                                        placeholder="Hours Worked"
                                                        className="w-full px-3 py-2 border rounded text-sm"
                                                        value={currentItem.hours}
                                                        onChange={e => setCurrentItem({ ...currentItem, hours: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={addBatchItem}
                                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded shadow-sm transition-colors"
                                            >
                                                Add to List
                                            </button>
                                        </div>

                                        {/* Added Items List */}
                                        {batchItems.length > 0 && (
                                            <div className="border rounded-lg overflow-hidden">
                                                <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left">Profile</th>
                                                            <th className="px-3 py-2 text-left">Hours</th>
                                                            <th className="px-3 py-2 text-right">Amount</th>
                                                            <th className="px-3 py-2"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {batchItems.map(item => (
                                                            <tr key={item.id}>
                                                                <td className="px-3 py-2">
                                                                    <div className="font-medium text-gray-900">{item.profileName}</div>
                                                                    <div className="text-xs text-gray-500">{item.email}</div>
                                                                </td>
                                                                <td className="px-3 py-2">{item.hours}</td>
                                                                <td className="px-3 py-2 text-right font-mono">
                                                                    {(Number(item.hours) * 2000).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                                                                </td>
                                                                <td className="px-3 py-2 text-right">
                                                                    <button onClick={() => removeBatchItem(item.id)} className="text-red-500 hover:text-red-700">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50 font-bold">
                                                        <tr>
                                                            <td className="px-3 py-2 text-right">Item Total:</td>
                                                            <td className="px-3 py-2 text-right" colSpan={3}>
                                                                {batchItems.reduce((acc, item) => acc + (Number(item.hours) * 2000), 0).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}

                                        {/* Bonuses */}
                                        <div className="space-y-2 pt-4 border-t">
                                            <h4 className="text-sm font-bold text-gray-700">Bonuses</h4>
                                            <div className="flex gap-4">
                                                <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border hover:border-blue-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={addTrainingBonus}
                                                        onChange={e => setAddTrainingBonus(e.target.checked)}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm">Training (₦ 10k)</span>
                                                </label>
                                                <label className="flex items-center space-x-2 cursor-pointer bg-gray-50 px-3 py-2 rounded border hover:border-blue-300">
                                                    <input
                                                        type="checkbox"
                                                        checked={addAuditorBonus}
                                                        onChange={e => setAddAuditorBonus(e.target.checked)}
                                                        className="rounded text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <span className="text-sm">Auditor (₦ 8k)</span>
                                                </label>
                                            </div>
                                        </div>

                                        {/* Account Details Form */}
                                        <div className="pt-4 border-t space-y-3">
                                            <h4 className="text-sm font-bold text-gray-800 flex items-center">
                                                <span className="bg-blue-100 text-blue-800 p-1 rounded mr-2">🏦</span>
                                                Account Details needed for Payment
                                            </h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="md:col-span-2">
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Bank Name</label>
                                                    <input
                                                        className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="e.g. GTBank, Zenith Bank"
                                                        value={bankDetails.bankName}
                                                        onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Account Number</label>
                                                    <input
                                                        className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="0123456789"
                                                        value={bankDetails.accountNumber}
                                                        onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Account Name</label>
                                                    <input
                                                        className="w-full px-3 py-2 border rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                        placeholder="Full Name on Account"
                                                        value={bankDetails.accountName}
                                                        onChange={e => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSubmitInvoice}
                                    className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center shadow-lg"
                                >
                                    <Send className="w-5 h-5 mr-2" /> Submit {invoiceType === 'Invoice' ? 'Report' : 'Dispute'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="w-full max-w-6xl bg-white rounded-xl shadow-lg p-8">
                <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                    <div className="flex space-x-3 w-full md:w-auto">
                        {canViewAllAccounts ? (
                            <button
                                onClick={handleBackToList}
                                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Accounts
                            </button>
                        ) : (
                            <button
                                onClick={() => navigate('/')}
                                className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
                            >
                                <Home className="w-4 h-4 mr-2" /> Home
                            </button>
                        )}
                    </div>

                    {/* Tab Navigation */}
                    <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
                        <button
                            onClick={() => setActiveTab('reports')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'reports' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Daily Reports
                        </button>
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'invoices' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Invoice History
                        </button>
                    </div>

                    {/* Month & Week Navigation */}
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                        <select
                            value={weekFilter}
                            onChange={(e) => setWeekFilter(e.target.value as 'All' | '1' | '2' | '3' | '4')}
                            className="bg-transparent text-sm font-medium text-gray-600 focus:outline-none cursor-pointer px-2 border-r border-gray-300"
                        >
                            <option value="All">All Weeks</option>
                            <option value="1">Week 1 (1st-7th)</option>
                            <option value="2">Week 2 (8th-14th)</option>
                            <option value="3">Week 3 (15th-21st)</option>
                            <option value="4">Week 4 (22nd-End)</option>
                        </select>
                        <button onClick={prevMonth} className="p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600 hover:text-blue-600">
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                        <span className="px-2 font-bold text-gray-800 min-w-[120px] text-center text-sm sm:text-base">{monthName}</span>
                        <button onClick={nextMonth} className="p-2 hover:bg-white rounded-md shadow-sm transition-all text-gray-600 hover:text-blue-600">
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Total & Payment Actions */}
                    <div className="flex items-center gap-6 w-full md:w-auto justify-end">
                        <div className="flex flex-col items-end">
                            <span className="text-xs text-gray-500 uppercase tracking-wider font-bold">Total Hours</span>
                            <span className="text-xl font-bold text-gray-800">{totalHours} hrs</span>
                        </div>

                        {showPayment && (
                            <div className="flex flex-col items-end border-l pl-6 border-gray-200">
                                <span className="text-xs text-green-600 uppercase tracking-wider font-bold">Total Payment</span>
                                <span className="text-2xl font-bold text-green-600">{paymentAmount}</span>
                                {isAdmin && totalPaymentNum > 0 && (
                                    <button
                                        onClick={handleResetPayment}
                                        className="mt-1 px-3 py-1 bg-green-100 text-green-800 hover:bg-green-200 text-xs font-bold rounded shadow-sm transition-colors border border-green-200"
                                        title="Mark all as Paid and reset counter"
                                    >
                                        Mark Paid / Reset
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Rater Actions Row */}
                <div className="flex justify-end gap-3 mb-6">
                    {!canViewAllAccounts && (
                        <button
                            onClick={() => handleOpenInvoice('Dispute')}
                            className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
                        >
                            <AlertTriangle className="w-4 h-4 mr-2" /> Raise Dispute
                        </button>
                    )}
                    <button
                        onClick={() => handleOpenInvoice('Invoice')}
                        className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium flex items-center transition-colors"
                    >
                        <FileText className="w-4 h-4 mr-2" /> Submit Manual Invoice
                    </button>
                </div>

                {/* Admin Pending Invoices Dashboard */}
                {isAdmin && pendingInvoices.length > 0 && (
                    <div className="mb-8 bg-white border border-orange-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex justify-between items-center">
                            <h3 className="font-bold text-orange-800 flex items-center">
                                <AlertTriangle className="w-5 h-5 mr-2" /> Pending Invoices ({pendingInvoices.length})
                            </h3>
                        </div>
                        <div className="divide-y divide-gray-100">
                            {pendingInvoices.map(inv => (
                                <div key={inv.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-center cursor-pointer" onClick={() => toggleExpandInvoice(inv.id)}>
                                        <div className="flex items-center space-x-4">
                                            <div className="bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded text-sm">
                                                {inv.raterName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {new Date(inv.date).toLocaleDateString()}
                                            </div>
                                            {inv.type === 'Dispute' && (
                                                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded uppercase">Dispute</span>
                                            )}
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className="font-bold text-gray-900">
                                                {Number(inv.amount).toLocaleString('en-NG', { style: 'currency', currency: 'NGN' })}
                                            </span>
                                            <button className="text-gray-400">
                                                {expandedInvoiceId === inv.id ? 'Hide' : 'Show'} Details
                                            </button>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {expandedInvoiceId === inv.id && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 pl-4 border-l-4 border-l-blue-200 bg-gray-50/50 rounded-r-lg">
                                            {inv.message && (
                                                <div className="mb-3">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Note/Message</span>
                                                    <p className="text-gray-700 text-sm mt-1">{inv.message}</p>
                                                </div>
                                            )}

                                            {/* Bank Details Display */}
                                            {inv.bankDetails && (
                                                <div className="mt-3 mb-3 p-3 bg-blue-50/50 rounded border border-blue-100 text-sm">
                                                    <h5 className="font-bold text-blue-900 mb-2 flex items-center"><span className="mr-2">🏦</span> Payment Details</h5>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                        <span className="text-gray-500">Bank Name:</span>
                                                        <span className="font-medium text-gray-900">{inv.bankDetails.bankName}</span>

                                                        <span className="text-gray-500">Account No:</span>
                                                        <span className="font-mono font-bold text-gray-900">{inv.bankDetails.accountNumber}</span>

                                                        <span className="text-gray-500">Account Name:</span>
                                                        <span className="font-medium text-gray-900">{inv.bankDetails.accountName}</span>
                                                    </div>
                                                </div>
                                            )}

                                            {inv.items && inv.items.length > 0 && (
                                                <div className="mt-3">
                                                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Batch Items</h4>
                                                    <table className="min-w-full divide-y divide-gray-200 text-xs">
                                                        <thead className="bg-gray-100">
                                                            <tr>
                                                                <th className="px-2 py-1 text-left">Profile</th>
                                                                <th className="px-2 py-1 text-left">Hours</th>
                                                                <th className="px-2 py-1 text-right">Amount</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {inv.items.map(item => (
                                                                <tr key={item.id}>
                                                                    <td className="px-2 py-1">{item.profileName}</td>
                                                                    <td className="px-2 py-1">{item.hours}</td>
                                                                    <td className="px-2 py-1 text-right">{(Number(item.hours) * 2000).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}

                                            {inv.bonuses && inv.bonuses.length > 0 && (
                                                <div className="mt-2">
                                                    <span className="text-xs font-bold text-gray-500 uppercase">Bonuses:</span>
                                                    <div className="flex gap-2 mt-1">
                                                        {inv.bonuses.map((b, idx) => (
                                                            <span key={idx} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                                                {b.type} (+₦{b.amount.toLocaleString()})
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex justify-end space-x-3 mt-4">
                                                <button
                                                    onClick={() => handleDeleteInvoice(inv.id)}
                                                    className="px-3 py-1 bg-white text-red-600 border border-red-200 rounded text-sm hover:bg-red-50"
                                                    title="Delete Invoice"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => startEditInvoice(inv)}
                                                    className="px-3 py-1 bg-white text-blue-600 border border-blue-200 rounded text-sm hover:bg-blue-50"
                                                    title="Edit Invoice"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <div className="w-px bg-gray-300 mx-2"></div>
                                                <button
                                                    onClick={() => handleApproveInvoice(inv.id, false)}
                                                    className="px-3 py-1 bg-red-50 text-red-600 border border-red-200 rounded text-sm hover:bg-red-100"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleApproveInvoice(inv.id, true)}
                                                    className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 shadow-sm"
                                                >
                                                    Approve Payment
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* INVOICE HISTORY TAB */}
                {activeTab === 'invoices' && (
                    <div className="bg-white border frame-border rounded-xl shadow-sm p-6">
                        <div className="mb-6 border-b border-gray-200 pb-2">
                            <h2 className="text-xl font-bold text-gray-900">
                                {canViewAllAccounts ? `Invoices for ${selectedEmail || 'All Accounts'}` : 'Your Invoice History'}
                            </h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                        {canViewAllAccounts && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rater</th>}
                                        {canViewAllAccounts && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Details</th>}
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {invoices
                                        .filter(inv => {
                                            const matchesMonth = inv.month === monthName;
                                            if (!matchesMonth) return false;
                                            if (canViewAllAccounts && viewMode === 'detail' && selectedEmail) {
                                                const isSubmitter = inv.raterName === selectedEmail;
                                                const hasItem = inv.items && inv.items.some(i => i.email === selectedEmail);
                                                return isSubmitter || hasItem;
                                            }
                                            if (!canViewAllAccounts) {
                                                return inv.raterName === user?.username;
                                            }
                                            return true;
                                        })
                                        .map((invoice) => (
                                            <React.Fragment key={invoice.id}>
                                                <tr
                                                    onClick={() => toggleExpandInvoice(invoice.id)}
                                                    className={`hover:bg-blue-50 transition-colors cursor-pointer ${expandedInvoiceId === invoice.id ? 'bg-blue-50' : ''}`}
                                                >
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{invoice.date}</td>
                                                    {canViewAllAccounts && (
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                            {invoice.raterName}
                                                            <div className="text-xs text-gray-500">{invoice.bankDetails?.accountName}</div>
                                                        </td>
                                                    )}
                                                    {canViewAllAccounts && (
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {invoice.bankDetails ? (
                                                                <div className="flex flex-col">
                                                                    <span className="font-bold text-gray-700">{invoice.bankDetails.bankName}</span>
                                                                    <span className="font-mono text-xs">{invoice.bankDetails.accountNumber}</span>
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 italic">-</span>
                                                            )}
                                                        </td>
                                                    )}
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.type === 'Dispute' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {invoice.type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                                                        ₦{Number(invoice.amount).toLocaleString()}
                                                        <div className="text-xs font-normal text-gray-500">{invoice.items?.length || 0} items</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${invoice.status === 'Approved' ? 'bg-green-100 text-green-800' :
                                                            invoice.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                                                                invoice.status === 'Paid' ? 'bg-blue-800 text-white' :
                                                                    'bg-yellow-100 text-yellow-800'
                                                            }`}>
                                                            {invoice.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        {/* Admin deletes anytime, Rater only if Pending */}
                                                        {(invoice.status === 'Pending' || isAdmin) && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation(); // Prevent toggling row
                                                                    handleDeleteInvoice(invoice.id);
                                                                }}
                                                                className="text-red-400 hover:text-red-600 transition-colors z-10 relative"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                                {/* EXPANDED DETAILS */}
                                                {expandedInvoiceId === invoice.id && (
                                                    <tr>
                                                        <td colSpan={canViewAllAccounts ? 7 : 5} className="p-0 bg-gray-50 border-b border-gray-200">
                                                            <div className="p-4 pl-12">
                                                                <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
                                                                    <h4 className="font-bold text-gray-800 mb-2 border-b pb-2 flex justify-between">
                                                                        <span>Invoice Details</span>
                                                                        <span className="text-blue-600">Total: ₦{Number(invoice.amount).toLocaleString()}</span>
                                                                    </h4>

                                                                    {/* Payment Details Block */}
                                                                    {invoice.bankDetails && (
                                                                        <div className="mb-4 bg-blue-50 p-3 rounded-md border border-blue-100">
                                                                            <h5 className="font-bold text-blue-900 text-xs uppercase mb-1">Payment Information</h5>
                                                                            <div className="grid grid-cols-3 gap-4 text-sm">
                                                                                <div>
                                                                                    <span className="block text-gray-500 text-xs">Bank Name</span>
                                                                                    <span className="font-medium">{invoice.bankDetails.bankName}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-gray-500 text-xs">Account Number</span>
                                                                                    <span className="font-mono font-bold">{invoice.bankDetails.accountNumber}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="block text-gray-500 text-xs">Account Name</span>
                                                                                    <span className="font-medium">{invoice.bankDetails.accountName}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Items Table */}
                                                                    {invoice.items && invoice.items.length > 0 ? (
                                                                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                                                                            <thead className="bg-gray-100">
                                                                                <tr>
                                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Profile</th>
                                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                                                                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Hours</th>
                                                                                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody className="divide-y divide-gray-200">
                                                                                {invoice.items.map((item, idx) => (
                                                                                    <tr key={idx}>
                                                                                        <td className="px-3 py-2 font-medium text-gray-900">{item.profileName}</td>
                                                                                        <td className="px-3 py-2 text-gray-500">{item.email}</td>
                                                                                        <td className="px-3 py-2 text-gray-700">{item.hours}</td>
                                                                                        <td className="px-3 py-2 text-right font-mono">
                                                                                            ₦{(Number(item.hours) * 2000).toLocaleString()}
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                            <tfoot className="bg-gray-50 font-bold">
                                                                                <tr>
                                                                                    <td colSpan={3} className="px-3 py-2 text-right">Subtotal:</td>
                                                                                    <td className="px-3 py-2 text-right">
                                                                                        ₦{invoice.items.reduce((acc, i) => acc + (Number(i.hours) * 2000), 0).toLocaleString()}
                                                                                    </td>
                                                                                </tr>
                                                                            </tfoot>
                                                                        </table>
                                                                    ) : (
                                                                        <div className="text-gray-500 italic p-2 text-center">No detailed items found.</div>
                                                                    )}

                                                                    {/* Bonuses */}
                                                                    {invoice.bonuses && invoice.bonuses.length > 0 && (
                                                                        <div className="mt-3 border-t pt-2">
                                                                            <span className="text-xs font-bold text-gray-500 uppercase">Bonuses:</span>
                                                                            <div className="flex gap-2 mt-1">
                                                                                {invoice.bonuses.map((b, idx) => (
                                                                                    <span key={idx} className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                                                                                        {b.type} (+₦{b.amount.toLocaleString()})
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}

                                                                    {/* Message */}
                                                                    {invoice.message && (
                                                                        <div className="mt-3 p-2 bg-yellow-50 border border-yellow-100 rounded text-sm text-gray-700">
                                                                            <span className="font-bold block text-xs text-yellow-800 uppercase">Note:</span>
                                                                            {invoice.message}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        ))}
                                    {invoices.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                                No invoices found for this period.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* REPORT HISTORY TAB */}
                {activeTab === 'reports' && (
                    <>
                        <div className="mb-6 border-b border-gray-200 pb-2">
                            <h2 className="text-xl font-bold text-gray-900">
                                {canViewAllAccounts ? `Reports for ${selectedEmail}` : 'Your Report History'}
                            </h2>
                        </div>

                        {filteredReports.length === 0 ? (
                            <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                                No reports found for {monthName}.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                            {canViewAllAccounts && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rater</th>}
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profile</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Info</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tasks</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hours</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Late Penalty</th>
                                            {isAdmin && <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {filteredReports.map((report) => {
                                            const isEditing = editingId === report.id;
                                            return (
                                                <tr key={report.id} className={isEditing ? "bg-blue-50" : ""}>
                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{report.date}</td>

                                                    {canViewAllAccounts && (
                                                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{report.raterName}</td>
                                                    )}

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {isEditing ? (
                                                            <input
                                                                className="border rounded px-2 py-1 w-full"
                                                                value={editForm.profileName}
                                                                onChange={e => setEditForm({ ...editForm, profileName: e.target.value })}
                                                            />
                                                        ) : report.profileName}
                                                    </td>

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {isEditing ? (
                                                            <input
                                                                className="border rounded px-2 py-1 w-full"
                                                                value={editForm.email}
                                                                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                                            />
                                                        ) : report.email}
                                                    </td>

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        <div className="flex items-center">
                                                            {report.category} ({report.proxy})
                                                            {report.status === 'Restricted' && (
                                                                <span className="ml-2 flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                    Restricted
                                                                </span>
                                                            )}
                                                            {report.status === 'Sacked' && (
                                                                <span className="ml-2 flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                                                    Sacked
                                                                </span>
                                                            )}
                                                            {report.status === 'Paid' && (
                                                                <span className="ml-2 flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-200">
                                                                    Paid
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {report.paymentDetails ? (
                                                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200">
                                                                {report.paymentDetails.accountName} - {report.paymentDetails.bankName} - {report.paymentDetails.accountNumber}
                                                            </span>
                                                        ) : '-'}
                                                    </td>

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="border rounded px-2 py-1 w-20"
                                                                value={editForm.tasksWorked}
                                                                onChange={e => setEditForm({ ...editForm, tasksWorked: e.target.value })}
                                                            />
                                                        ) : report.tasksWorked}
                                                    </td>

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-blue-600">
                                                        {isEditing ? (
                                                            <input
                                                                type="number"
                                                                className="border rounded px-2 py-1 w-20"
                                                                value={editForm.hoursWorked}
                                                                onChange={e => setEditForm({ ...editForm, hoursWorked: e.target.value })}
                                                            />
                                                        ) : report.hoursWorked}
                                                    </td>

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {report.submissionTime ? (
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                {new Date(report.submissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </div>
                                                        ) : 'N/A'}
                                                    </td>

                                                    <td className="px-4 py-4 whitespace-nowrap text-sm">
                                                        {report.latePenalty && report.latePenalty > 0 ? (
                                                            <span className="text-red-600 font-bold">₦{Number(report.latePenalty).toLocaleString()}</span>
                                                        ) : (
                                                            <span className="text-gray-400">None</span>
                                                        )}
                                                    </td>

                                                    {(isAdmin || (user?.username && report.raterName === user.username)) && (
                                                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            {isEditing ? (
                                                                <div className="flex space-x-2 justify-end">
                                                                    <button onClick={saveEdit} className="text-green-600 hover:text-green-900"><Check className="w-4 h-4" /></button>
                                                                    <button onClick={cancelEdit} className="text-gray-600 hover:text-gray-900"><X className="w-4 h-4" /></button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex space-x-3 justify-end">
                                                                    {isAdmin && (
                                                                        <button onClick={() => startEdit(report)} className="text-blue-600 hover:text-blue-900"><Edit2 className="w-4 h-4" /></button>
                                                                    )}
                                                                    <button onClick={() => handleDelete(report.id)} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}


            </div >
        </div >
    );
};
