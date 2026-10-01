import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../../services/apiClient';
import { APP_CONFIG } from '../../config/appConfig';
import { ArrowLeft, Save, Loader2, Shield, Globe, Palette, Database, Key, Eye, EyeOff } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

interface SystemStats {
  totalUsers: number;
  totalTasks: number;
  totalReports: number;
  totalVideos: number;
  storageUsed: string;
  apiCallsToday: number;
}

interface AdminSettings {
  siteName: string;
  siteDescription: string;
  allowRegistration: boolean;
  requireEmailVerification: boolean;
  defaultRole: 'user' | 'client';
  maintenanceMode: boolean;
  maxFileSize: number;
  sessionTimeout: number;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  googleClientId: string;
  openaiApiKey: string;
  cloudinaryCloudName: string;
  cloudinaryApiKey: string;
  cloudinaryApiSecret: string;
}

export const AdminSettings: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'general' | 'security' | 'integrations' | 'appearance' | 'system'>('general');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showCloudinarySecret, setShowCloudinarySecret] = useState(false);

  const [settings, setSettings] = useState<AdminSettings>({
    siteName: 'A1 Raters',
    siteDescription: 'AI-powered evaluation platform for raters and clients',
    allowRegistration: true,
    requireEmailVerification: false,
    defaultRole: 'user',
    maintenanceMode: false,
    maxFileSize: 10,
    sessionTimeout: 24,
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: APP_CONFIG.fromEmail,
    googleClientId: '',
    openaiApiKey: '',
    cloudinaryCloudName: '',
    cloudinaryApiKey: '',
    cloudinaryApiSecret: '',
  });

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ status: string; data: AdminSettings }>('/admin/settings');
      if (response.status === 'success' && response.data) {
        setSettings(response.data);
      }
    } catch {
      // Use defaults
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiClient.get<{ status: string; data: SystemStats }>('/admin/stats');
      if (response.status === 'success' && response.data) {
        setStats(response.data);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    // Fetch-in-effect: initialize settings/stats from the backend on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSettings();
     
    fetchStats();
  }, []);

  const handleChange = (key: keyof AdminSettings, value: string | number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const response = await apiClient.post<{ status: string; message?: string }>('/admin/settings', settings);
      if (response.status === 'success') {
        setMessage('Settings saved successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        setMessage(response.message || 'Failed to save settings');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'integrations', label: 'Integrations', icon: Key },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'system', label: 'System', icon: Database },
  ];

  const renderGeneral = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Site Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Site Name</label>
          <input
            type="text"
            value={settings.siteName}
            onChange={(e) => handleChange('siteName', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Default From Email</label>
          <input
            type="email"
            value={settings.fromEmail}
            onChange={(e) => handleChange('fromEmail', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Site Description</label>
        <textarea
          value={settings.siteDescription}
          onChange={(e) => handleChange('siteDescription', e.target.value)}
          className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none h-24 resize-none"
        />
      </div>

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Registration & Access</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="text-sm font-medium text-white">Allow Public Registration</label>
              <p className="text-xs text-slate-400">Allow new users to create accounts</p>
            </div>
            <label className="relative inline-flex h-5 w-9 items-center rounded-full">
              <input
                type="checkbox"
                checked={settings.allowRegistration}
                onChange={(e) => handleChange('allowRegistration', e.target.checked)}
                className="h-0 w-0 opacity-0"
              />
              <span className={`inline-block h-5 w-9 rounded-full transition ${settings.allowRegistration ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.allowRegistration ? 'translate-x-5' : 'translate-x-1'} mt-0.5`} />
              </span>
            </label>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="text-sm font-medium text-white">Require Email Verification</label>
              <p className="text-xs text-slate-400">Users must verify email before accessing platform</p>
            </div>
            <label className="relative inline-flex h-5 w-9 items-center rounded-full">
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) => handleChange('requireEmailVerification', e.target.checked)}
                className="h-0 w-0 opacity-0"
              />
              <span className={`inline-block h-5 w-9 rounded-full transition ${settings.requireEmailVerification ? 'bg-indigo-500' : 'bg-slate-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.requireEmailVerification ? 'translate-x-5' : 'translate-x-1'} mt-0.5`} />
              </span>
            </label>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
            <div>
              <label className="text-sm font-medium text-white">Maintenance Mode</label>
              <p className="text-xs text-slate-400">Restrict access to admins only</p>
            </div>
            <label className="relative inline-flex h-5 w-9 items-center rounded-full">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleChange('maintenanceMode', e.target.checked)}
                className="h-0 w-0 opacity-0"
              />
              <span className={`inline-block h-5 w-9 rounded-full transition ${settings.maintenanceMode ? 'bg-rose-500' : 'bg-slate-600'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${settings.maintenanceMode ? 'translate-x-5' : 'translate-x-1'} mt-0.5`} />
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Defaults</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Default Role</label>
            <select
              value={settings.defaultRole}
              onChange={(e) => handleChange('defaultRole', e.target.value as 'user' | 'client')}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
            >
              <option value="user">Rater</option>
              <option value="client">Client</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Max File Size (MB)</label>
            <input
              type="number"
              min="1"
              max="100"
              value={settings.maxFileSize}
              onChange={(e) => handleChange('maxFileSize', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Session Timeout (hours)</label>
            <input
              type="number"
              min="1"
              max="168"
              value={settings.sessionTimeout}
              onChange={(e) => handleChange('sessionTimeout', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Authentication</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Google OAuth Client ID</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={settings.googleClientId}
              onChange={(e) => handleChange('googleClientId', e.target.value)}
              className="w-full px-4 py-2.5 pr-12 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
              placeholder="Enter Google Client ID"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Email (SMTP)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">SMTP Host</label>
            <input
              type="text"
              value={settings.smtpHost}
              onChange={(e) => handleChange('smtpHost', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">SMTP Port</label>
            <input
              type="number"
              value={settings.smtpPort}
              onChange={(e) => handleChange('smtpPort', parseInt(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">SMTP Username</label>
            <input
              type="text"
              value={settings.smtpUser}
              onChange={(e) => handleChange('smtpUser', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">SMTP Password</label>
            <div className="relative">
              <input
                type={showSmtpPassword ? 'text' : 'password'}
                value={settings.smtpPassword}
                onChange={(e) => handleChange('smtpPassword', e.target.value)}
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showSmtpPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">AI Services</h3>
      <div>
        <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">OpenAI API Key</label>
        <div className="relative">
          <input
            type={showOpenAIKey ? 'text' : 'password'}
            value={settings.openaiApiKey}
            onChange={(e) => handleChange('openaiApiKey', e.target.value)}
            className="w-full px-4 py-2.5 pr-12 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            placeholder="sk-proj-..."
          />
          <button
            type="button"
            onClick={() => setShowOpenAIKey(!showOpenAIKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
          >
            {showOpenAIKey ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 mt-1">Used for AI-powered image analysis in task creation</p>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Cloudinary (Media Storage)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Cloud Name</label>
            <input
              type="text"
              value={settings.cloudinaryCloudName}
              onChange={(e) => handleChange('cloudinaryCloudName', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">API Key</label>
            <input
              type="text"
              value={settings.cloudinaryApiKey}
              onChange={(e) => handleChange('cloudinaryApiKey', e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">API Secret</label>
            <div className="relative">
              <input
                type={showCloudinarySecret ? 'text' : 'password'}
                value={settings.cloudinaryApiSecret}
                onChange={(e) => handleChange('cloudinaryApiSecret', e.target.value)}
                className="w-full px-4 py-2.5 pr-12 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => setShowCloudinarySecret(!showCloudinarySecret)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showCloudinarySecret ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAppearance = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-white">Branding</h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Site Name</label>
          <input
            type="text"
            value={settings.siteName}
            onChange={(e) => handleChange('siteName', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Site Description</label>
          <textarea
            value={settings.siteDescription}
            onChange={(e) => handleChange('siteDescription', e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none h-24 resize-none"
          />
        </div>
      </div>

<div className="pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Theme Colors</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {['Primary', 'Secondary', 'Accent', 'Background'].map((color, i) => {
            const defaultColors = ['#6366f1', '#8b5cf6', '#06b6d4', '#0a0e1a'];
            return (
              <div key={color} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <input
                  type="color"
                  className="w-8 h-8 rounded border-0 cursor-pointer"
                  defaultValue={defaultColors[i]}
                />
                <span className="text-sm text-slate-300">{color}</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-500">Custom theme colors coming soon</p>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="space-y-6">
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Total Users', value: stats.totalUsers, icon: '👥' },
            { label: 'Total Tasks', value: stats.totalTasks, icon: '📋' },
            { label: 'Total Reports', value: stats.totalReports, icon: '📊' },
            { label: 'Videos', value: stats.totalVideos, icon: '🎥' },
            { label: 'Storage', value: stats.storageUsed, icon: '💾' },
            { label: 'API Calls', value: stats.apiCallsToday.toLocaleString(), icon: '🔌' },
          ].map((stat, i) => (
            <GlassCard key={i} className="p-4 text-center" delay={0.1 * i}>
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-slate-400">{stat.label}</div>
            </GlassCard>
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Maintenance Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all"
          >
            <div className="font-medium text-white mb-1">Clear Cache</div>
            <div className="text-sm text-slate-400">Clear all cached data and temporary files</div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all"
          >
            <div className="font-medium text-white mb-1">Rebuild Search Index</div>
            <div className="text-sm text-slate-400">Rebuild full-text search indexes</div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all"
          >
            <div className="font-medium text-white mb-1">Optimize Database</div>
            <div className="text-sm text-slate-400">Run database optimization and cleanup</div>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-all"
          >
            <div className="font-medium text-white mb-1">Export All Data</div>
            <div className="text-sm text-slate-400">Download complete platform data backup</div>
          </motion.button>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Danger Zone</h3>
        <div className="flex items-center justify-between p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <div>
            <div className="font-medium text-rose-300">Reset Platform</div>
            <div className="text-sm text-slate-400">Delete all users, tasks, reports, and settings. This cannot be undone.</div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="px-4 py-2 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 font-medium transition-all"
          >
            Reset Everything
          </motion.button>
        </div>
      </div>
    </div>
  );

  const renderTab = () => {
    switch (activeTab) {
      case 'general': return renderGeneral();
      case 'security': return renderSecurity();
      case 'integrations': return renderIntegrations();
      case 'appearance': return renderAppearance();
      case 'system': return renderSystem();
    }
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
              <h1 className="text-2xl font-bold text-white">Admin Settings</h1>
              <p className="text-slate-400 text-sm">Configure platform settings and integrations</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex flex-col lg:flex-row gap-6">
            <GlassCard className="lg:w-48 flex-shrink-0 p-4" delay={0.15}>
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as typeof activeTab)}
                    whileHover={{ x: 4 }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-indigo-500/20 text-indigo-300 border-l-2 border-indigo-500'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </motion.button>
                ))}
              </nav>
            </GlassCard>

            <GlassCard className="flex-1 p-6 min-w-0" delay={0.2}>
              {message && (
                <motion.div
                  className="mb-6 p-3 bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 text-sm rounded-lg flex items-center justify-between"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <span>{message}</span>
                  <button onClick={() => setMessage('')} className="text-emerald-300 hover:text-emerald-200">×</button>
                </motion.div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                {renderTab()}

                <div className="flex gap-3 pt-6 border-t border-white/10">
                  <motion.button
                    type="submit"
                    disabled={saving || loading}
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
                        Save Settings
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </GlassCard>
          </div>
        </motion.div>
      </div>
    </div>
  );
};