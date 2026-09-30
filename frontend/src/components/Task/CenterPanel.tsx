import React from 'react';
import { motion } from 'framer-motion';
import type { TaskData } from '../../services/dataService';
import { ExternalLink } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

interface CenterPanelProps {
  task: TaskData;
}

export const CenterPanel: React.FC<CenterPanelProps> = ({ task }) => {
  return (
    <GlassCard className="p-6 h-full" delay={0.15}>
      <motion.div
        className="flex flex-col sm:flex-row sm:items-start sm:space-x-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <motion.img
          src={task.result.imageUrl || 'https://placehold.co/100'}
          alt={task.result.title}
          className="w-24 h-24 rounded-xl object-cover bg-gray-100 flex-shrink-0 mb-4 sm:mb-0"
          whileHover={{ scale: 1.05 }}
          transition={{ type: 'spring', stiffness: 300, damping: 17 }}
          loading="lazy"
        />
        <div className="flex-1 min-w-0">
          <motion.h2
            className="text-2xl font-semibold text-indigo-300 mb-1"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            {task.result.title}
          </motion.h2>

          {task.result.subtitle && (
            <motion.p
              className="text-lg text-slate-300 mb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {task.result.subtitle}
            </motion.p>
          )}

          <motion.div
            className="text-sm text-slate-400 space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
          >
            {task.result.developer && <p>{task.result.developer}</p>}
            {task.result.category && <p>{task.result.category}</p>}
          </motion.div>

          {task.result.sourceLink && (
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <a
                href={task.result.sourceLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-indigo-300 hover:text-indigo-200 hover:underline"
              >
                {task.result.sourceName || 'View Source'}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            </motion.div>
          )}

          {task.result.description && (
            <motion.div
              className="mt-5 p-4 rounded-xl bg-white/5 border border-white/5 text-sm text-slate-200"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              {task.result.description}
            </motion.div>
          )}
        </div>
      </motion.div>
    </GlassCard>
  );
};
