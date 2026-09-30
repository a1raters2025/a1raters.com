import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, CheckCircle2, Film, UploadCloud } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import { authService } from '../../services/authService';

type TrainingItem = { _id: string; name: string; title?: string; description?: string; url: string; resourceType: string; createdAt: string };

export const TrainingPage: React.FC = () => {
  const user = authService.getUser();
  const [items, setItems] = useState<TrainingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);

  const loadTraining = async () => {
    try {
      const response = await apiClient.get<{ training: TrainingItem[] }>('/files/training');
      setItems(response.training);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to load training.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load training materials on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadTraining();
  }, []);

  const uploadTraining = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!data.get('file')) return;
    setUploading(true);
    setMessage('');
    try {
      data.set('audience', JSON.stringify(['user', 'client']));
      await apiClient.upload('/files/upload', data);
      form.reset();
      setMessage('Training video published successfully.');
      await loadTraining();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page-stack">
      <motion.section
        className="page-intro"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex-1 min-w-0">
          <span className="eyebrow">
            <BookOpen size={14} /> Learning center
          </span>
          <h1>Training library</h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl">
            Build confidence with the latest guidance before you start a rating session.
          </p>
        </div>
        {user?.role === 'admin' && (
          <motion.span
            className="status-pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <CheckCircle2 size={15} /> Admin publishing enabled
          </motion.span>
        )}
      </motion.section>

      {user?.role === 'admin' && (
        <motion.form
          className="glass-card-strong p-4 sm:p-6"
          onSubmit={(event) => void uploadTraining(event)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            <div className="flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-xl bg-indigo-500/20">
              <UploadCloud size={23} className="text-indigo-300" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-white">Publish a training video</h2>
              <p className="text-sm text-slate-400 mt-1">Videos are securely stored in Cloudinary and shared with raters and clients.</p>
            </div>
            <div className="flex flex-col gap-3 w-full sm:w-auto">
              <div className="flex-1 min-w-0">
                <input
                  name="title"
                  required
                  placeholder="Training title"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  name="description"
                  placeholder="Short description (optional)"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                />
              </div>
              <div className="flex-1 min-w-0">
                <input
                  name="file"
                  type="file"
                  accept="video/mp4,video/quicktime,video/x-msvideo"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-500 file:to-violet-600 file:text-white hover:file:from-indigo-600 hover:file:to-violet-700 cursor-pointer"
                />
              </div>
            </div>
            <motion.button
              type="submit"
              className="btn-glass-primary px-6 py-2.5 w-full sm:w-auto"
              disabled={uploading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              {uploading ? 'Publishing...' : 'Publish video'}
            </motion.button>
          </div>
        </motion.form>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            className="glass-card-strong p-4 text-center"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="empty-state">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-indigo-500 border-t-transparent" />
          <span>Loading training library...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Film size={28} />
          <h2>No training published yet</h2>
          <p>Your team training videos will appear here.</p>
        </div>
      ) : (
        <motion.section
          className="training-grid-responsive"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {items.map((item, idx) => (
            <motion.article
              key={item._id}
              className="training-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.5 }}
              whileHover={{ scale: 1.02, y: -4 }}
            >
              <div className="video-frame">
                <video controls preload="metadata" src={item.url} />
              </div>
              <div className="training-card-body">
                <div className="card-label">Training video</div>
                <h2 className="mt-1 text-lg font-semibold text-white truncate">{item.title || item.name}</h2>
                <p className="mt-2 text-sm text-slate-400 line-clamp-3">{item.description || 'Practical guidance for accurate, consistent evaluations.'}</p>
                <time className="block mt-4 text-xs text-slate-500">
                  {new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </time>
              </div>
            </motion.article>
          ))}
        </motion.section>
      )}
    </div>
  );
};
