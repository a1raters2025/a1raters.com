import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';
import { adminService } from '../../services/adminService';
import { notificationService, type AppNotification } from '../../services/notificationService';
import { formatNigeriaDateTime } from '../../utils/dateTime';

export const NotificationsPage: React.FC = () => {
  const isAdmin = authService.getUser()?.role === 'admin';
  const [items, setItems] = useState<AppNotification[]>(notificationService.getAll());
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [broadcastStatus, setBroadcastStatus] = useState('');
  const [broadcastError, setBroadcastError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const unsubscribe = notificationService.subscribe(setItems);
    notificationService.connect();
    return unsubscribe;
  }, []);

  const handleBroadcast = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setBroadcastError('');
    setBroadcastStatus('');
    try {
      const response = await adminService.broadcastNotification({ title, message, type: 'info' });
      setBroadcastStatus(response.message);
      setTitle('');
      setMessage('');
    } catch (error: unknown) {
      setBroadcastError(error instanceof Error ? error.message : 'Unable to send this notification.');
    } finally {
      setSending(false);
    }
  };

  const unread = items.filter(item => !item.read).length;
  return (
    <div className="page-stack notifications-page">
      <section className="page-intro">
        <div>
          <span className="eyebrow"><Bell size={14} /> Activity center</span>
          <h1>Notifications</h1>
          <p>Updates relevant to your account and workspace.</p>
        </div>
        <button className="btn-glass" onClick={() => notificationService.markAllRead()}>
          <CheckCheck size={16} /> Mark all read
        </button>
      </section>

      {isAdmin && (
        <section className="glass-card p-5">
          <h2 className="mb-1 text-lg font-semibold text-white">Notify all users</h2>
          <p className="mb-4 text-sm text-slate-400">Send a real-time notification to all connected raters, clients, and administrators.</p>
          <form onSubmit={(event) => void handleBroadcast(event)} className="space-y-3">
            <label className="block text-sm text-slate-300">
              Title
              <input
                required
                maxLength={120}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            <label className="block text-sm text-slate-300">
              Message
              <textarea
                required
                maxLength={1000}
                rows={3}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-cyan-400"
              />
            </label>
            {broadcastStatus && <p role="status" className="text-sm text-emerald-300">{broadcastStatus}</p>}
            {broadcastError && <p role="alert" className="text-sm text-red-300">{broadcastError}</p>}
            <button type="submit" disabled={sending} className="btn-glass inline-flex items-center gap-2 disabled:opacity-50">
              <Send size={16} /> {sending ? 'Sending…' : 'Send to all users'}
            </button>
          </form>
        </section>
      )}

      <div className="notification-summary">
        <Sparkles size={17} />
        <span>{unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You are all caught up'}</span>
      </div>
      {items.length === 0 ? (
        <div className="empty-state">
          <Bell size={28} />
          <h2>No notifications yet</h2>
          <p>Updates relevant to you will appear here.</p>
        </div>
      ) : (
        <section className="notification-list">
          {items.map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * .04 }}
              className={`notification-item ${item.read ? '' : 'notification-unread'}`}
              onClick={() => notificationService.markRead(item.id)}
            >
              <span className="notification-icon">
                {item.type === 'warning' ? <ShieldAlert size={18} /> : item.type === 'success' ? <Sparkles size={18} /> : <Info size={18} />}
              </span>
              <div>
                <div className="notification-heading">
                  <h2>{item.title}</h2>
                  {!item.read && <span>New</span>}
                </div>
                <p>{item.message}</p>
                <time>{formatNigeriaDateTime(item.createdAt)}</time>
              </div>
            </motion.article>
          ))}
        </section>
      )}
    </div>
  );
};
