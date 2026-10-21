import React from 'react';
import { motion } from 'framer-motion';
import type { TaskData } from '../../services/dataService';
import { GlassCard } from '../UI/GlassCard';

interface LeftPanelProps {
  task: TaskData;
}

export const LeftPanel: React.FC<LeftPanelProps> = ({ task }) => {
  return (
    <GlassCard className="p-6 h-full" delay={0.1}>
      <h2 className="text-xl font-bold mb-4 text-white">{task.query}</h2>

      <div className="space-y-4">
        <motion.div
          className="p-4 rounded-xl bg-white/5 border border-white/5"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <h3 className="text-sm font-semibold text-slate-300 mb-3 border-b border-white/5 pb-1.5">
            Input Metadata
          </h3>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between">
              <dt className="text-slate-400">Query type</dt>
              <dd className="text-white text-right">{task.metadata.queryType}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Distribution</dt>
              <dd className="text-white text-right">{task.metadata.distribution}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Spelling</dt>
              <dd className="text-white text-right">{task.metadata.spelling}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">Language</dt>
              <dd className="text-white text-right">{task.metadata.language}</dd>
            </div>
          </dl>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-sm font-medium text-slate-400 mb-2">Search links</h3>
          <div className="flex flex-col space-y-1.5">
            {task.metadata.searchLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-300 hover:text-indigo-200 text-sm hover:underline flex items-center gap-1.5"
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19V5H5v14h14zm-2-6.5A2.5 2.5 0 0 0 15.5 14c0 1.38-.72 2.53-1.79 3.16L11 20h8v-7h-2z" />
                </svg>
                {link.name}
              </a>
            ))}
          </div>
        </motion.div>
      </div>
    </GlassCard>
  );
};
