import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { notificationService, type AppNotification } from '../../services/notificationService';

export const NotificationsPage: React.FC = () => {
  const [items, setItems] = useState<AppNotification[]>(notificationService.getAll());
  useEffect(() => { notificationService.connect(); return notificationService.subscribe(setItems); }, []);
  const unread = items.filter(item => !item.read).length;
  return <div className="page-stack notifications-page"><section className="page-intro"><div><span className="eyebrow"><Bell size={14} /> Activity center</span><h1>Notifications</h1><p>Stay up to date with admin announcements, training, and workspace updates.</p></div><button className="btn-glass" onClick={() => notificationService.markAllRead()}><CheckCheck size={16} /> Mark all read</button></section><div className="notification-summary"><Sparkles size={17} /><span>{unread ? `${unread} unread update${unread === 1 ? '' : 's'}` : 'You are all caught up'}</span></div>{items.length === 0 ? <div className="empty-state"><Bell size={28} /><h2>No notifications yet</h2><p>New admin updates will appear here in real time.</p></div> : <section className="notification-list">{items.map((item, index) => <motion.article key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * .04 }} className={`notification-item ${item.read ? '' : 'notification-unread'}`} onClick={() => notificationService.markRead(item.id)}><span className="notification-icon">{item.type === 'warning' ? <ShieldAlert size={18} /> : item.type === 'success' ? <Sparkles size={18} /> : <Info size={18} />}</span><div><div className="notification-heading"><h2>{item.title}</h2>{!item.read && <span>New</span>}</div><p>{item.message}</p><time>{new Date(item.createdAt).toLocaleString()}</time></div></motion.article>)}</section>}</div>;
};
