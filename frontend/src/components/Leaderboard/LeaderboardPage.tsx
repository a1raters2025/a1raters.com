import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Clock, FileText, RefreshCw, BarChart3 } from 'lucide-react';
import { authService } from '../../services/authService';
import { reportService, type EarningsLeaderboardEntry } from '../../services/reportService';
import { GlassCard } from '../UI/GlassCard';

const CATEGORIES = [
  'App Store', 'Mac App Store', 'Video', 'Video Hint', 'Music', 'Podcast',
  'AI Assist', 'App Image Accessibility', 'Manual Invoice',
];

const rankIcons: Record<number, React.ReactNode> = {
  1: <Trophy className="w-5 h-5 text-amber-400" />,
  2: <Medal className="w-5 h-5 text-slate-400" />,
  3: <Award className="w-5 h-5 text-amber-700" />,
};

const formatNaira = (amount: number) => `₦${(amount || 0).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;

export const LeaderboardPage: React.FC = () => {
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === 'admin';
  const [leaderboard, setLeaderboard] = useState<EarningsLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const category = selectedCategory === 'All' ? undefined : selectedCategory;
      const entries = await reportService.getEarningsLeaderboard({ category, limit: 50 });
      setLeaderboard(entries);
    } catch (error) {
      setLeaderboard([]);
      setLoadError(error instanceof Error ? error.message : 'Unable to load the earnings leaderboard.');
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    void loadLeaderboard();
  }, [loadLeaderboard]);

  const currentUserRank = currentUser?._id
    ? leaderboard.find((entry) => entry.userId === currentUser._id) || null
    : null;
  const currentUserPosition = currentUserRank
    ? leaderboard.findIndex((entry) => entry.userId === currentUser?._id) + 1
    : null;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <span className="eyebrow"><Trophy size={14} /> Leaderboard</span>
          <h1 className="text-3xl font-bold text-white mb-2">Top Earning Raters</h1>
          <p className="text-slate-400 text-sm">{isAdmin ? 'Ranked by earnings from approved reports, after late penalties.' : 'Recognizing the top raters.'}</p>
        </motion.section>

        {isAdmin && <motion.div
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {['All', ...CATEGORIES].map((category) => (
            <motion.button
              key={category}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${selectedCategory === category
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'}`}
            >
              {category}
            </motion.button>
          ))}
        </motion.div>}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <GlassCard strong className="overflow-hidden p-0">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">{isAdmin ? 'Top 50 by earnings' : 'Top Raters'}</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading leaderboard...</div>
            ) : loadError ? (
              <div className="p-8 text-center text-rose-300">
                <p>{loadError}</p>
                <button onClick={() => void loadLeaderboard()} className="inline-flex items-center gap-2 mt-4 rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/15">
                  <RefreshCw size={15} /> Retry
                </button>
              </div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Trophy size={48} className="mx-auto mb-3 opacity-20" />
                <p>No approved report earnings yet for this category.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const isCurrentUser = entry.userId === currentUser?._id;
                  return (
                    <motion.div
                      key={entry.userId || entry.username}
                      className={`flex items-center gap-4 p-4 transition-all ${isCurrentUser ? 'bg-indigo-500/15 border-l-2 border-indigo-400' : 'hover:bg-white/5'}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.25 }}
                    >
                      {isAdmin && <div className="w-10 flex items-center justify-center">
                        {rank <= 3 ? rankIcons[rank] : <span className="text-sm font-bold text-slate-500">{rank}</span>}
                      </div>}
                      <div className="flex-1 flex items-center gap-3 min-w-0">
                        {isAdmin && <div className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-xs text-white">
                          {entry.username?.[0]?.toUpperCase() || 'U'}
                        </div>}
                        <div className="min-w-0">
                          <span className={`block truncate font-medium ${isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
                            {entry.username}
                          </span>
                          <span className="block truncate text-xs text-slate-400">{entry.email}</span>
                        </div>
                        {isAdmin && rank <= 3 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">Top {rank}</span>}
                      </div>
                      {isAdmin && <div className="flex flex-wrap justify-end items-center gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="font-bold text-emerald-300">{formatNaira(entry.totalEarned ?? 0)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300">{entry.totalReports ?? 0} reports</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300">{entry.totalHours ?? 0}h</span>
                        </div>
                      </div>}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {isAdmin && <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Your Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardGlass label="Earnings" value={currentUserRank ? formatNaira(currentUserRank.totalEarned ?? 0) : 'Outside top 50'} icon={Trophy} color="amber" />
            <StatCardGlass label="Approved Reports" value={currentUserRank?.totalReports ?? '-'} icon={FileText} color="cyan" />
            <StatCardGlass label="Hours Worked" value={currentUserRank ? `${currentUserRank.totalHours ?? 0}h` : '-'} icon={BarChart3} color="indigo" />
            <StatCardGlass label="Category" value={selectedCategory} icon={TrendingUp} color="violet" />
          </div>
          {currentUserPosition && (
            <motion.div className="mt-4 p-4 glass-card rounded-xl" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p className="text-sm text-slate-300">
                Your current rank: <span className="font-bold text-indigo-300">#{currentUserPosition}</span>
                {selectedCategory !== 'All' && ` in ${selectedCategory}`}
              </p>
            </motion.div>
          )}
        </motion.div>}
      </div>
    </div>
  );
};

interface StatCardGlassProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'indigo' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose';
}

const colorMap: Record<string, { iconBg: string; textColor: string }> = {
  indigo: { iconBg: 'bg-indigo-500/20', textColor: 'text-indigo-300' },
  violet: { iconBg: 'bg-violet-500/20', textColor: 'text-violet-300' },
  cyan: { iconBg: 'bg-cyan-500/20', textColor: 'text-cyan-300' },
  emerald: { iconBg: 'bg-emerald-500/20', textColor: 'text-emerald-300' },
  amber: { iconBg: 'bg-amber-500/20', textColor: 'text-amber-300' },
  rose: { iconBg: 'bg-rose-500/20', textColor: 'text-rose-300' },
};

const StatCardGlass: React.FC<StatCardGlassProps> = ({ label, value, icon: Icon, color = 'indigo' }) => {
  const colors = colorMap[color];
  return (
    <GlassCard className="p-5 relative overflow-hidden" hover>
      <div className="relative z-10 text-center">
        <div className={`w-10 h-10 mx-auto ${colors.iconBg} rounded-xl flex items-center justify-center mb-3`}>
          <Icon className={`w-5 h-5 ${colors.textColor}`} />
        </div>
        <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </GlassCard>
  );
};
