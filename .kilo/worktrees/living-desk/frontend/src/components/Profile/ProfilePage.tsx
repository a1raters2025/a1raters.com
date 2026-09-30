import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Key, Shield, Save, Bell, Lock, Camera } from 'lucide-react';
import { authService, type User as UserType } from '../../services/authService';
import { GlassCard } from '../UI/GlassCard';

interface ProfileForm {
  username: string;
  email: string;
  evaluation: string;
  proxy: string;
  role: string;
  notifications: boolean;
  twoFactor: boolean;
}

const EVALUATIONS = ['Core', 'Search', 'Ads', 'Map', 'AI Training'];
const PROXIES = ['US', 'UK', 'Japan', 'China', 'Germany', 'France', 'Canada', 'Australia'];

export const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<UserType | null>(null);
  const [formData, setFormData] = useState<ProfileForm>({
    username: '',
    email: '',
    evaluation: '',
    proxy: '',
    role: 'user',
    notifications: true,
    twoFactor: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const currentUser = authService.getUser();
    if (!currentUser) return;

    setUser(currentUser);
    setFormData({
      username: currentUser.username || '',
      email: currentUser.email || '',
      evaluation: currentUser.evaluation || 'Core',
      proxy: currentUser.proxy || 'US',
      role: currentUser.role || 'user',
      notifications: true,
      twoFactor: false,
    });
  }, []);

  const handleChange = (key: keyof ProfileForm, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      if (user) {
        const updatedUser = await authService.updateProfile({
          username: formData.username,
          email: formData.email,
          evaluation: formData.evaluation,
          proxy: formData.proxy,
        });
        setUser(updatedUser);
        setMessage('Profile updated successfully!');
      }
    } catch {
      setMessage('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    totalReports: 0,
    totalHours: 0,
    averageRating: 0,
  };

  const initials = (user?.username || 'U').slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <span className="eyebrow">
            <User size={14} /> Account
          </span>
          <h1 className="text-3xl font-bold text-white mb-2">Profile</h1>
          <p className="text-slate-400 text-sm">Manage your account details and preferences.</p>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Avatar & Overview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <GlassCard className="p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-3xl font-bold text-white">
                    {initials}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white"
                  >
                    <Camera size={14} />
                  </motion.button>
                </div>
                <h2 className="text-xl font-bold text-white">{user?.username || 'Loading...'}</h2>
                <p className="text-sm text-slate-400 mt-1">{user?.email || 'No email set'}</p>
                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Role</span>
                    <span className="text-white capitalize">{user?.role || 'user'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Evaluation</span>
                    <span className="text-white">{user?.evaluation || 'Core'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Proxy</span>
                    <span className="text-white">{user?.proxy || 'US'}</span>
                  </div>
                </div>
              </GlassCard>

              {/* Quick Stats */}
              <GlassCard className="p-6 mt-6" delay={0.3}>
                <h3 className="text-sm font-semibold text-slate-400 uppercase mb-4">Quick stats</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-400">
                      <Mail size={14} /> Reports submitted
                    </span>
                    <span className="font-bold text-white">{stats.totalReports}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-400">
                      <Shield size={14} /> Hours worked
                    </span>
                    <span className="font-bold text-white">{stats.totalHours}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm text-slate-400">
                      <Key size={14} /> Avg. accuracy
                    </span>
                    <span className="font-bold text-white">{stats.averageRating}%</span>
                  </div>
                </div>
              </GlassCard>
            </motion.div>

            {/* Edit Form */}
            <motion.div
              className="lg:col-span-2 space-y-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25, duration: 0.5 }}
            >
              <GlassCard className="p-6" delay={0.35}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300">
                    <User size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Profile Details</h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => handleChange('username', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                      placeholder="Your name"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                      placeholder="you@example.com"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">
                      Evaluation
                    </label>
                    <select
                      value={formData.evaluation}
                      onChange={(e) => handleChange('evaluation', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none"
                    >
                      {EVALUATIONS.map((e) => (
                        <option key={e} value={e} className="text-gray-900">
                          {e}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-400 uppercase mb-1.5">
                      Proxy Location
                    </label>
                    <select
                      value={formData.proxy}
                      onChange={(e) => handleChange('proxy', e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none"
                    >
                      {PROXIES.map((p) => (
                        <option key={p} value={p} className="text-gray-900">
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </GlassCard>

              {/* Preferences */}
              <GlassCard className="p-6" delay={0.4}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-300">
                    <Bell size={16} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Preferences</h2>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <label className="text-sm font-medium text-white">Email notifications</label>
                      <p className="text-xs text-slate-400">Receive updates about new tasks and training</p>
                    </div>
                    <label className="relative inline-flex h-5 w-9 items-center rounded-full">
                      <input
                        type="checkbox"
                        checked={formData.notifications}
                        onChange={(e) => handleChange('notifications', e.target.checked)}
                        className="h-0 w-0 opacity-0"
                      />
                      <span
                        className={`inline-block h-5 w-9 rounded-full transition ${
                          formData.notifications ? 'bg-indigo-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            formData.notifications ? 'translate-x-5' : 'translate-x-1'
                          } mt-0.5`}
                        />
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <label className="text-sm font-medium text-white">Two-factor authentication</label>
                      <p className="text-xs text-slate-400">Add an extra layer of security to your account</p>
                    </div>
                    <label className="relative inline-flex h-5 w-9 items-center rounded-full">
                      <input
                        type="checkbox"
                        checked={formData.twoFactor}
                        onChange={(e) => handleChange('twoFactor', e.target.checked)}
                        className="h-0 w-0 opacity-0"
                      />
                      <span
                        className={`inline-block h-5 w-9 rounded-full transition ${
                          formData.twoFactor ? 'bg-indigo-500' : 'bg-slate-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                            formData.twoFactor ? 'translate-x-5' : 'translate-x-1'
                          } mt-0.5`}
                        />
                      </span>
                    </label>
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                    <div>
                      <label className="text-sm font-medium text-white">Change password</label>
                      <p className="text-xs text-slate-400">Update your account password</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      className="px-3 py-1.5 rounded-lg bg-white/10 text-slate-300 hover:text-white text-xs font-medium transition-all"
                    >
                      <Lock size={12} className="inline mr-1" />
                      Change
                    </motion.button>
                  </div>
                </div>

                {message && (
                  <motion.div
                    className={`mt-4 p-3 rounded-lg text-sm ${
                      message.includes('success')
                        ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                        : 'bg-red-500/10 border border-red-500/20 text-red-300'
                    }}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {message}
                  </motion.div>
                )}

                <motion.button
                  onClick={handleSave}
                  disabled={saving}
                  whileHover={{ scale: 1.02, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-6 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold transition-all shadow-lg shadow-indigo-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save size={16} />
                      Save changes
                    </>
                  )}
                </motion.button>
              </GlassCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
