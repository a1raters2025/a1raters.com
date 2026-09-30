import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { dataService, type TaskData } from '../../services/dataService';
import { ArrowLeft, Search, MoreVertical, Edit, Trash2, Plus, Loader2, Eye, Download, Save } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';
import { AddTask } from './AddTask';

export const TaskManagement: React.FC = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all');
  const [selectedTask, setSelectedTask] = useState<TaskData | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'view' | 'edit'>('view');
  const [showAddTask, setShowAddTask] = useState(false);

  const categories = ['App Store', 'Video', 'Music', 'Podcast'];
  const modes = ['practice', 'test', 'both'];

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const allTasks = await dataService.getTasks();
      setTasks(allTasks);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch-in-effect: load tasks from dataService on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTasks();
  }, []);

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.query.toLowerCase().includes(search.toLowerCase()) ||
      task.result.title.toLowerCase().includes(search.toLowerCase()) ||
      task.category.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    const matchesMode = modeFilter === 'all' || task.usageMode === modeFilter;
    return matchesSearch && matchesCategory && matchesMode;
  });

  const handleOpenModal = (mode: 'view' | 'edit', task: TaskData) => {
    setModalMode(mode);
    setSelectedTask(task);
    setShowModal(true);
  };

  const handleDelete = async (task: TaskData) => {
    if (!confirm(`Delete task "${task.result.title}"? This action cannot be undone.`)) return;
    try {
      await dataService.deleteTask(task.id);
      fetchTasks();
    } catch {
      alert('Failed to delete task');
    }
  };

  const handleEdit = async (updatedTask: TaskData) => {
    try {
      await dataService.updateTask(updatedTask.id, updatedTask);
      fetchTasks();
      setShowModal(false);
    } catch {
      alert('Failed to update task');
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'App Store': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'Video': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'Music': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'Podcast': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getModeColor = (mode?: string) => {
    switch (mode) {
      case 'practice': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'test': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'both': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
    }
  };

  const getRatingColor = (rating?: string) => {
    switch (rating) {
      case 'Perfect': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'Excellent': return 'text-green-400 bg-green-500/10 border-green-500/20';
      case 'Good': return 'text-lime-400 bg-lime-500/10 border-lime-500/20';
      case 'Acceptable': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'Unacceptable': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'Navigational': return 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
      default: return 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="task-management-header flex justify-between items-center mb-8 flex-wrap gap-4"
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
              <h1 className="text-2xl font-bold text-white">Task Management</h1>
              <p className="text-slate-400 text-sm">Manage evaluation tasks and content</p>
            </div>
          </div>
          <div className="task-management-actions flex gap-3">
            <motion.button
              onClick={() => setShowAddTask(true)}
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all"
            >
              <Plus size={16} /> Add Task
            </motion.button>
            <motion.button
              onClick={() => {
                const csv = tasks.map(t => ({
                  ID: t.id,
                  Category: t.category,
                  'Sub Category': t.subCategory,
                  Query: t.query,
                  Title: t.result.title,
                  Subtitle: t.result.subtitle,
                  Developer: t.result.developer,
                  Rating: t.correctRating,
                  Comment: t.correctComment,
                  Mode: t.usageMode,
                }));
                const headers = Object.keys(csv[0] || {}).join(',');
                const rows = csv.map(r => Object.values(r).map(v => `"${v}"`).join(',')).join('\n');
                const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tasks-export.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}
              whileHover={{ scale: 1.03 }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold rounded-xl transition-all"
            >
              <Download size={16} /> Export
            </motion.button>
          </div>
        </motion.div>

        {showAddTask && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowAddTask(false)}
          >
            <motion.div
              className="w-full max-w-6xl h-[90vh] glass-card-strong rounded-2xl shadow-2xl overflow-hidden"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <AddTask onClose={() => { setShowAddTask(false); fetchTasks(); }} />
            </motion.div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <GlassCard className="task-management-card p-6" delay={0.15}>
            <div className="task-management-filters flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1 w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search tasks..."
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
                <select
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                >
                  <option value="all">All Modes</option>
                  {modes.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                </select>
              </div>
              <div className="text-sm text-slate-400 flex items-center">
                {filteredTasks.length} of {tasks.length} tasks
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
                      <th className="pb-3 pr-4">Task</th>
                      <th className="pb-3 pr-4 hidden md:table-cell">Category</th>
                      <th className="pb-3 pr-4 hidden lg:table-cell">Mode</th>
                      <th className="pb-3 pr-4 hidden lg:table-cell">Query</th>
                      <th className="pb-3 pr-4 hidden xl:table-cell">Rating</th>
                      <th className="pb-3 pr-4 hidden xl:table-cell">Subcategory</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-12 text-slate-500">
                          No tasks found
                        </td>
                      </tr>
                    ) : (
                      filteredTasks.map((task) => (
                        <tr
                          key={task.id}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="py-4 pr-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={task.result.imageUrl || 'https://placehold.co/100'}
                                alt={task.result.title}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                              <div>
                                <div className="font-medium text-white truncate max-w-[200px]">{task.result.title}</div>
                                <div className="text-[10px] text-slate-500">{task.result.subtitle || task.result.developer || '—'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 pr-4 hidden md:table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getCategoryColor(task.category)}`}>
                              {task.category}
                            </span>
                          </td>
                          <td className="py-4 pr-4 hidden lg:table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getModeColor(task.usageMode)}`}>
                              {task.usageMode ? task.usageMode.charAt(0).toUpperCase() + task.usageMode.slice(1) : ''}
                            </span>
                          </td>
                          <td className="py-4 pr-4 hidden lg:table-cell text-slate-300 truncate max-w-[150px]">
                            {task.query}
                          </td>
                          <td className="py-4 pr-4 hidden xl:table-cell">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getRatingColor(task.correctRating)}`}>
                              {task.correctRating}
                            </span>
                          </td>
                          <td className="py-4 pr-4 hidden xl:table-cell text-slate-400">
                            {task.subCategory}
                          </td>
                          <td className="py-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleOpenModal('view', task)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                                aria-label="View task"
                              >
                                <Eye size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleOpenModal('edit', task)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-indigo-300 transition-colors"
                                aria-label="Edit task"
                              >
                                <Edit size={16} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => handleDelete(task)}
                                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-rose-300 transition-colors"
                                aria-label="Delete task"
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

        {showModal && selectedTask && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="w-full max-w-4xl glass-card-strong p-6 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">
                  {modalMode === 'view' ? 'Task Details' : 'Edit Task'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <MoreVertical size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <img
                    src={selectedTask.result.imageUrl || 'https://placehold.co/400'}
                    alt={selectedTask.result.title}
                    className="w-full h-48 object-cover rounded-xl"
                  />
                </div>

                <div className="md:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-2">{selectedTask.result.title}</h3>
                  <p className="text-slate-400 mb-4">{selectedTask.result.description || 'No description'}</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Category</label>
                  <select
                    value={selectedTask.category}
                    onChange={(e) => setSelectedTask({ ...selectedTask, category: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Sub Category</label>
                  <input
                    type="text"
                    value={selectedTask.subCategory}
                    onChange={(e) => setSelectedTask({ ...selectedTask, subCategory: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Mode</label>
                  <select
                    value={selectedTask.usageMode || 'practice'}
                    onChange={(e) => setSelectedTask({ ...selectedTask, usageMode: e.target.value as 'practice' | 'test' | 'both' })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
                  >
                    <option value="practice">Practice</option>
                    <option value="test">Test</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Query</label>
                  <input
                    type="text"
                    value={selectedTask.query}
                    onChange={(e) => setSelectedTask({ ...selectedTask, query: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Result Title</label>
                  <input
                    type="text"
                    value={selectedTask.result.title}
                    onChange={(e) => setSelectedTask({ ...selectedTask, result: { ...selectedTask.result, title: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Subtitle / Developer</label>
                  <input
                    type="text"
                    value={selectedTask.result.subtitle || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, result: { ...selectedTask.result, subtitle: e.target.value, developer: e.target.value } })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Correct Rating</label>
                  <select
                    value={selectedTask.correctRating || 'Unacceptable'}
                    onChange={(e) => setSelectedTask({ ...selectedTask, correctRating: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 transition-all text-sm outline-none appearance-none"
                    disabled={modalMode === 'view'}
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
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Reason / Comment</label>
                  <textarea
                    value={selectedTask.correctComment || ''}
                    onChange={(e) => setSelectedTask({ ...selectedTask, correctComment: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none h-24 resize-none"
                    disabled={modalMode === 'view'}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/10">
                  <motion.button
                    type="button"
                    onClick={() => setShowModal(false)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex-1 py-3 px-4 rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 font-semibold transition-all"
                  >
                    Close
                  </motion.button>
                  {modalMode === 'view' && (
                    <motion.button
                      onClick={() => setModalMode('edit')}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-4 rounded-xl bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 font-semibold transition-all"
                    >
                      Edit
                    </motion.button>
                  )}
                  {modalMode === 'edit' && (
                    <motion.button
                      onClick={() => handleEdit(selectedTask)}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 transition-all"
                    >
                      <Save size={16} />
                      Save Changes
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </div>
    </div>
  );
};