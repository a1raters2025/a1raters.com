import { io, type Socket } from 'socket.io-client';
import { APP_CONFIG } from '../config/appConfig';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = 'a1_raters_notifications';
const SOCKET_URL = APP_CONFIG.apiUrl.replace(/\/api\/v1\/?$/, '');
let socket: Socket | null = null;
let socketToken: string | null = null;
let listeners: Array<(items: AppNotification[]) => void> = [];
let paymentDetailsListeners: Array<() => void> = [];

const getStorageKey = () => {
  try {
    const user = JSON.parse(localStorage.getItem('a1_raters_user') || 'null') as {
      _id?: string;
      email?: string;
    } | null;
    const userId = user?._id || user?.email;
    return userId ? `${STORAGE_KEY}:${userId}` : `${STORAGE_KEY}:anonymous`;
  } catch {
    return `${STORAGE_KEY}:anonymous`;
  }
};

const read = (): AppNotification[] => {
  try { return JSON.parse(localStorage.getItem(getStorageKey()) || '[]'); } catch { return []; }
};
const publish = (items: AppNotification[]) => {
  localStorage.setItem(getStorageKey(), JSON.stringify(items));
  listeners.forEach(listener => listener(items));
};

export const notificationService = {
  connect() {
    const token = localStorage.getItem('a1_raters_token');
    if (!token) {
      this.disconnect();
      return;
    }
    if (socket && socketToken === token) return;
    this.disconnect();
    socketToken = token;
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], auth: { token } });
    socket.on('admin:update', (incoming: Omit<AppNotification, 'read'>) => {
      const item = { ...incoming, read: false };
      publish([item, ...read()].slice(0, 100));
    });
    socket.on('payment-details:changed', () => {
      paymentDetailsListeners.forEach(listener => listener());
    });
    socket.on('connect', () => {
      paymentDetailsListeners.forEach(listener => listener());
    });
  },
  getAll: read,
  subscribe(listener: (items: AppNotification[]) => void) { listeners.push(listener); return () => { listeners = listeners.filter(current => current !== listener); }; },
  subscribePaymentDetailsChanged(listener: () => void) {
    paymentDetailsListeners.push(listener);
    return () => { paymentDetailsListeners = paymentDetailsListeners.filter(current => current !== listener); };
  },
  markAllRead() { publish(read().map(item => ({ ...item, read: true }))); },
  markRead(id: string) { publish(read().map(item => item.id === id ? { ...item, read: true } : item)); },
  disconnect() {
    socket?.disconnect();
    socket = null;
    socketToken = null;
  },
};
