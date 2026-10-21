import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService, type User } from '../../services/authService';
import { apiClient } from '../../services/apiClient';
import { ArrowLeft, Search, Edit, Trash2, Shield, UserPlus, Loader2, Save, Check, User as UserIcon } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

interface UserWithStats extends User {
  totalReports?: number;
  totalHours?: number;
  lastActive?: string;
  status?: 'active' | 'inactive' | 'banned' | 'pending';
  lastLoginAt?: string;
  lastSeenAt?: string;
  loginCount?: number;
}

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    role: 'user' as 'user' | 'client' | 'admin',
    status: 'active' as 'active' | 'inactive' | 'banned' | 'pending',
    evaluation: 'Core',
    proxy: 'US',
    password: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const EVALUATIONS = ['Core', 'Search', 'Ads', 'Map', 'AI Training'];
  const PROXIES = ['US', 'UK', 'Japan', 'China', 'Germany', 'France', 'Canada', 'Australia'];

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const backendUsers = await authService.getUsersFromBackend();

      const usersWithStats: UserWithStats[] = backendUsers.map(u => {
        let status: 'active' | 'inactive' | 'banned' | 'pending' = 'active';
        if (!u.isVerified) status = 'pending';
        else if (!u.isApproved) status = 'pending';

        return {
          ...u,
          totalReports: 0,
          totalHours: 0,
          lastActive: u.lastSeenAt || u.lastLoginAt || '',
          status,
          lastLoginAt: u.lastLoginAt,
          lastSeenAt: u.lastSeenAt,
          loginCount: u.loginCount,
        };
      });

      setUsers(usersWithStats);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchUsers();
  }, []);

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenModal = (mode: 'view' | 'edit' | 'create', user?: UserWithStats) => {
    setModalMode(mode);
    if (mode === 'create') {
      setFormData({
        username: '',
        email: '',
        role: 'user',
        status: 'active',
        evaluation: 'Core',
        proxy: 'US',
        password: '',
      });
    } else if (user) {
      setSelectedUser(user);
      setFormData({
        username: user.username || '',
        email: user.email || '',
        role: (user.role as 'user' | 'client' | 'admin') || 'user',
        status: 'active',
        evaluation: 'Core',
        proxy: user.proxy || 'US',
        password: '',
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (modalMode === 'create') {
        await authService.register(
          formData.username,
          formData.password || `${formData.username.toLowerCase()}123!`,
          formData.email,
          formData.evaluation,
          formData.proxy,
          formData.role,
          formData.password || `${formData.username.toLowerCase()}123!`
        );
      } else if (modalMode === 'edit' && selectedUser) {
        await apiClient.patch(
          `/user/${encodeURIComponent(selectedUser.email || '')}`,
          {
            userName: formData.username,
            email: formData.email,
            evaluation: formData.evaluation,
            proxy: formData.proxy,
          }
        );
      }
      await fetchUsers();
      setShowModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserWithStats) => {
    if (!user.email) return;
    if (!confirm(`Delete user ${user.username}? This action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/user/${encodeURIComponent(user.email)}`);
      setUsers((prev) => prev.filter((u) => u.email !== user.email));
    } catch {
      alert('Failed to delete user');
    }
  };

  const handleApprove = async (user: UserWithStats) => {
    if (!user._id) return;
    try {
      await authService.approveUser(user._id);
      await fetchUsers();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Failed to approve user');
    }
  };

  const handleViewActivity = (user: UserWithStats) => {
    const userName = encodeURIComponent(user.username || '');
    navigate(`/admin/activity-monitor?search=${userName}`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'inactive': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'banned': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'pending': return 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  const getInitials = (name: string) => name.slice(0, 2).toUpperCase();

  const getProfileImage = (user: UserWithStats) => {
    if (user.image) return user.image;
    return null;
  };

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
              <h1 className="text-2xl sm:text-3xl font-bold text-white">User Management</h1>
              <p className="text-slate-400 mt-1 text-sm sm:text-base">Manage platform users, approvers, and roles.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleOpenModal('create')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold shadow-lg transition-all text-sm"
          >
            <UserPlus size={16} /> New user
          </motion.button>
        </motion.div>

        <GlassCard className="p-3 sm:p-4 mb-6" delay={0.1} hover={false}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search by username or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-400 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
        </GlassCard>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            Loading users...
          </div>
        ) : filteredUsers.length === 0 ? (
          <GlassCard className="p-8 text-center" delay={0.1} hover={false}>
            <UserIcon size={28} className="mx-auto mb-3 text-slate-600" />
            <p className="text-slate-400">No users match your search.</p>
          </GlassCard>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last seen</th>
                  <th className="px-4 py-3">Login count</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {getProfileImage(user) ? (
                          <img src={getProfileImage(user)!} alt={user.username} className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-white">
                            {getInitials(user.username || '?')}
                          </div>
                        )}
                        <span className="font-medium text-white">{user.username}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">{user.email}</td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.role || '')}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(user.status || '')}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                      {user.lastSeenAt ? new Date(user.lastSeenAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">{user.loginCount || 0}</td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleViewActivity(user)}
                          title="View activity"
                          className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
                        >
                          <Shield size={14} />
                        </motion.button>
                        {!user.isApproved && user.role !== 'admin' && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleApprove(user)}
                            title="Approve user"
                            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
                          >
                            <Check size={14} />
                          </motion.button>
                        )}
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleOpenModal('edit', user)}
                          title="Edit user"
                          className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/5"
                        >
                          <Edit size={14} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDelete(user)}
                          title="Delete user"
                          className="p-1 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass-card-strong p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            initial={{ opacity: 0, scale: 0.94, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
          >
            <h2 className="text-xl font-bold text-white mb-4">
              {modalMode === 'create' ? 'Create new user' : modalMode === 'edit' ? 'Edit user' : 'View user'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 outline-none text-sm"
                />
              </div>
              {modalMode === 'create' && (
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Password</label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 outline-none text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'client' | 'admin' })}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 outline-none text-sm"
                >
                  <option value="user">Rater</option>
                  <option value="client">Client</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Evaluation</label>
                <select
                  value={formData.evaluation}
                  onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 outline-none text-sm"
                >
                  {EVALUATIONS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Proxy</label>
                <select
                  value={formData.proxy}
                  onChange={(e) => setFormData({ ...formData, proxy: e.target.value })}
                  disabled={modalMode === 'view'}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 outline-none text-sm"
                >
                  {PROXIES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {error && <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-sm">{error}</div>}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setSelectedUser(null); }}
                className="px-4 py-2 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm"
              >
                Cancel
              </button>
              {modalMode !== 'view' && (
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white font-semibold text-sm flex items-center gap-2"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {modalMode === 'create' ? 'Create' : 'Save changes'}
                </motion.button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
};
