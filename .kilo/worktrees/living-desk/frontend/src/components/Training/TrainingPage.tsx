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
      <section className="page-intro">
        <div>
          <span className="eyebrow">
            <BookOpen size={14} /> Learning center
          </span>
          <h1>Training library</h1>
          <p>Build confidence with the latest guidance before you start a rating session.</p>
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
      </section>

      {user?.role === 'admin' && (
        <motion.form
          className="upload-panel glass-card-strong p-6"
          onSubmit={(event) => void uploadTraining(event)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <div className="upload-icon">
            <UploadCloud size={23} />
          </div>
          <div className="upload-copy">
            <h2>Publish a training video</h2>
            <p>Videos are securely stored in Cloudinary and shared with raters and clients.</p>
          </div>
          <div className="upload-fields">
            <input name="title" required placeholder="Training title" />
            <input name="description" placeholder="Short description (optional)" />
            <input name="file" type="file" accept="video/mp4,video/quicktime,video/x-msvideo" required />
          </div>
          <motion.button
            type="submit"
            className="primary-button"
            disabled={uploading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
          >
            {uploading ? 'Publishing...' : 'Publish video'}
          </motion.button>
        </motion.form>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            className="notice glass-card-strong"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="empty-state">Loading training library...</div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Film size={28} />
          <h2>No training published yet</h2>
          <p>Your team training videos will appear here.</p>
        </div>
      ) : (
        <motion.section
          className="training-grid"
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
                <div>
                  <span className="card-label">Training video</span>
                  <h2>{item.title || item.name}</h2>
                  <p>{item.description || 'Practical guidance for accurate, consistent evaluations.'}</p>
                </div>
                <time>{new Date(item.createdAt).toLocaleDateString()}</time>
              </div>
            </motion.article>
          ))}
        </motion.section>
      )}
    </div>
  );
};
