import React from 'react';
import { authService } from '../../services/authService';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard } from '../UI/GlassCard';
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  Clock3,
  FileText,
  Plus,
  Send,
  Sparkles,
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const user = authService.getUser();

  const [selectedCategoryForModal, setSelectedCategoryForModal] = React.useState<string | null>(null);
  const [selectedModeForModal, setSelectedModeForModal] = React.useState<'practice' | 'test' | null>(null);

  const handleCategoryClick = (category: string, mode: 'practice' | 'test') => {
    if (category === 'App Store' || category === 'Video') {
      setSelectedCategoryForModal(category);
      setSelectedModeForModal(mode);
    } else {
      navigate(`/task/${mode}/${category}`);
    }
  };

  const handleSubResponse = (subType: string) => {
    if (selectedCategoryForModal && selectedModeForModal) {
      navigate(`/task/${selectedModeForModal}/${selectedCategoryForModal}?type=${encodeURIComponent(subType)}`);
      setSelectedCategoryForModal(null);
      setSelectedModeForModal(null);
    }
  };

  const categoryStyles: Record<string, { gradient: string; textColor: string }> = {
    'App Store': { gradient: 'from-blue-500 to-cyan-400', textColor: 'text-white' },
    'Video': { gradient: 'from-violet-600 to-fuchsia-500', textColor: 'text-white' },
    'Music': { gradient: 'from-emerald-500 to-teal-400', textColor: 'text-white' },
    'Podcast': { gradient: 'from-orange-500 to-amber-400', textColor: 'text-white' },
  };

  const categories = ['App Store', 'Video', 'Music', 'Podcast'];

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'App Store':
        return '📱';
      case 'Video':
        return '🎬';
      case 'Music':
        return '🎵';
      case 'Podcast':
        return '🎙️';
      default:
        return category[0];
    }
  };

  return (
    <div className="dashboard-page-shell bg-slate-900 relative overflow-hidden">
      {/* Ambient Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-900/20 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-900/20 blur-3xl" />
      </div>

      {/* Sub-menu Modal for Regular Navigation */}
      <AnimatePresence>
        {selectedCategoryForModal && selectedModeForModal && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setSelectedCategoryForModal(null);
                setSelectedModeForModal(null);
              }}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
              <motion.div
                key="panel"
                initial={{ opacity: 0, scale: 0.94, y: 18 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="glass-card-strong p-8 w-full max-w-sm pointer-events-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-2xl font-bold text-white mb-2">{selectedCategoryForModal}</h3>
                <p className="text-gray-400 mb-6 text-sm">Select a task type to proceed.</p>

                <div className="space-y-3">
                  {selectedCategoryForModal === 'App Store' && (
                    <>
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => handleSubResponse('search result')}
                        className="w-full text-left px-5 py-4 rounded-xl bg-gray-700/50 hover:bg-blue-900/30 text-gray-200 hover:text-blue-400 font-bold transition-all border border-gray-700 hover:border-blue-500/50 flex items-center justify-between group"
                      >
                        Search Result
                        <span className="text-gray-500 group-hover:text-blue-400">→</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => handleSubResponse('suggestion')}
                        className="w-full text-left px-5 py-4 rounded-xl bg-gray-700/50 hover:bg-blue-900/30 text-gray-200 hover:text-blue-400 font-bold transition-all border border-gray-700 hover:border-blue-500/50 flex items-center justify-between group"
                      >
                        Suggestion
                        <span className="text-gray-500 group-hover:text-blue-400">→</span>
                      </motion.button>
                    </>
                  )}

                  {selectedCategoryForModal === 'Video' && (
                    <>
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => handleSubResponse('complex')}
                        className="w-full text-left px-5 py-4 rounded-xl bg-gray-700/50 hover:bg-purple-900/30 text-gray-200 hover:text-purple-400 font-bold transition-all border border-gray-700 hover:border-purple-500/50 flex items-center justify-between group"
                      >
                        Video Complex
                        <span className="text-gray-500 group-hover:text-purple-400">→</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => handleSubResponse('siri complex')}
                        className="w-full text-left px-5 py-4 rounded-xl bg-gray-700/50 hover:bg-purple-900/30 text-gray-200 hover:text-purple-400 font-bold transition-all border border-gray-700 hover:border-purple-500/50 flex items-center justify-between group"
                      >
                        Video Siri Complex
                        <span className="text-gray-500 group-hover:text-purple-400">→</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ x: 4 }}
                        onClick={() => handleSubResponse('hint')}
                        className="w-full text-left px-5 py-4 rounded-xl bg-gray-700/50 hover:bg-purple-900/30 text-gray-200 hover:text-purple-400 font-bold transition-all border border-gray-700 hover:border-purple-500/50 flex items-center justify-between group"
                      >
                        Video Hint
                        <span className="text-gray-500 group-hover:text-purple-400">→</span>
                      </motion.button>
                    </>
                  )}
                </div>

                <motion.button
                  whileHover={{ x: 4 }}
                  onClick={() => {
                    setSelectedCategoryForModal(null);
                    setSelectedModeForModal(null);
                  }}
                  className="mt-8 w-full py-3 text-gray-500 font-medium hover:text-gray-300 transition-colors text-sm"
                >
                  Cancel
                </motion.button>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <div className="relative z-10 dashboard-page">
        {/* Welcome Back Card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <GlassCard strong hover={false} animateIn={false} className="welcome-card">
            <div className="welcome-copy">
              <motion.span
                className="eyebrow"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                <Sparkles size={14} /> Rater workspace
              </motion.span>

              <motion.h1
                className="welcome-title"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                Welcome back, <span className="gradient-text">{user?.username}</span>
              </motion.h1>

              <motion.p
                className="welcome-subtext"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Your evaluation queue is ready. Choose a workflow below or continue where you left off.
              </motion.p>

              <motion.div
                className="welcome-meta"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <span><Clock3 size={15} /> Flexible practice</span>
                <span><ClipboardCheck size={15} /> Quality-first reviews</span>
              </motion.div>
            </div>

            <div className="welcome-actions">
              <motion.div
                className="action-primary-row"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-glass-primary action-primary"
                  onClick={() => navigate('/task/practice/App Store')}
                >
                  <ClipboardCheck size={17} /> Start practice <ArrowRight size={16} />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-glass action-secondary"
                  onClick={() => navigate('/history', { state: { openInvoice: true } })}
                >
                  <FileText size={16} /> Submit invoice
                </motion.button>
              </motion.div>

              <motion.div
                className="action-row"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-glass"
                  onClick={() => navigate('/report')}
                >
                  <Send size={15} /> Report work
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="btn-glass"
                  onClick={() => navigate('/history')}
                >
                  <BookOpen size={15} /> View history
                </motion.button>
                {user?.role === 'admin' && (
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="btn-glass"
                    onClick={() => navigate('/add-task')}
                  >
                    <Plus size={15} /> Add task
                  </motion.button>
                )}
              </motion.div>
            </div>
          </GlassCard>
        </motion.section>

        {/* Category Section */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="dashboard-section-heading">
            <div>
              <span className="eyebrow"><Sparkles size={14} /> Evaluation lanes</span>
              <h2>Choose a category</h2>
            </div>
            <button className="text-link" onClick={() => navigate('/training')}>
              Review training <ArrowRight size={15} />
            </button>
          </div>

          <div className="category-grid">
            {categories.map((category, index) => {
              const style = categoryStyles[category] || categoryStyles['App Store'];

              return (
                <GlassCard
                  key={category}
                  delay={index * 0.08}
                  className={`category-card category-${category.toLowerCase().replace(' ', '-')}`}
                >
                  <motion.div
                    className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.08 }}
                  />

                  <div className="p-8 text-center relative z-10 flex flex-col h-full">
                    <motion.div
                      className={`h-20 w-20 mx-auto ${style.textColor} backdrop-blur-sm rounded-2xl flex items-center justify-center mb-6 shadow-inner text-3xl font-bold`}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      {getCategoryIcon(category)}
                    </motion.div>

                    <h3 className="text-2xl font-bold text-white mb-8 tracking-wide">{category}</h3>

                    <div className="mt-auto flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCategoryClick(category, 'practice')}
                        className={`flex-1 py-3 px-4 border border-white/30 hover:bg-white text-white hover:text-gray-900 font-bold rounded-xl transition-all duration-200 text-sm backdrop-blur-sm`}
                      >
                        Practice
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05, y: -2 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleCategoryClick(category, 'test')}
                        className={`flex-1 py-3 px-4 bg-white text-gray-900 font-bold rounded-xl hover:scale-105 transition-all duration-200 text-sm shadow-lg`}
                      >
                        Test
                      </motion.button>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
