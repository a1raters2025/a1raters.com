import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { authService, type User } from '../../services/authService';
import { GlassCard } from '../UI/GlassCard';
import {
  ArrowLeft,
  Search,
  Check,
  X,
  Shield,
  Clock,
  Loader2,
  Calendar,
  Mail,
  User as UserIcon,
} from 'lucide-react';

const ROLE_OPTIONS = ['user', 'client'] as const;

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'admin':
      return 'bg-violet-500/20 text-violet-300 border-violet-500/30';
    case 'client':
      return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    case 'user':
    default:
      return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  }
};

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

const formatDate = (date: string | null | undefined) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-us', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export const UserApprovalPage: React.FC = () => {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.getPendingUsers(1, 100, roleFilter === 'all' ? undefined : roleFilter);
      setPendingUsers(result.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pending users');
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    const init = async () => {
      await authService.init();
      void fetchPendingUsers();
    };
    void init();
  }, [fetchPendingUsers]);

  const handleApprove = async (user: User) => {
    const confirmed = window.confirm(`Approve ${user.userName || user.username}'s account? They will be granted access to the platform.`);
    if (!confirmed) return;
    try {
      if (!user._id) throw new Error('User ID is required');
      await authService.approveUser(user._id);
      setPendingUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to approve user');
    }
  };

  const handleReject = async (user: User) => {
    const reason = rejectReasons[user._id || ''] ?? '';
    if (!reason.trim()) {
      window.alert('Please provide a reason for rejection.');
      return;
    }
    const confirmed = window.confirm(`Reject ${user.userName || user.username}'s account? Reason: ${reason.substring(0, 50)}${reason.length > 50 ? '...' : ''}`);
    if (!confirmed) return;
    try {
      if (!user._id) throw new Error('User ID is required');
      await authService.rejectUser(user._id, reason);
      setPendingUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to reject user');
    }
  };

  const filteredUsers = pendingUsers.filter((u) => {
    const q = search.toLowerCase();
    return (u.userName?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
  });

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="flex justify-between items-center mb-8 flex-wrap gap-4"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft size={18} />
            </motion.button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">User Approvals</h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">Review and approve pending user registration requests.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Shield size={14} />
            <span className="font-medium">Admin only</span>
          </div>
        </motion.div>

        {error && (
          <GlassCard className="p-3 mb-4 border-red-500/30 bg-red-900/20" hover={false}>
            <p className="text-red-300 text-sm">{error}</p>
          </GlassCard>
        )}

        <GlassCard className="p-4 mb-6" delay={0.1} hover={false}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Search by username or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-indigo-400 outline-none text-sm"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 outline-none text-sm"
              >
                <option value="all">All roles</option>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r === 'user' ? 'Rater' : 'Client'}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchPendingUsers}
                className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm"
                title="Refresh"
              >
                <Loader2 size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </GlassCard>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Loading pending users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <GlassCard className="p-8 text-center" delay={0.1} hover={false}>
            <Clock size={28} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-300 font-medium">No pending users found.</p>
            <p className="text-slate-500 text-sm mt-1">New registration requests will appear here for approval.</p>
          </GlassCard>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <motion.div key={user._id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <GlassCard className="p-4" hover={false}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {user.image ? (
                        <img src={user.image} alt={user.userName || user.username} className="w-10 h-10 rounded-lg object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center font-bold text-white">
                          {getInitials(user.userName || user.username || '')}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-medium text-white">{user.userName || user.username}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getRoleBadge(user.role || 'user')}`}>
                          {user.role || 'user'}
                        </span>
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar size={12} />
                          Registered {formatDate(user.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span className="flex items-center gap-1">
                          <Mail size={12} />
                          {user.email}
                        </span>
                        {user.categories && user.categories.length > 0 && (
                          <span className="flex items-center gap-1">
                            <UserIcon size={12} />
                            {user.categories.join(', ')}
                          </span>
                        )}
                        {user.isRejected && (
                          <span className="text-xs text-rose-300">Rejected: {user.rejectionReason}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleApprove(user)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm transition-all shadow-lg shadow-emerald-500/30"
                      >
                        <Check size={14} />
                        Approve
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => handleReject(user)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-sm transition-all"
                      >
                        <X size={14} />
                        Reject
                      </motion.button>
                    </div>
                  </div>

                  {rejectReasons[user._id || ''] !== undefined && (
                    <motion.div
                      className="mt-3 pt-3 border-t border-white/5"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <textarea
                        placeholder="Reason for rejection..."
                        value={rejectReasons[user._id || ''] ?? ''}
                        onChange={(e) => setRejectReasons((prev) => ({ ...prev, [user._id || '']: e.target.value }))}
                          className="w-full px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-rose-400 outline-none text-sm resize-none"
                          rows={2}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
