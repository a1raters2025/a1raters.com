import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, Clock, Target, BarChart3 } from 'lucide-react';
import { authService } from '../../services/authService';
import { testHistoryService, type LeaderboardEntry } from '../../services/testHistoryService';
import { GlassCard } from '../UI/GlassCard';

const rankIcons: Record<number, React.ReactNode> = {
  1: <Trophy className="w-5 h-5 text-amber-400" />,
  2: <Medal className="w-5 h-5 text-slate-400" />,
  3: <Award className="w-5 h-5 text-amber-700" />,
};

const CATEGORIES = ['App Store', 'Video', 'Music', 'Podcast'];

export const LeaderboardPage: React.FC = () => {
  const currentUser = authService.getUser();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const loadLeaderboard = async () => {
    try {
      const category = selectedCategory === 'All' ? undefined : selectedCategory;
      const data = await testHistoryService.getLeaderboard({ category, limit: 50 });
      setLeaderboard(data.length > 0 ? data : getLocalLeaderboard(category));
    } catch {
      setLeaderboard(getLocalLeaderboard(selectedCategory === 'All' ? undefined : selectedCategory));
    } finally {
      setLoading(false);
    }
  };

  const getLocalLeaderboard = (category?: string): LeaderboardEntry[] => {
    const allRaters = new Map<string, { scores: number[]; totalTests: number; totalTime: number }>();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith('a1_test_history_')) continue;

      const parts = key.replace('a1_test_history_', '').split('_');
      const username = parts[0] || '';
      const cat = parts[2] || '';

      if (selectedCategory !== 'All' && cat !== category) continue;
      if (category && cat !== category) continue;

      const stored = localStorage.getItem(key);
      if (!stored) continue;

      let history;
      try {
        history = JSON.parse(stored);
      } catch {
        continue;
      }

      if (!history.scores || !Array.isArray(history.scores)) continue;

      const existing = allRaters.get(username) || { scores: [], totalTests: 0, totalTime: 0 };
      existing.scores = [...existing.scores, ...history.scores];
      existing.totalTests += history.attempts || 0;
      existing.totalTime += history.timeSpent || 0;
      allRaters.set(username, existing);
    }

    return Array.from(allRaters.entries())
      .map(([username, data]) => ({
        username,
        bestScore: data.scores.length > 0 ? Math.max(...data.scores) : 0,
        averageScore: data.scores.length > 0 ? Math.round((data.scores.reduce((a, b) => a + b, 0) / data.scores.length) * 100) / 100 : 0,
        totalTests: data.totalTests,
        bestTime: data.totalTime,
      }))
      .sort((a, b) => b.bestScore - a.bestScore)
      .slice(0, 20);
  };

  useEffect(() => {
    // Fetch-in-effect: populate leaderboard from service on mount / category change.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLeaderboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const currentUserRank = currentUser?.username && leaderboard.length > 0
    ? leaderboard.find((e) => e.username === currentUser.username) || null
    : null;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <span className="eyebrow">
            <Trophy size={14} /> Leaderboard
          </span>
          <h1 className="text-3xl font-bold text-white mb-2">Top Raters</h1>
          <p className="text-slate-400 text-sm">See how you rank against other evaluators.</p>
        </motion.section>

        {/* Category Filter */}
        <motion.div
          className="flex gap-2 mb-6 overflow-x-auto pb-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          {['All', ...CATEGORIES].map((cat) => (
            <motion.button
              key={cat}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30'
                  : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
              }}`}
            >
              {cat}
            </motion.button>
          ))}
        </motion.div>

        {/* Leaderboard List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <GlassCard strong className="overflow-hidden p-0">
            <div className="p-4 border-b border-white/10">
              <h2 className="text-lg font-semibold text-white">Rankings</h2>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-400">Loading leaderboard...</div>
            ) : leaderboard.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Trophy size={48} className="mx-auto mb-3 opacity-20" />
                <p>No leaderboard data yet. Complete some tasks to appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {leaderboard.map((entry, idx) => {
                  const rank = idx + 1;
                  const isCurrentUser = entry.username === currentUser?.username;
                  const isTop3 = rank <= 3;

                  return (
                    <motion.div
                      key={entry.username}
                      className={`flex items-center gap-4 p-4 transition-all ${
                        isCurrentUser ? 'bg-indigo-500/15 border-l-2 border-indigo-400' : 'hover:bg-white/5'
                      }}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03, duration: 0.3 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="w-10 flex items-center justify-center">
                        {isTop3 ? (
                          rankIcons[rank]
                        ) : (
                          <span className="text-sm font-bold text-slate-500">{rank}</span>
                        )}
                      </div>

                      <div className="flex-1 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center font-bold text-xs text-white">
                          {entry.username?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <span className={`font-medium ${isCurrentUser ? 'text-indigo-300' : 'text-white'}`}>
                          {entry.username}
                        </span>
                        {isTop3 && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                            Top {rank}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-6 text-sm">
                        <div className="flex items-center gap-1.5">
                          <Target className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-bold text-white">{entry.bestScore}</span>
                          <span className="text-slate-500">/10</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <TrendingUp className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300">{entry.averageScore}% avg</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-300">{entry.totalTests} tests</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* User Stats */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-white mb-4">Your Progress</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCardGlass
              label="Best Score"
              value={currentUserRank?.bestScore ?? '-'}
              icon={Trophy}
              color="amber"
              delay={0.35}
            />
            <StatCardGlass
              label="Avg. Score"
              value={`${currentUserRank?.averageScore ?? 0}%`}
              icon={BarChart3}
              color="cyan"
              delay={0.4}
            />
            <StatCardGlass
              label="Tests Taken"
              value={currentUserRank?.totalTests ?? 0}
              icon={Target}
              color="indigo"
              delay={0.45}
            />
            <StatCardGlass
              label="Category"
              value={selectedCategory}
              icon={TrendingUp}
              color="violet"
              delay={0.5}
            />
          </div>

          {currentUserRank && (
            <motion.div
              className="mt-4 p-4 glass-card rounded-xl"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.4 }}
            >
              <p className="text-sm text-slate-300">
                Your current rank: <span className="font-bold text-indigo-300">#{leaderboard.findIndex((e) => e.username === currentUser?.username) + 1}</span>
                {selectedCategory !== 'All' && ` in ${selectedCategory}`}
              </p>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

interface StatCardGlassProps {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color?: 'indigo' | 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose';
  delay?: number;
}

const colorMap: Record<string, { iconBg: string; textColor: string }> = {
  indigo: { iconBg: 'bg-indigo-500/20', textColor: 'text-indigo-300' },
  violet: { iconBg: 'bg-violet-500/20', textColor: 'text-violet-300' },
  cyan: { iconBg: 'bg-cyan-500/20', textColor: 'text-cyan-300' },
  emerald: { iconBg: 'bg-emerald-500/20', textColor: 'text-emerald-300' },
  amber: { iconBg: 'bg-amber-500/20', textColor: 'text-amber-300' },
  rose: { iconBg: 'bg-rose-500/20', textColor: 'text-rose-300' },
};

const StatCardGlass: React.FC<StatCardGlassProps> = ({ label, value, icon: Icon, color = 'indigo', delay = 0 }) => {
  const c = colorMap[color];
  return (
    <GlassCard delay={delay} className="p-5 relative overflow-hidden" hover>
      <div className="relative z-10 text-center">
        <motion.div
          className={`w-10 h-10 mx-auto ${c.iconBg} rounded-xl flex items-center justify-center mb-3`}
          whileHover={{ rotate: 5, scale: 1.1 }}
          transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
          <Icon className={`w-5 h-5 ${c.textColor}`} />
        </motion.div>
        <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
        <p className="text-xl font-bold text-white">{value}</p>
      </div>
    </GlassCard>
  );
};
