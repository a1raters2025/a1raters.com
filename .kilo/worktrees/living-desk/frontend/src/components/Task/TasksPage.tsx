import React from 'react';
import { ClipboardCheck, Clock3, Play, Target, Trophy } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '../UI/GlassCard';

const taskLanes = [
  { name: 'App Store', description: 'Evaluate search results and app suggestions.', icon: 'AS', tone: 'task-lane-cyan', type: 'search result' },
  { name: 'Video', description: 'Review complex video search experiences.', icon: 'VI', tone: 'task-lane-violet', type: 'complex' },
  { name: 'Music', description: 'Rate music discovery and radio results.', icon: 'MU', tone: 'task-lane-emerald', type: '' },
  { name: 'Podcast', description: 'Evaluate podcast search and episode relevance.', icon: 'PO', tone: 'task-lane-amber', type: '' },
];

type TasksPageProps = { defaultMode?: 'practice' | 'test' };

export const TasksPage: React.FC<TasksPageProps> = ({ defaultMode = 'practice' }) => {
  const navigate = useNavigate();

  const openTask = (category: string, mode: 'practice' | 'test', type: string) => {
    const query = type ? `?type=${encodeURIComponent(type)}` : '';
    navigate(`/task/${mode}/${category}${query}`);
  };

  const openDefault = (category: string, type: string) => openTask(category, defaultMode, type);

  return <div className="tasks-page page-stack">
    <motion.section className="page-intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div><span className="eyebrow"><ClipboardCheck size={14} /> {defaultMode === 'test' ? 'Test workspace' : 'Task workspace'}</span><h1>{defaultMode === 'test' ? 'Choose a test lane' : 'Choose a rating lane'}</h1><p>{defaultMode === 'test' ? 'Select a category to begin a timed evaluation.' : 'Start with practice to build confidence or begin a timed evaluation.'}</p></div>
      <div className="task-summary"><span><Clock3 size={15} /> 10 min tests</span><span><Target size={15} /> Quality scoring</span></div>
    </motion.section>
    <section className="task-quick-actions">
      <button className="btn-glass-primary" onClick={() => openDefault('App Store', 'search result')}><Play size={16} /> {defaultMode === 'test' ? 'Start test' : 'Continue practice'}</button>
      <button className="btn-glass" onClick={() => navigate('/leaderboard')}><Trophy size={16} /> View leaderboard</button>
    </section>
    <section className="task-lane-grid">{taskLanes.map((lane, index) => <GlassCard key={lane.name} delay={index * .07} className={`task-lane-card ${lane.tone}`}><div className="task-lane-top"><span className="task-lane-icon">{lane.icon}</span><span className="task-lane-status">Ready</span></div><h2>{lane.name}</h2><p>{lane.description}</p><div className="task-lane-actions"><button className="btn-glass" onClick={() => openTask(lane.name, 'practice', lane.type)}>Practice</button><button className="btn-glass-primary" onClick={() => openTask(lane.name, 'test', lane.type)}>Start test</button></div></GlassCard>)}</section>
  </div>;
};
