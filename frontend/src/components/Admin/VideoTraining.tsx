import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apiClient } from '../../services/apiClient';
import { ArrowLeft, Plus, Video, MoreVertical, Edit, Trash2, Loader2, Eye, Search } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

interface VideoTraining {
  _id?: string;
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  thumbnailUrl?: string;
  category: string;
  duration?: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export const VideoTraining: React.FC = () => {
  const navigate = useNavigate();
  const [videos, setVideos] = useState<VideoTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedVideo, setSelectedVideo] = useState<VideoTraining | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'create'>('view');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    videoUrl: '',
    thumbnailUrl: '',
    category: 'General',
    duration: '',
    isPublished: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);

  const categories = ['General', 'Onboarding', 'Task Guidelines', 'Rating Guidelines', 'Tools & Tips', 'Best Practices', 'Advanced'];

  const fetchVideos = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<{ status: string; data: VideoTraining[] }>('/admin/videos');
      if (response.status === 'success' && response.data) {
        setVideos(response.data);
      } else {
        setVideos([]);
      }
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch-in-effect: load videos from backend on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter(video => {
    const matchesSearch = video.title.toLowerCase().includes(search.toLowerCase()) ||
      video.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || video.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleOpenModal = (mode: 'view' | 'edit' | 'create', video?: VideoTraining) => {
    setModalMode(mode);
    if (mode === 'create') {
      setFormData({
        title: '',
        description: '',
        videoUrl: '',
        thumbnailUrl: '',
        category: 'General',
        duration: '',
        isPublished: true,
      });
    } else if (video) {
      setSelectedVideo(video);
      setFormData({
        title: video.title,
        description: video.description,
        videoUrl: video.videoUrl,
        thumbnailUrl: video.thumbnailUrl || '',
        category: video.category,
        duration: video.duration || '',
        isPublished: video.isPublished,
      });
    }
    setShowModal(true);
    setError('');
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB.');
      return;
    }

    setUploadingThumbnail(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', 'Video thumbnail');
      const response = await apiClient.upload<{ file: { url: string } }>('/files/upload', formData);
      setFormData(prev => ({ ...prev, thumbnailUrl: response.file.url }));
    } catch {
      setError('Failed to upload thumbnail.');
    } finally {
      setUploadingThumbnail(false);
      (e.target as HTMLInputElement).value = '';
    }
  };

  const handleSave = async () => {
    if (!formData.title || !formData.videoUrl) {
      setError('Title and Video URL are required.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = { ...formData };
      if (modalMode === 'create') {
        const response = await apiClient.post<{ status: string; data: VideoTraining }>('/admin/videos', payload);
        if (response.status === 'success') {
          fetchVideos();
        }
      } else if (modalMode === 'edit' && selectedVideo) {
        const response = await apiClient.patch<{ status: string; data: VideoTraining }>(`/admin/videos/${selectedVideo.id}`, payload);
        if (response.status === 'success') {
          fetchVideos();
        }
      }
      setShowModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (video: VideoTraining) => {
    if (!confirm(`Delete video "${video.title}"? This action cannot be undone.`)) return;
    try {
      await apiClient.delete(`/admin/videos/${video.id}`);
      fetchVideos();
    } catch {
      alert('Failed to delete video');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'General': 'bg-slate-500/20 text-slate-300 border-slate-500/30',
      'Onboarding': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      'Task Guidelines': 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
      'Rating Guidelines': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      'Tools & Tips': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      'Best Practices': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      'Advanced': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    };
    return colors[category] || 'bg-slate-500/20 text-slate-300 border-slate-500/30';
  };

  const getDuration = (seconds?: string) => {
    if (!seconds) return '—';
    const secs = parseInt(seconds);
    if (isNaN(secs)) return seconds;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins}:${remSecs.toString().padStart(2, '0')}`;
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
              <h1 className="text-2xl font-bold text-white">Video Training</h1>
              <p className="text-slate-400 text-sm">Manage training videos for raters</p>
            </div>
          </div>
          <motion.button
            onClick={() => handleOpenModal('create')}
            whileHover={{ scale: 1.03 }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-purple-500/30 transition-all"
          >
            <Plus size={16} /> Add Video
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
                  placeholder="Search videos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="text-sm text-slate-400 flex items-center">
                {filteredVideos.length} of {videos.length} videos
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 size={24} className="text-indigo-400 animate-spin" />
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Video size={48} className="mx-auto mb-4 text-slate-600" />
                <p className="text-lg">No training videos found</p>
                <p className="text-sm mt-1">Click "Add Video" to create your first training video</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredVideos.map((video) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="group relative bg-white/5 rounded-xl overflow-hidden border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="relative aspect-video bg-slate-800">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video size={32} className="text-slate-600" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-3 left-3 right-3 flex justify-between opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className={`px-2 py-1 rounded text-xs font-medium border ${video.isPublished ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'}`}>
                          {video.isPublished ? 'Published' : 'Draft'}
                        </span>
                        <span className="px-2 py-1 bg-black/50 text-white text-xs rounded">
                          {getDuration(video.duration)}
                        </span>
                      </div>
                      <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleOpenModal('view', video)}
                          className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center text-white"
                          aria-label="View video"
                        >
                          <Eye size={14} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleOpenModal('edit', video)}
                          className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center text-indigo-300"
                          aria-label="Edit video"
                        >
                          <Edit size={14} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleDelete(video)}
                          className="w-8 h-8 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center text-rose-300"
                          aria-label="Delete video"
                        >
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-white truncate mb-1">{video.title}</h3>
                      <p className="text-sm text-slate-400 line-clamp-2 mb-3">{video.description}</p>
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border ${getCategoryColor(video.category)}`}>
                          {video.category}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
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
              className="w-full max-w-2xl glass-card-strong p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {modalMode === 'create' ? 'Add Training Video' : modalMode === 'edit' ? 'Edit Video' : 'Video Details'}
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
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Title</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    placeholder="Video title"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Video URL</label>
                  <input
                    type="url"
                    required
                    value={formData.videoUrl}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    placeholder="https://example.com/video.mp4 or YouTube/Vimeo URL"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Thumbnail</label>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleThumbnailUpload}
                      className="hidden"
                      id="thumbnail-upload"
                    />
                    <motion.button
                      type="button"
                      onClick={() => document.getElementById('thumbnail-upload')?.click()}
                      disabled={modalMode === 'view' || uploadingThumbnail}
                      whileHover={{ scale: 1.02 }}
                      className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white font-medium transition-all disabled:opacity-50"
                    >
                      {uploadingThumbnail ? 'Uploading...' : formData.thumbnailUrl ? 'Change Thumbnail' : 'Upload Thumbnail'}
                    </motion.button>
                    {formData.thumbnailUrl && (
                      <motion.button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, thumbnailUrl: '' }))}
                        disabled={modalMode === 'view'}
                        whileHover={{ scale: 1.02 }}
                        className="w-10 h-10 rounded-xl border border-white/10 bg-white/5 text-rose-400 hover:bg-rose-500/10 transition-all"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    )}
                  </div>
                  {formData.thumbnailUrl && (
                    <img
                      src={formData.thumbnailUrl}
                      alt="Thumbnail preview"
                      className="mt-2 max-h-32 rounded-lg"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Duration (seconds)</label>
                  <input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    placeholder="Optional"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none h-24 resize-none"
                    placeholder="Video description..."
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                  <div>
                    <label className="text-sm font-medium text-white">Published</label>
                    <p className="text-xs text-slate-400">Visible to raters on the platform</p>
                  </div>
                  <label className="relative inline-flex h-5 w-9 items-center rounded-full">
                    <input
                      type="checkbox"
                      checked={formData.isPublished}
                      onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                      className="h-0 w-0 opacity-0"
                      disabled={modalMode === 'view'}
                    />
                    <span
                      className={`inline-block h-5 w-9 rounded-full transition ${
                        formData.isPublished ? 'bg-indigo-500' : 'bg-slate-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          formData.isPublished ? 'translate-x-5' : 'translate-x-1'
                        } mt-0.5`}
                      />
                    </span>
                  </label>
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
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold shadow-lg shadow-purple-500/30 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all"
                    >
                      {saving ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Video size={16} />
                          {modalMode === 'create' ? 'Create Video' : 'Save Changes'}
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