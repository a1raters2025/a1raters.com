import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Save, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { dataService, type TaskData } from '../../services/dataService';
import { apiClient } from '../../services/apiClient';
import { GlassCard } from '../UI/GlassCard';

export const AddTask: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.removeItem('openai_api_key');
  }, []);

  const [category, setCategory] = useState('App Store');
  const [subCategory, setSubCategory] = useState('App Store Search Result');
  const [mode, setMode] = useState<'practice' | 'test' | 'both'>('both');
  const [deadlineAt, setDeadlineAt] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [confirmClientPassword, setConfirmClientPassword] = useState('');
  const [showClientPasswords, setShowClientPasswords] = useState(false);

  const [formState, setFormState] = useState({
    query: '',
    title: '',
    subtitle: '',
    rating: 'Unacceptable',
    reason: '',
    description: '',
  });

  const [imageFile, setImageFile] = useState<string | null>(null);
  const [parsingStatus, setParsingStatus] = useState<'idle' | 'success' | 'error' | 'scanning'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const categoryMap: Record<string, string[]> = {
    'App Store': ['App Store Search Result', 'App Store Suggestion'],
    'Video': ['Video Complex', 'Video Siri Complex', 'Video Hint'],
    'Music': ['Music Search', 'Music Radio'],
    'Podcast': ['Podcast Search', 'Podcast Episode'],
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCat = e.target.value;
    setCategory(newCat);
    if (categoryMap[newCat]) {
      setSubCategory(categoryMap[newCat][0]);
    }
  };

  const analyzeImageWithAI = async (imageUrl: string) => {
    setParsingStatus('scanning');
    setErrorMessage('');

    try {
      const response = await apiClient.post<{ status: string; data: {
        query?: string;
        title?: string;
        subtitle?: string;
        description?: string;
        rating?: string;
        reason?: string;
      } }>('/tasks/analyze-image', { imageUrl });
      const content = response.data;

      setFormState((prev) => ({
        ...prev,
        query: content.query || prev.query,
        title: content.title || prev.title,
        subtitle: content.subtitle || prev.subtitle,
        description: content.description || prev.description,
        rating: content.rating || prev.rating,
        reason: content.reason || prev.reason,
      }));

      setParsingStatus('idle');
    } catch (error: unknown) {
      console.error(error);
      setParsingStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error analyzing image.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setParsingStatus('scanning');
      setErrorMessage('Uploading image to Cloudinary...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', 'Task asset');
        const response = await apiClient.upload<{ file: { url: string } }>('/files/upload', formData);
        setImageFile(response.file.url);
        await analyzeImageWithAI(response.file.url);
      } catch (error) {
        setParsingStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Image upload failed.');
      }
    }
  };

  const handleSaveTask = async () => {
    if (!formState.query || !formState.title) {
      setErrorMessage('Please ensure at least Query and Title are filled.');
      setParsingStatus('error');
      return;
    }
    if (!clientEmail.trim() || clientPassword.length < 6) {
      setErrorMessage('Enter a client email and a password with at least 6 characters.');
      setParsingStatus('error');
      return;
    }
    if (clientPassword !== confirmClientPassword) {
      setErrorMessage('Client password and confirmation must match.');
      setParsingStatus('error');
      return;
    }

    try {
      const deadline = deadlineAt ? new Date(deadlineAt) : null;
      if (deadline && Number.isNaN(deadline.getTime())) {
        setErrorMessage('Enter a valid task deadline.');
        setParsingStatus('error');
        return;
      }

      const newTask: TaskData = {
        id: Date.now().toString(),
        category,
        subCategory,
        query: formState.query,
        metadata: {
          queryType: 'App Navigational',
          distribution: 'Mid',
          spelling: 'Spelled Correctly',
          language: 'English',
          searchLinks: [
            { name: 'Google', url: `https://www.google.com/search?q=${encodeURIComponent(formState.query)}` },
          ],
        },
        result: {
          title: formState.title,
          subtitle: formState.subtitle,
          developer: formState.subtitle,
          category: category,
          imageUrl: imageFile || 'https://placehold.co/100',
          description: formState.description,
          sourceLink: '#',
          sourceName: 'View Source',
        },
        correctRating: formState.rating,
        correctComment: formState.reason,
        usageMode: mode,
        deadlineAt: deadline?.toISOString() || null,
      };

      await dataService.saveTask(newTask, { clientEmail: clientEmail.trim().toLowerCase(), clientPassword });
      setClientPassword('');
      setConfirmClientPassword('');

      setParsingStatus('success');
      setTimeout(() => setParsingStatus('idle'), 3000);
      alert('Task Created Successfully!');
    } catch (e) {
      console.error(e);
      setParsingStatus('error');
      setErrorMessage(e instanceof Error ? e.message : 'Failed to save task.');
    }
  };

  return (
    <div className={`${onClose ? 'min-h-0' : 'min-h-screen'} bg-slate-900`}>
      <div className="relative z-10 mx-auto w-full max-w-6xl px-3 py-4 sm:px-6 sm:py-8 lg:px-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex min-w-0 items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={onClose ? onClose : () => navigate('/dashboard')}
              className="mr-3 shrink-0 rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white sm:mr-4"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </motion.button>
            <h1 className="truncate text-xl font-bold text-white sm:text-2xl">Admin Task Creator</h1>
          </div>

        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Config & Image */}
          <div className="space-y-6 lg:col-span-1">
            <GlassCard className="p-4 sm:p-6" delay={0.1}>
              <h2 className="text-lg font-semibold mb-4 text-slate-200">1. Setup</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={handleCategoryChange}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                  >
                    {Object.keys(categoryMap).map((c) => (
                      <option key={c} value={c} className="text-gray-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sub Category</label>
                  <select
                    value={subCategory}
                    onChange={(e) => setSubCategory(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                  >
                    {categoryMap[category]?.map((sc) => (
                      <option key={sc} value={sc} className="text-gray-900">
                        {sc}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Rating lane</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'practice' | 'test' | 'both')}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                  >
                    <option value="practice">Practice</option>
                    <option value="test">Test</option>
                    <option value="both">Practice and test</option>
                  </select>
                </div>
                <div>
                  <h3 className="mb-2 text-sm font-semibold text-slate-200">Client sign-in</h3>
                  <label className="mb-1 block text-xs text-slate-400">Client email</label>
                  <input type="email" required value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-white outline-none focus:border-indigo-400" placeholder="client@example.com" />
                  <div className="mb-1 flex items-center justify-between">
                    <label htmlFor="client-password" className="block text-xs text-slate-400">Client password</label>
                    <button
                      type="button"
                      onClick={() => setShowClientPasswords((visible) => !visible)}
                      aria-label={showClientPasswords ? 'Hide client passwords' : 'Show client passwords'}
                      aria-pressed={showClientPasswords}
                      className="inline-flex items-center gap-1 text-xs text-indigo-300 hover:text-indigo-200"
                    >
                      {showClientPasswords ? <EyeOff size={14} /> : <Eye size={14} />}
                      {showClientPasswords ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input id="client-password" type={showClientPasswords ? 'text' : 'password'} required minLength={6} value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} className="mb-3 w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-white outline-none focus:border-indigo-400" placeholder="Uppercase, lowercase, number and symbol" />
                  <label htmlFor="confirm-client-password" className="mb-1 block text-xs text-slate-400">Confirm client password</label>
                  <input id="confirm-client-password" type={showClientPasswords ? 'text' : 'password'} required minLength={6} value={confirmClientPassword} onChange={(e) => setConfirmClientPassword(e.target.value)} className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-sm text-white outline-none focus:border-indigo-400" placeholder="Re-enter client password" />
                </div>
              </div>
            </GlassCard>

            {/* Image Upload */}
            <GlassCard className="p-4 sm:p-6" delay={0.2}>
              <h2 className="text-lg font-semibold mb-4 text-slate-200">2. Upload & Analyze (OpenAI with Gemini fallback)</h2>

              {parsingStatus === 'scanning' && (
                <motion.div
                  className="mb-4 p-3 bg-blue-900/20 text-blue-300 rounded-lg flex items-center text-sm border border-blue-500/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  AI is analyzing the uploaded image...
                </motion.div>
              )}

              <motion.div
                className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer group ${
                  parsingStatus === 'error'
                    ? 'border-red-400/50 bg-red-900/20'
                    : 'border-white/20 hover:bg-white/5'
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {imageFile ? (
                  <div className="relative">
                    <img src={imageFile} alt="Preview" className="max-h-48 mx-auto rounded-lg shadow-sm" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                      <span className="text-white font-bold text-sm">Click to Replace</span>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 flex flex-col items-center text-slate-400">
                    <Upload size={32} className="mb-2 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-sm">Upload Screenshot</span>
                  </div>
                )}
              </motion.div>
            </GlassCard>
          </div>

          {/* RIGHT: Preview Form */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="flex h-full min-w-0 flex-col p-4 sm:p-6" delay={0.3}>
              <div className="mb-6 flex flex-wrap items-start justify-between gap-2 border-b border-white/5 pb-4">
                <h2 className="flex min-w-0 items-center text-base font-semibold text-white sm:text-lg">
                  3. AI Extraction Preview
                </h2>
                  <span className="text-xs text-slate-500">Review details before saving</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Task Deadline (optional)
                  </label>
                  <input
                    type="datetime-local"
                    step="1"
                    value={deadlineAt}
                    onChange={(e) => setDeadlineAt(e.target.value)}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    The rater view will show a countdown and blink red during the final two hours.
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Search Query
                  </label>
                  <input
                    value={formState.query}
                    onChange={(e) => setFormState({ ...formState, query: e.target.value })}
                    className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-white focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none font-medium"
                    placeholder="e.g. cash app"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Result Title
                  </label>
                  <input
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none"
                    placeholder="e.g. Cash App"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Subtitle / Developer
                  </label>
                  <input
                    value={formState.subtitle}
                    onChange={(e) => setFormState({ ...formState, subtitle: e.target.value })}
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none"
                    placeholder="e.g. Square Inc."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formState.description}
                    onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none h-24 resize-none"
                    placeholder="Description..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Correct Rating
                  </label>
                  <select
                    value={formState.rating}
                    onChange={(e) => setFormState({ ...formState, rating: e.target.value })}
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                  >
                    <option value="Navigational">Navigational</option>
                    <option value="Excellent">Excellent</option>
                    <option value="Good">Good</option>
                    <option value="Acceptable">Acceptable</option>
                    <option value="Unacceptable">Unacceptable</option>
                    <option value="Perfect">Perfect</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">
                    Reason / Comment
                  </label>
                  <textarea
                    value={formState.reason}
                    onChange={(e) => setFormState({ ...formState, reason: e.target.value })}
                    className="w-full p-2.5 border border-white/10 rounded-xl bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none h-28 resize-none"
                    placeholder="Explain the rating..."
                  />
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/5 flex flex-col gap-3">
                {parsingStatus === 'error' && (
                  <motion.div
                    className="p-3 bg-red-900/20 text-red-300 rounded-lg flex items-center text-sm border border-red-500/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <AlertCircle size={16} className="mr-2" />
                    {errorMessage}
                  </motion.div>
                )}
                {parsingStatus === 'success' && (
                  <motion.div
                    className="p-3 bg-emerald-900/20 text-emerald-300 rounded-lg flex items-center text-sm border border-emerald-500/20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Task saved successfully!
                  </motion.div>
                )}

                <motion.button
                  onClick={handleSaveTask}
                  disabled={parsingStatus === 'scanning'}
                  whileHover={parsingStatus !== 'scanning' ? { scale: 1.02, y: -1 } : undefined}
                  whileTap={parsingStatus !== 'scanning' ? { scale: 0.98 } : undefined}
                  className={`w-full py-4 text-white font-bold rounded-xl flex items-center justify-center transition-all shadow-lg text-lg ${
                    parsingStatus === 'scanning'
                      ? 'bg-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:shadow-emerald-500/30'
                  }}`}
                >
                  <Save size={20} className="mr-2" />
                  {parsingStatus === 'scanning' ? 'Processing...' : 'Confirm & Create Task'}
                </motion.button>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};
