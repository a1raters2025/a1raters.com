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
let listeners: Array<(items: AppNotification[]) => void> = [];

const read = (): AppNotification[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const publish = (items: AppNotification[]) => { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); listeners.forEach(listener => listener(items)); };

export const notificationService = {
  connect() {
    if (socket) return;
    socket = io(SOCKET_URL, { transports: ['websocket', 'polling'], auth: { token: localStorage.getItem('a1_raters_token') } });
    socket.on('admin:update', (incoming: Omit<AppNotification, 'read'>) => {
      const item = { ...incoming, read: false };
      publish([item, ...read()].slice(0, 100));
    });
  },
  getAll: read,
  subscribe(listener: (items: AppNotification[]) => void) { listeners.push(listener); return () => { listeners = listeners.filter(current => current !== listener); }; },
  markAllRead() { publish(read().map(item => ({ ...item, read: true }))); },
  markRead(id: string) { publish(read().map(item => item.id === id ? { ...item, read: true } : item)); },
  disconnect() { socket?.disconnect(); socket = null; },
};
