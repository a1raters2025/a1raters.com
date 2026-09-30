import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { dataService, type TaskData } from '../../services/dataService';
import { authService } from '../../services/authService';
import { LeftPanel } from './LeftPanel';
import { CenterPanel } from './CenterPanel';
import { RightPanel } from './RightPanel';
import { motion } from 'framer-motion';
import { Check, X, Home } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

interface FeedbackState {
  isCorrect: boolean;
  message: string;
}

export const TaskLayout: React.FC = () => {
  const { category: routeCategory, mode: routeMode } = useParams<{ category: string; mode: string }>();
  const category = routeCategory || 'App Store';
  const mode = routeMode || 'practice';
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const filterType = queryParams.get('type');

  const [taskIndex, setTaskIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(600);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [tasksLoading, setTasksLoading] = useState(true);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  const [testFinished, setTestFinished] = useState(false);
  const [canReview, setCanReview] = useState(false);

  const [historyAttempts, setHistoryAttempts] = useState(0);

  const isPractice = mode === 'practice';
  const isTest = mode === 'test';

  const currentUser = authService.getUser();
  const isGodswill = currentUser?.role === 'admin';

  const testId = `${category || 'General'}_${filterType || 'Standard'}`;

  useEffect(() => {
    let mounted = true;
    dataService.getTasks(category || '').then((allTasks) => {
      if (!mounted) return;
      const filtered = allTasks.filter((t) => {
        const modeMatch =
          (!t.usageMode || t.usageMode === 'both') ||
          (isPractice && t.usageMode === 'practice') ||
          (isTest && t.usageMode === 'test');

        if (!modeMatch) return false;

        if (filterType) {
          return t.subCategory.toLowerCase().includes(filterType.toLowerCase());
        }

        return true;
      });
      setTasks(filtered);
      setTasksLoading(false);
    });
    return () => {
      mounted = false;
    };
  }, [category, isPractice, isTest, filterType]);

  useEffect(() => {
    if (isTest && currentUser) {
      const history = dataService.getTestHistory(currentUser.username, testId);
      // Sync derived attempt state from local history on test selection.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHistoryAttempts(history.attempts);

      if (!isGodswill && history.attempts >= 2) {
        setTestFinished(true);
        setCanReview(true);
      }
    }
  }, [isTest, currentUser?.username, testId, isGodswill]);

  const currentTask = tasks[taskIndex];

  useEffect(() => {
    if (isTest) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 0) return 0;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isTest]);

  const handleNext = (rating: string) => {
    if (isPractice) {
      if (!feedback) {
        const isCorrect = rating === currentTask.correctRating;
        setFeedback({
          isCorrect,
          message: isCorrect
            ? `Correct! ${currentTask.correctComment}`
            : `Incorrect. The correct rating is ${currentTask.correctRating}. ${currentTask.correctComment}`,
        });
        return;
      } else {
        setFeedback(null);
      }
    }

    if (isTest) {
      if (rating === currentTask.correctRating) {
        setScore((prev) => prev + 1);
      }
    }

    if (taskIndex < tasks.length - 1) {
      setTaskIndex((prev) => prev + 1);
    } else {
      if (isTest) {
        finishTest(rating);
      } else {
        alert('Practice completed!');
        navigate('/dashboard');
      }
    }
  };

  const finishTest = (lastRating: string) => {
    if (!currentUser) return;

    let finalScore = score;
    if (currentTask && lastRating === currentTask.correctRating) {
      finalScore += 1;
    }

    const history = dataService.saveTestResult(currentUser.username, testId, finalScore);

    const total = tasks.length;
    const percent = (finalScore / total) * 100;
    const passed = percent >= 90;
    const attemptsUsed = history.attempts;

    setHistoryAttempts(attemptsUsed);
    setTestFinished(true);
    setScore(finalScore);

    if (passed || attemptsUsed >= 2 || isGodswill) {
      setCanReview(true);
    } else {
      setCanReview(false);
    }
  };

  const handlePrevious = () => {
    if (taskIndex > 0) {
      setTaskIndex((prev) => prev - 1);
      setFeedback(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Render Results
  if (testFinished) {
    const percent = Math.round((score / tasks.length) * 100);
    return (
      <div className="task-page-shell bg-slate-900">
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <GlassCard strong className="p-8 sm:p-10">
              <div className="text-center mb-10">
                <motion.h2
                  className="text-3xl sm:text-4xl font-bold mb-4"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                >
                  {percent >= 90 ? 'Test Passed!' : 'Test Completed'}
                </motion.h2>

                <motion.div
                  className={`text-6xl font-extrabold mb-2 ${percent >= 90 ? 'text-emerald-400' : 'text-amber-400'}`}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.15, type: 'spring', stiffness: 300 }}
                >
                  {percent}%
                </motion.div>

                <p className="text-slate-300">
                  Score: {score} / {tasks.length}
                </p>
                <p className="text-sm font-semibold text-slate-400 mt-1">
                  Attempt: {historyAttempts} / {isGodswill ? '∞' : '2'}
                </p>
              </div>

              {canReview ? (
                <div className="space-y-5">
                  <h3 className="text-xl font-bold text-white border-b border-white/10 pb-3">
                    Review Correct Answers
                  </h3>
                  <div className="max-h-[55vh] overflow-y-auto space-y-4 pr-2">
                    {tasks.map((t, idx) => (
                      <GlassCard
                        key={t.id}
                        className="p-4"
                        delay={(idx % 5) * 0.05}
                        hover={false}
                        animateIn={false}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold text-white">Q{idx + 1}: {t.query}</span>
                          <span className="text-indigo-300 font-mono text-sm">{t.correctRating}</span>
                        </div>
                        <div className="text-sm text-slate-300 mb-2">
                          <span className="font-semibold">Result:</span> {t.result.title}
                        </div>
                        <div className="text-sm text-emerald-200 bg-emerald-900/20 p-2 rounded-lg border border-emerald-500/20">
                          {t.correctComment}
                        </div>
                      </GlassCard>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 bg-amber-900/10 rounded-xl border border-amber-500/20">
                  <h3 className="text-lg font-bold text-amber-300 mb-2">Not Passed</h3>
                  <p className="text-amber-200">
                    You did not meet the 90% threshold. Detailed feedback is hidden.
                  </p>
                  {historyAttempts < 2 && (
                    <p className="mt-2 font-semibold text-amber-200">
                      You have {2 - historyAttempts} attempt(s) remaining.
                    </p>
                  )}
                </div>
              )}

              <div className="mt-10 flex justify-center">
                <motion.button
                  whileHover={{ scale: 1.03, y: -1 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate('/dashboard')}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-bold transition-all shadow-lg shadow-indigo-500/30"
                >
                  Return to Dashboard
                </motion.button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </div>
    );
  };

  if (tasksLoading) {
    return (
      <div className="task-page-shell bg-slate-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-slate-400"
        >
          Loading tasks...
        </motion.div>
      </div>
    );
  }

  if (!currentTask) {
    return (
      <div className="task-page-shell bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-slate-400">
          No tasks found for this category.
        </div>
      </div>
    );
  }

  return (
    <div className="task-page-shell bg-slate-900">
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header Bar */}
        <motion.header
          className="glass-header border-b border-white/5 text-white px-4 sm:px-6 py-3 flex justify-between items-center shadow-md z-10"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="flex items-center font-semibold text-lg">
              <span className="text-white">A1 Raters</span>
            </div>
            <div className="h-6 w-px bg-white/10 hidden sm:block" />
            <p className="text-blue-100 text-sm">
              {isTest ? (
                <span className="text-red-400 font-bold mr-2">TEST MODE</span>
              ) : (
                <span className="text-blue-300 font-bold mr-2">PRACTICE</span>
              )}
              <span className="hidden sm:inline">{currentTask.category} - {currentTask.subCategory}</span>
              <span className="sm:hidden">{currentTask.category}</span>
            </p>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4">
            <motion.span
              className="px-3 py-1 bg-blue-500/10 text-blue-300 rounded-lg text-xs sm:text-sm font-medium border border-blue-500/30"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              Tasks Left: {tasks.length - taskIndex}
            </motion.span>

            {isTest && (
              <motion.div
                className={`text-lg sm:text-xl font-mono font-bold ${timeLeft <= 60 ? 'text-red-400' : 'text-slate-200'}`}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 }}
              >
                {formatTime(timeLeft)}
              </motion.div>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/dashboard')}
              className="flex items-center px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-all text-sm font-medium"
            >
              <Home className="w-4 h-4 mr-1" /> Home
            </motion.button>
          </div>
        </motion.header>

        {/* Feedback Overlay (Practice Mode) */}
        {isPractice && feedback && (
          <motion.div
            className={`px-6 py-4 border-b-2 ${
              feedback.isCorrect ? 'bg-emerald-900/30 border-emerald-500' : 'bg-red-900/30 border-red-500'
            }`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-start max-w-7xl mx-auto">
              <div
                className={`p-2 rounded-full mr-4 ${
                  feedback.isCorrect ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                }`}
              >
                {feedback.isCorrect ? <Check size={24} /> : <X size={24} />}
              </div>
              <div>
                <h3
                  className={`font-bold text-lg ${
                    feedback.isCorrect ? 'text-emerald-300' : 'text-red-300'
                  }`}
                >
                  {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
                </h3>
                <p className="text-slate-200 mt-1">{feedback.message}</p>
                <p className="text-slate-400 text-sm mt-2">Click "Next Task" to continue.</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <motion.main
          className="task-main-content p-4 overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
        >
          <div className="task-panel-grid grid grid-cols-12 gap-4">
            <div className="task-panel task-panel-left col-span-12 md:col-span-3 overflow-y-auto">
              <LeftPanel task={currentTask} />
            </div>
            <div className="task-panel task-panel-center col-span-12 md:col-span-6 overflow-y-auto">
              <CenterPanel task={currentTask} />
            </div>
            <div className="task-panel task-panel-right task-form-panel col-span-12 md:col-span-3 overflow-y-auto">
              <RightPanel
                key={currentTask.id}
                onNext={handleNext}
                onPrevious={handlePrevious}
                canProceed={!isPractice || Boolean(feedback)}
                isFirst={taskIndex === 0}
              />
            </div>
          </div>
        </motion.main>
      </div>
    </div>
  );
};
