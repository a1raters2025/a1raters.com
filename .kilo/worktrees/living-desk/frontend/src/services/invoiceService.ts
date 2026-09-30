import { apiClient } from './apiClient';

export interface ManualReportItem {
    _id?: string;
    id: number;
    profileName: string;
    email: string;
    proxy?: string;
    dateRange?: string;
    hours: string;
}

export interface BonusItem {
    type: 'Training' | 'Auditor';
    amount: number;
}

export interface BankDetails {
    bankName: string;
    accountNumber: string;
    accountName: string;
}

export interface Invoice {
    _id?: string;
    id: number;
    raterName: string;
    type: 'Invoice' | 'Dispute';
    status: 'Pending' | 'Approved' | 'Rejected' | 'Resolved' | 'Paid';
    amount?: string;
    hours?: string;
    items?: ManualReportItem[];
    bonuses?: BonusItem[];
    message?: string;
    bankDetails?: BankDetails;
    date: string;
    month?: string;
    submittedBy?: {
        _id: string;
        userName: string;
        email: string;
    };
    reviewedBy?: {
        _id: string;
        userName: string;
        email: string;
    };
    reviewedAt?: string;
    paymentDate?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface InvoiceListResponse {
    status: string;
    message: string;
    data: Invoice[];
    pagination?: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

const INVOICE_KEY = 'a1_raters_invoices';

const normalizeInvoice = (invoice: Invoice): Invoice => ({
    ...invoice,
    id: invoice._id ? Date.now() : (invoice.id ?? Date.now()),
});

export const invoiceService = {
    async getAllInvoices(params?: {
        page?: number;
        limit?: number;
        raterName?: string;
        status?: string;
        type?: string;
        month?: string;
    }): Promise<Invoice[]> {
        try {
            let endpoint = '/invoices';
            const queryParams = new URLSearchParams();
            if (params?.page) queryParams.append('page', params.page.toString());
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.raterName) queryParams.append('raterName', params.raterName);
            if (params?.status) queryParams.append('status', params.status);
            if (params?.type) queryParams.append('type', params.type);
            if (params?.month) queryParams.append('month', params.month);
            
            if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

            const response = await apiClient.get<InvoiceListResponse>(endpoint);
            if (response.status === 'success' && response.data) {
                return response.data.map(normalizeInvoice);
            }
        } catch (error) {
            console.error('Failed to fetch invoices from backend, using local fallback:', error);
        }

        const data = localStorage.getItem(INVOICE_KEY);
        return data ? JSON.parse(data) : [];
    },

    async getInvoicesByRater(raterName: string): Promise<Invoice[]> {
        try {
            const response = await apiClient.get<{ status: string; data: Invoice[] }>(`/invoices/rater/${encodeURIComponent(raterName)}`);
            if (response.status === 'success' && response.data) {
                return response.data.map(normalizeInvoice);
            }
        } catch (error) {
            console.error('Failed to fetch invoices by rater from backend, using local fallback:', error);
        }

        const all = this.getAllInvoicesLocal();
        return all.filter(i => i.raterName === raterName);
    },

    async getPendingInvoices(params?: {
        raterName?: string;
        email?: string;
    }): Promise<Invoice[]> {
        try {
            let endpoint = '/invoices/pending';
            const queryParams = new URLSearchParams();
            if (params?.raterName) queryParams.append('raterName', params.raterName);
            if (params?.email) queryParams.append('email', params.email);
            
            if (queryParams.toString()) endpoint += `?${queryParams.toString()}`;

            const response = await apiClient.get<{ status: string; data: Invoice[] }>(endpoint);
            if (response.status === 'success' && response.data) {
                return response.data.map(normalizeInvoice);
            }
        } catch (error) {
            console.error('Failed to fetch pending invoices from backend:', error);
        }

        return [];
    },

    async createInvoice(invoice: Omit<Invoice, 'id' | 'status' | 'date' | 'amount' | '_id' | 'submittedBy' | 'reviewedBy' | 'reviewedAt' | 'paymentDate' | 'createdAt' | 'updatedAt'> & { 
        hours?: string; 
        items?: ManualReportItem[]; 
        bonuses?: BonusItem[] 
    }): Promise<Invoice> {
        try {
            const response = await apiClient.post<{ status: string; message?: string; data: Invoice }>('/invoices', invoice);
            if (response.status === 'success' && response.data) {
                return normalizeInvoice(response.data);
            }
            throw new Error(response.message || 'Failed to create invoice');
        } catch (error) {
            console.error('Backend create invoice failed, saving locally:', error);
            return this.createInvoiceLocal(invoice);
        }
    },

    async updateInvoice(invoice: Invoice): Promise<Invoice | undefined> {
        try {
            const id = invoice._id || invoice.id;
            if (!id) throw new Error('Invoice ID is required');

            const response = await apiClient.patch<{ status: string; data: Invoice }>(`/invoices/${id}`, invoice);
            if (response.status === 'success' && response.data) {
                return normalizeInvoice(response.data);
            }
        } catch (error) {
            console.error('Failed to update invoice on backend:', error);
        }

        return this.updateInvoiceLocal(invoice);
    },

    async updateInvoiceStatus(id: string | number, status: Invoice['status']): Promise<Invoice | undefined> {
        try {
            const invoiceId = typeof id === 'string' && id.startsWith('local_') ? null : id;
            if (invoiceId) {
                const response = await apiClient.patch<{ status: string; data: Invoice }>(`/invoices/${invoiceId}/status`, { status });
                if (response.status === 'success' && response.data) {
                    return normalizeInvoice(response.data);
                }
            }
        } catch (error) {
            console.error('Failed to update invoice status on backend:', error);
        }

        return this.updateInvoiceStatusLocal(id, status);
    },

    async deleteInvoice(id: string | number): Promise<boolean> {
        try {
            const invoiceId = typeof id === 'string' && id.startsWith('local_') ? null : id;
            if (invoiceId) {
                const response = await apiClient.delete<{ status: string }>(`/invoices/${invoiceId}`);
                if (response.status === 'success') {
                    return true;
                }
            }
        } catch (error) {
            console.error('Failed to delete invoice on backend:', error);
        }

        return this.deleteInvoiceLocal(id);
    },

    getAllInvoicesLocal(): Invoice[] {
        const data = localStorage.getItem(INVOICE_KEY);
        return data ? JSON.parse(data) : [];
    },

    createInvoiceLocal(invoice: Omit<Invoice, 'id' | 'status' | 'date' | 'amount'> & { hours?: string; items?: ManualReportItem[]; bonuses?: BonusItem[] }): Invoice {
        const all = this.getAllInvoicesLocal();

        let total = 0;
        if (invoice.hours) {
            total += Number(invoice.hours) * 2000;
        }
        if (invoice.items) {
            invoice.items.forEach(item => {
                total += Number(item.hours) * 2000;
            });
        }
        if (invoice.bonuses) {
            invoice.bonuses.forEach(b => total += b.amount);
        }

        const newInvoice: Invoice = {
            ...invoice,
            id: Date.now(),
            status: 'Pending',
            amount: total.toString(),
            date: new Date().toISOString()
        };
        const updated = [newInvoice, ...all];
        localStorage.setItem(INVOICE_KEY, JSON.stringify(updated));
        return newInvoice;
    },

    updateInvoiceLocal(invoice: Invoice): Invoice | undefined {
        const all = this.getAllInvoicesLocal();
        const index = all.findIndex(i => i.id === invoice.id);
        if (index !== -1) {
            let total = 0;
            if (invoice.hours) total += Number(invoice.hours) * 2000;
            if (invoice.items) {
                invoice.items.forEach(item => total += Number(item.hours) * 2000);
            }
            if (invoice.bonuses) {
                invoice.bonuses.forEach(b => total += b.amount);
            }
            invoice.amount = total.toString();
            
            all[index] = invoice;
            localStorage.setItem(INVOICE_KEY, JSON.stringify(all));
            return invoice;
        }
        return undefined;
    },

    updateInvoiceStatusLocal(id: string | number, status: Invoice['status']): Invoice | undefined {
        const all = this.getAllInvoicesLocal();
        const index = all.findIndex(i => i.id === id);
        if (index !== -1) {
            all[index] = { ...all[index], status };
            localStorage.setItem(INVOICE_KEY, JSON.stringify(all));
            return all[index];
        }
        return undefined;
    },

    deleteInvoiceLocal(id: string | number): boolean {
        const all = this.getAllInvoicesLocal();
        const filtered = all.filter(i => i.id !== id);
        if (filtered.length !== all.length) {
            localStorage.setItem(INVOICE_KEY, JSON.stringify(filtered));
            return true;
        }
        return false;
    },
};