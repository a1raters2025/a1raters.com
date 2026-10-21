import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, RefreshCw, Receipt } from 'lucide-react';
import { authService } from '../../services/authService';
import { invoiceService, type Invoice } from '../../services/invoiceService';
import { GlassCard } from '../UI/GlassCard';

export const MonthlyInvoicesPage: React.FC<{ monthlyOnly?: boolean }> = ({ monthlyOnly = true }) => {
  const isAdmin = authService.getUser()?.role === 'admin';
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = isAdmin ? await invoiceService.getAllInvoices({ limit: 500 }) : await invoiceService.getMyInvoices();
      setInvoices(rows.filter(invoice => !monthlyOnly || invoice.type === 'Invoice').sort((a, b) =>
        new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime(),
      ));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load monthly invoices.');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, monthlyOnly]);

  useEffect(() => { void load(); }, [load]);

  const updateStatus = async (invoice: Invoice, status: Invoice['status']) => {
    let reason = '';
    if (status === 'Rejected' || status === 'Approved') {
      const enteredReason = window.prompt(`Reason for ${status.toLowerCase()} ${invoice.type.toLowerCase()}${status === 'Rejected' ? ' (required)' : ' (optional)'}`);
      if (enteredReason === null) return;
      reason = enteredReason.trim();
      if (status === 'Rejected' && !reason) {
        setError('A reason is required to reject an invoice.');
        return;
      }
    }
    setUpdatingStatusId(String(invoice.id));
    setError('');
    try {
      await invoiceService.updateInvoiceStatus(invoice.id, status, reason);
      await load();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Could not update invoice status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return <main className="page-stack">
    <section className="page-intro"><div><span className="eyebrow"><CalendarDays size={14} /> Payments</span><h1>{monthlyOnly ? 'Monthly Invoices' : 'Invoice History'}</h1><p>{monthlyOnly ? 'Review your monthly invoice submissions and their payment status.' : 'Review all your invoice and dispute submissions.'}</p></div></section>
    {error && !loading && <p role="alert" className="text-sm text-rose-300">{error}</p>}
    {loading ? <p className="text-slate-400">Loading invoices...</p> : invoices.length === 0 ? <GlassCard className="p-8 text-center"><Receipt className="mx-auto mb-3 text-slate-400"/><h2 className="text-lg font-semibold text-white">No {monthlyOnly ? 'monthly invoices' : 'invoice history'} yet</h2><p className="mt-1 text-sm text-slate-400">Submissions will appear here.</p></GlassCard> : <section className="grid gap-3">{invoices.map(invoice => <GlassCard key={invoice._id || invoice.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><h2 className="font-semibold text-white">{invoice.month || invoice.type || new Date(invoice.date).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2><p className="mt-1 text-sm text-slate-400">{isAdmin ? `${invoice.raterName} - ` : ''}{new Date(invoice.date).toLocaleDateString()}</p></div><div className="text-right"><p className="font-semibold text-white">NGN {Number(invoice.amount || 0).toLocaleString('en-NG')}</p>{isAdmin && invoice.source !== 'paystack_payout' ? <label className="sr-only" htmlFor={`invoice-status-${invoice.id}`}>Payment status for {invoice.raterName}</label> : null}{isAdmin && invoice.source !== 'paystack_payout' ? <select id={`invoice-status-${invoice.id}`} value={invoice.status} disabled={updatingStatusId === String(invoice.id)} onChange={event => void updateStatus(invoice, event.target.value as Invoice['status'])} className="mt-2 rounded-md border border-white/15 bg-slate-800 px-3 py-1.5 text-sm text-white disabled:opacity-50"><option>Pending</option><option>Approved</option><option>Rejected</option><option>Resolved</option><option>Paid</option><option>Reversed</option></select> : <span className="text-sm text-slate-300">{invoice.status}</span>}</div></GlassCard>)}</section>}
  </main>;
};
