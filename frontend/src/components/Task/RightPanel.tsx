import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../UI/GlassCard';

interface RightPanelProps {
  onNext: (rating: string, comment: string) => void;
  onPrevious: () => void;
  canProceed: boolean;
  isFirst: boolean;
}

export const RightPanel: React.FC<RightPanelProps> = ({ onNext, onPrevious, canProceed, isFirst }) => {
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');

  const ratings = ['Perfect', 'Excellent', 'Good', 'Acceptable', 'Unacceptable'];

  const handleSubmit = () => {
    if (rating && comment && canProceed) {
      onNext(rating, comment);
    }
  };

  const ratingColors: Record<string, string> = {
    Perfect: 'text-emerald-400',
    Excellent: 'text-blue-400',
    Good: 'text-yellow-400',
    Acceptable: 'text-orange-400',
    Unacceptable: 'text-red-400',
  };

  return (
    <GlassCard className="p-6 h-full flex flex-col" delay={0.2}>
      <motion.div
        className="mb-5 p-3.5 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <span className="text-sm text-white font-medium">Your evaluation</span>
        <motion.span
          className={`text-sm font-bold ${rating ? ratingColors[rating] : 'text-slate-500'}`}
          initial={{ scale: 1 }}
          key={rating || 'empty'}
          animate={{ scale: rating ? 1.05 : 1 }}
        >
          {rating || 'Not selected'}
        </motion.span>
      </motion.div>

      <div className="task-form-fields space-y-5 flex-1">
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <label className="block text-sm font-medium text-slate-300 mb-2">
            How relevant is this result?
          </label>
          <select
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none appearance-none"
          >
            <option value="" disabled className="text-gray-700">
              Select rating...
            </option>
            {ratings.map((r) => (
              <option key={r} value={r} className="text-gray-900">
                {r}
              </option>
            ))}
          </select>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Comments <span className="text-red-400">*</span>
          </label>
          <textarea
            rows={5}
            className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none resize-none"
            placeholder="Explain your rating..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </motion.div>
      </div>

      <div className="mt-5 pt-4 border-t border-white/10 flex space-x-3">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={onPrevious}
          disabled={isFirst}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
            isFirst
              ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              : 'bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10'
          }}`}
        >
          Previous
        </motion.button>
        <motion.button
          whileHover={{ scale: rating && comment && canProceed ? 1.03 : 1 }}
          whileTap={{ scale: rating && comment && canProceed ? 0.97 : 1 }}
          onClick={handleSubmit}
          disabled={!rating || !comment || !canProceed}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
            !rating || !comment || !canProceed
              ? 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
          }}`}
        >
          Next Task
        </motion.button>
      </div>
    </GlassCard>
  );
};
