import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Upload, Save, CheckCircle, AlertCircle, Key, Loader2 } from 'lucide-react';
import { dataService, type TaskData } from '../../services/dataService';
import { apiClient } from '../../services/apiClient';
import { PasswordField } from '../UI/PasswordField';
import { GlassCard } from '../UI/GlassCard';

export const AddTask: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const navigate = useNavigate();

  const [category, setCategory] = useState('App Store');
  const [subCategory, setSubCategory] = useState('App Store Search Result');
  const [mode, setMode] = useState<'practice' | 'test'>('practice');

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('openai_api_key') || '');
  const [showKeyInput, setShowKeyInput] = useState(false);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('openai_api_key', key);
  };

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

  const analyzeImageWithGPT = async (base64Image: string) => {
    if (!apiKey) {
      setParsingStatus('error');
      setErrorMessage('OpenAI API Key is missing. Click the key icon to add it.');
      setShowKeyInput(true);
      return;
    }

    setParsingStatus('scanning');
    setErrorMessage('');

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a data extraction assistant. Analyze the screenshot and extract:
                1. Search Query (Top search bar or context)
                2. "User Intent" (Deduce what the user is looking for based on the query. e.g. 'Navigational - facebook app')
                3. Result Title (The main app/video/content name)
                4. Subtitle (Developer/Artist/Channel)
                5. Description (Short snippet or intro)
                6. Suggest a "Correct Rating" (Navigational, Excellent, Good, Acceptable, Unacceptable).
                7. Write a short "Reason" for the rating.

              Return strictly Valid JSON with keys: query, intent, title, subtitle, description, rating, reason. Do not wrap in markdown code blocks.`,
            },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this image.' },
                { type: 'image_url', image_url: { url: base64Image } },
              ],
            },
          ],
          max_tokens: 500,
          response_format: { type: 'json_object' },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const msg = data.error?.message || 'Unknown OpenAI Error';
        if (msg.includes('quota')) {
          throw new Error('OpenAI Quota Exceeded. Please check your billing plan.');
        }
        throw new Error(msg);
      }

      let contentString = data.choices[0].message.content;
      contentString = contentString.replace(/```json/g, '').replace(/```/g, '').trim();

      const content = JSON.parse(contentString);
      console.log('GPT Response:', content);

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
        await analyzeImageWithGPT(response.file.url);
      } catch (error) {
        setParsingStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'Image upload failed.');
      }
    }
  };

  const handleSaveTask = () => {
    if (!formState.query || !formState.title) {
      setErrorMessage('Please ensure at least Query and Title are filled.');
      setParsingStatus('error');
      return;
    }

    try {
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
      };

      dataService.saveTask(newTask);

      setParsingStatus('success');
      setTimeout(() => setParsingStatus('idle'), 3000);
      alert('Task Created Successfully!');
    } catch (e) {
      console.error(e);
      setParsingStatus('error');
      setErrorMessage('Failed to save task.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={onClose ? onClose : () => navigate('/dashboard')}
              className="mr-4 text-slate-400 hover:text-white"
            >
              <ArrowLeft size={24} />
            </motion.button>
            <h1 className="text-2xl font-bold text-white">Admin Task Creator</h1>
          </div>

          <div className="relative">
            <motion.button
              onClick={() => setShowKeyInput(!showKeyInput)}
              whileHover={{ scale: 1.03 }}
              className={`flex items-center px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                apiKey
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                  : 'bg-slate-700/50 text-slate-400 border-white/10'
              }}`}
            >
              <Key size={14} className="mr-1" />
              {apiKey ? 'API Key Set' : 'Set API Key'}
            </motion.button>

            {showKeyInput && (
              <motion.div
                className="absolute top-full right-0 mt-2 w-72 glass-card-strong p-4 shadow-xl z-50"
                initial={{ opacity: 0, scale: 0.96, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">
                  OpenAI API Key
                </label>
                <PasswordField
                  value={apiKey}
                  onChange={(e) => saveApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full p-2 rounded-lg border border-white/10 bg-white/5 text-white text-sm mb-2 focus:outline-none focus:border-indigo-400"
                />
                <p className="text-[10px] text-slate-500">
                  Key is stored locally in your browser.
                </p>
              </motion.div>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT: Config & Image */}
          <div className="space-y-6 lg:col-span-1">
            <GlassCard className="p-6" delay={0.1}>
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
                  <label className="block text-sm font-medium text-slate-300 mb-1">Mode</label>
                  <select
                    value={mode}
                    onChange={(e) => setMode(e.target.value as 'practice' | 'test')}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                  >
                    <option value="practice">Practice</option>
                    <option value="test">Test</option>
                  </select>
                </div>
              </div>
            </GlassCard>

            {/* Image Upload */}
            <GlassCard className="p-6" delay={0.2}>
              <h2 className="text-lg font-semibold mb-4 text-slate-200">2. Upload & Analyze (OpenAI)</h2>

              {parsingStatus === 'scanning' && (
                <motion.div
                  className="mb-4 p-3 bg-blue-900/20 text-blue-300 rounded-lg flex items-center text-sm border border-blue-500/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  OpenAI is analyzing...
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
            <GlassCard className="p-6 h-full flex flex-col" delay={0.3}>
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  3. AI Extraction Preview
                  {!apiKey && (
                    <span className="ml-2 text-[10px] bg-yellow-500/10 text-yellow-300 px-2 py-0.5 rounded-full border border-yellow-500/20">
                      Requires API Key
                    </span>
                  )}
                </h2>
                <span className="text-xs text-slate-500">Review details before saving</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1">
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
