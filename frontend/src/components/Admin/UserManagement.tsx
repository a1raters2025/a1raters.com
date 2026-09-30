import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService, type User } from '../../services/authService';
import { ArrowLeft, Search, MoreVertical, Edit, Trash2, Shield, UserPlus, Loader2, Save, Check } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

interface UserWithStats extends User {
  totalReports?: number;
  totalHours?: number;
  lastActive?: string;
  status?: 'active' | 'inactive' | 'banned' | 'pending';
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
      const usersWithStats: UserWithStats[] = backendUsers.map(u => ({
        ...u,
        totalReports: Math.floor(Math.random() * 100),
        totalHours: Math.floor(Math.random() * 500),
        lastActive: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        status: u.isApproved === false ? 'pending' : (Math.random() > 0.1 ? 'active' : 'inactive'),
      }));
      setUsers(usersWithStats);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch-in-effect: load users from backend on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
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
        username: user.username,
        email: user.email || '',
        role: user.role || 'user',
        status: user.status || 'active',
        evaluation: user.evaluation || 'Core',
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
        await authService.updateProfile({
          username: formData.username,
          email: formData.email,
          evaluation: formData.evaluation,
          proxy: formData.proxy,
        });
      }
      fetchUsers();
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: UserWithStats) => {
    if (!confirm(`Delete user ${user.username}? This action cannot be undone.`)) return;
    try {
      await authService.updateProfile({
        username: user.username,
        email: user.email || '',
        evaluation: user.evaluation || 'Core',
        proxy: user.proxy || 'US',
      });
      fetchUsers();
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
              onClick={() => navigate('/dashboard')}
              className="text-slate-400 hover:text-white"
            >
              <ArrowLeft size={24} />
            </motion.button>
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-slate-400 text-sm">Manage platform users and their permissions</p>
            </div>
          </div>
          <motion.button
            onClick={() => handleOpenModal('create')}
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            <UserPlus size={16} /> Add User
          </motion.button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <GlassCard className="p-6" delay={0.15}>
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                />
              </div>
              <div className="text-sm text-slate-400 flex items-center">
                {filteredUsers.length} of {users.length} users
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-indigo-400 animate-spin" />
              </div>
            ) : (
              <div className="table-responsive">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/10">
                      <th className="pb-3 pr-4">User</th>
                      <th className="pb-3 pr-4 hidden md:table-cell">Email</th>
                      <th className="pb-3 pr-4 hidden lg:table-cell">Role</th>
                      <th className="pb-3 pr-4 hidden lg:table-cell">Status</th>
                      <th className="pb-3 pr-4 hidden xl:table-cell">Reports</th>
                      <th className="pb-3 pr-4 hidden xl:table-cell">Hours</th>
                      <th className="pb-3 pr-4">Last Active</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr
                          key={user._id || user.username}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              {getProfileImage(user) ? (
                                <img
                                  src={getProfileImage(user) ?? undefined}
                                  alt={user.username}
                                  className="w-9 h-9 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-xs text-white">
                                  {getInitials(user.username)}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-white truncate max-w-[150px]">{user.username}</div>
                                <div className="text-[10px] text-slate-500 capitalize">{user.role || 'user'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4 hidden md:table-cell text-slate-400 truncate max-w-[200px]">
                            {user.email || '—'}
                          </td>
                          <td className="py-4 pr-4 hidden lg:table-cell">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              user.role === 'admin' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                              user.role === 'client' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' :
                              'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                            }`}>
                              {user.role === 'admin' && <Shield size={10} />}
                              {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                            </span>
                          </td>
                          <td className="py-4 pr-4 hidden lg:table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(user.status || 'active')}`}>
                              {user.status ? user.status.charAt(0).toUpperCase() + user.status.slice(1) : ''}
                            </span>
                          </td>
                          <td className="py-4 pr-4 hidden xl:table-cell text-slate-300">{user.totalReports || 0}</td>
                          <td className="py-4 pr-4 hidden xl:table-cell text-slate-300">{user.totalHours || 0}h</td>
                          <td className="py-4 pr-4 text-slate-400">
                            {user.lastActive ? new Date(user.lastActive).toLocaleDateString() : 'Never'}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {user.isApproved === false && user.role !== 'admin' && (
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  onClick={() => handleApprove(user)}
                                  className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-colors"
                                  aria-label={`Approve ${user.username}`}
                                  title="Approve account"
                                >
                                  <Check size={16} />
                                </motion.button>
                              )}
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleOpenModal('view', user)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                aria-label="View user"
                              >
                                <MoreVertical size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleOpenModal('edit', user)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-300 transition-colors"
                                aria-label="Edit user"
                              >
                                <Edit size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleDelete(user)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-rose-300 transition-colors"
                                aria-label="Delete user"
                              >
                                <Trash2 size={16} />
                              </motion.button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {showModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="w-full max-w-md glass-card-strong p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {modalMode === 'create' ? 'Create User' : modalMode === 'edit' ? 'Edit User' : 'User Details'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
              </div>

              {error && (
                <motion.div
                  className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-200 text-sm rounded-lg"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {error}
                </motion.div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Username</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    placeholder="Username"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Email</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    placeholder="user@example.com"
                    disabled={modalMode === 'view'}
                  />
                </div>

                {modalMode !== 'view' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Password</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                      placeholder={modalMode === 'create' ? 'Min 6 characters' : 'Leave blank to keep current'}
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      {modalMode === 'create' ? 'Required for new users' : 'Leave empty to keep current password'}
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Role</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as 'user' | 'client' | 'admin' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
                  >
                    <option value="user" className="text-gray-900">Rater</option>
                    <option value="client" className="text-gray-900">Client</option>
                    <option value="admin" className="text-gray-900">Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' | 'banned' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
                  >
                    <option value="active" className="text-gray-900">Active</option>
                    <option value="inactive" className="text-gray-900">Inactive</option>
                    <option value="banned" className="text-gray-900">Banned</option>
                    <option value="pending" className="text-gray-900" disabled>Pending Approval</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Evaluation</label>
                  <select
                    value={formData.evaluation}
                    onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
                  >
                    {EVALUATIONS.map((e) => (
                      <option key={e} value={e} className="text-gray-900">{e}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Proxy Location</label>
                  <select
                    value={formData.proxy}
                    onChange={(e) => setFormData({ ...formData, proxy: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
                  >
                    {PROXIES.map((p) => (
                      <option key={p} value={p} className="text-gray-900">{p}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <motion.button
                    type="button"
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 font-semibold transition-all"
                  >
                    Cancel
                  </motion.button>
                  {modalMode !== 'view' && (
                    <motion.button
                      type="submit"
                      disabled={saving}
                      whileHover={!saving ? { scale: 1.02, y: -1 } : undefined}
                      whileTap={!saving ? { scale: 0.98 } : undefined}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          {modalMode === 'create' ? 'Create User' : 'Save Changes'}
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};