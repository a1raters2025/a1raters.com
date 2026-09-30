import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';
import { reportService } from '../../services/reportService';
import { Save, Plus, Trash2, Home, Clock, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

interface ReportEntry {
  id: number;
  raterName: string;
  profileName: string;
  email: string;
  category: string;
  proxy: string;
  status: string;
  tasksWorked: string;
  hoursWorked: string;
  submissionTime: string;
  latePenalty: number;
}

interface CategoryOption {
  name: string;
  displayName: string;
  rph: number;
}

const CATEGORIES: CategoryOption[] = [
  { name: 'AI Assist', displayName: 'AI Assist - 15/hour', rph: 15 },
  { name: 'AI Assist', displayName: 'AI Assist - 20/hour', rph: 20 },
  { name: 'App Image Accessibility', displayName: 'App Image Accessibility - 20/hour', rph: 20 },
  { name: 'App Store', displayName: 'App Store - 37/hour', rph: 37 },
  { name: 'Mac App Store', displayName: 'Mac App Store - 38/hour', rph: 38 },
  { name: 'Music', displayName: 'Music - 30/hour', rph: 30 },
  { name: 'Music', displayName: 'Music - 35/hour', rph: 35 },
  { name: 'Podcast', displayName: 'Podcast - 35/hour', rph: 35 },
  { name: 'Video', displayName: 'Video - 25/hour', rph: 25 },
  { name: 'Video Hint', displayName: 'Video Hint - 35/hour', rph: 35 },
];

const PROXIES = ['US', 'UK', 'Japan', 'China', 'Germany', 'France', 'Canada', 'Australia'];
const LATE_DEADLINE_HOUR = 9;
const LATE_PENALTY_AMOUNT = 10000;

const getSubmissionTimeInfo = (submissionTime: string) => {
  if (!submissionTime) return { isLate: false, penalty: 0 };
  const d = new Date(submissionTime);
  const hour = d.getHours();
  const minute = d.getMinutes();
  const isLate = hour > LATE_DEADLINE_HOUR || (hour === LATE_DEADLINE_HOUR && minute > 0);
  return { isLate, penalty: isLate ? LATE_PENALTY_AMOUNT : 0 };
};

export const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const loggedInUser = authService.getUser();
  const isAdmin = loggedInUser?.role === 'admin';

  const [raterName, setRaterName] = useState(loggedInUser?.username || '');
  const [profileName, setProfileName] = useState('');
  const [email, setEmail] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('');
  const [proxy, setProxy] = useState('');
  const [status, setStatus] = useState('Active');
  const [tasksWorked, setTasksWorked] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');

  const [savedEmails, setSavedEmails] = useState<string[]>([]);
  const [reportList, setReportList] = useState<ReportEntry[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSavedEmails(authService.getReportEmails());

    const now = new Date();
    if (now.getHours() < 11) {
      now.setDate(now.getDate() - 1);
    }
    setDate(now.toISOString().split('T')[0]);
  }, []);

  const selectedCat = category ? CATEGORIES.find((c) => c.displayName === category) : undefined;
  const calculatedHours = tasksWorked && selectedCat
    ? (Number(tasksWorked) / selectedCat.rph).toFixed(2)
    : '';

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoursWorked(calculatedHours);
  }, [calculatedHours]);

  const handleAddEntry = () => {
    if (!raterName || !profileName || !email || !category || !proxy || !tasksWorked || !hoursWorked) {
      alert('Please fill in all fields before adding.');
      return;
    }

    const hasLongNumbers = (str: string) => /\d{5,}/.test(str);

    if (hasLongNumbers(profileName)) {
      alert('Profile Name cannot contain phone numbers or sequences of more than 4 digits.');
      return;
    }

    if (hasLongNumbers(email)) {
      alert('Email cannot contain phone numbers or sequences of more than 4 digits.');
      return;
    }

    const submissionTime = new Date().toISOString();
    const { penalty } = getSubmissionTimeInfo(submissionTime);

    const newEntry: ReportEntry = {
      id: Date.now(),
      raterName,
      profileName,
      email,
      category: selectedCat ? selectedCat.name : category,
      proxy,
      status,
      tasksWorked,
      hoursWorked: calculatedHours,
      submissionTime,
      latePenalty: penalty,
    };

    setReportList([...reportList, newEntry]);
    authService.saveReportEmail(email);

    setTasksWorked('');
    setHoursWorked('');
    setStatus('Active');
    setCategory('');
    setProxy('');
  };

  const removeEntry = (id: number) => {
    setReportList(reportList.filter((r) => r.id !== id));
  };

  const handleSubmitAll = () => {
    if (reportList.length === 0) return;

    const reportsToSave = reportList.map((r) => ({
      ...r,
      date: date,
      category: r.category,
      status: r.status as 'Active' | 'Restricted' | 'Sacked',
    }));

    reportService.saveReports(reportsToSave);

    setMessage(`${reportList.length} Report(s) submitted successfully!`);
    setTimeout(() => {
      setMessage('');
      setReportList([]);
      navigate('/dashboard');
    }, 2000);
  };

  const totalLatePenalty = reportList.reduce((acc, curr) => acc + curr.latePenalty, 0);
  const totalEstimatedEarnings = reportList.reduce((acc, curr) => acc + (Number(curr.hoursWorked) || 0), 0) * 2000;
  const totalReportPenalty = totalLatePenalty > 0;
  const totalEarningsWithPenalty = totalEstimatedEarnings - totalLatePenalty;

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors font-medium"
          >
            <Home className="w-4 h-4 mr-2" /> Home
          </button>
          <div className="text-slate-400 font-medium">Date: {date}</div>
        </div>

        <div className="flex justify-between items-end mb-6">
          <h2 className="text-2xl font-bold text-white">Batch Report Submission</h2>
          {isAdmin && (
            <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-xs font-bold uppercase">
              Admin Mode
            </span>
          )}
        </div>

        {message && (
          <motion.div
            className="bg-emerald-900/20 border border-emerald-500/20 text-emerald-200 p-4 rounded-xl text-center font-medium mb-6"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {message}
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <GlassCard className="lg:col-span-1 p-6" delay={0.1}>
            <motion.h3
              className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              New Entry
            </motion.h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Rater Name</label>
                {isAdmin ? (
                  <input
                    type="text"
                    value={raterName}
                    onChange={(e) => setRaterName(e.target.value)}
                    placeholder="Enter rater name"
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                  />
                ) : (
                  <input
                    type="text"
                    value={raterName}
                    readOnly
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-slate-300 cursor-not-allowed font-semibold"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Account Profile Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                  placeholder="e.g. Profile A"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  list="email-history"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none"
                  placeholder="Enter or select email"
                />
                <datalist id="email-history">
                  {savedEmails.map((e) => (
                    <option key={e} value={e} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">Evaluation Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none appearance-none"
                >
                  <option value="">Select...</option>
                  {CATEGORIES.map((c) => (
                    <option key={c.displayName} value={c.displayName} className="text-gray-900">
                      {c.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Proxy</label>
                  <select
                    value={proxy}
                    onChange={(e) => setProxy(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none appearance-none"
                  >
                    <option value="">Select...</option>
                    {PROXIES.map((p) => (
                      <option key={p} value={p} className="text-gray-900">
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-white focus:border-indigo-400 focus:bg-white/10 transition-all text-sm outline-none appearance-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Restricted">Restricted</option>
                    <option value="Sacked">Sacked</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-indigo-950/30 p-4 rounded-xl border border-indigo-500/20">
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-1.5">Tasks</label>
                  <input
                    type="number"
                    min="0"
                    value={tasksWorked}
                    onChange={(e) => setTasksWorked(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-white/10 text-white placeholder-indigo-300/50 focus:border-indigo-400 transition-all text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-indigo-200 mb-1.5">Hours</label>
                  <input
                    type="number"
                    readOnly
                    value={hoursWorked}
                    className="w-full px-4 py-2.5 rounded-xl border border-indigo-500/30 bg-indigo-950/50 text-indigo-200 font-bold transition-all text-sm outline-none"
                  />
                </div>
              </div>

              <motion.button
                onClick={handleAddEntry}
                whileHover={{ scale: 1.02, y: -1 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 text-white font-bold rounded-xl flex items-center justify-center transition-all bg-gradient-to-r from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/30"
              >
                <Plus className="w-5 h-5 mr-2" /> Add Entry
              </motion.button>
            </div>
          </GlassCard>

          {/* Report List */}
          <div className="lg:col-span-2">
            <GlassCard className="p-0" delay={0.2}>
              {reportList.length > 0 ? (
                <>
                  <div className="flex justify-between items-center mb-4 px-6 py-4 border-b border-white/5">
                    <div>
                      <h3 className="text-lg font-bold text-white">Reports Queue ({reportList.length})</h3>
                      <div className="text-sm font-medium text-emerald-300 mt-1">
                        Total Est. Earnings: ₦
                        {(
                          reportList.reduce((acc, curr) => acc + (Number(curr.hoursWorked) || 0), 0) * 2000
                        ).toLocaleString()}
                      </div>
                      {totalReportPenalty && (
                        <div className="text-sm font-medium text-red-300 mt-1 flex items-center">
                          <AlertTriangle className="w-4 h-4 mr-1" />
                          Late Submission Penalty: -₦{totalLatePenalty.toLocaleString()}
                        </div>
                      )}
                      {totalReportPenalty && (
                        <div className="text-sm font-medium text-amber-300 mt-1">
                          Net Total After Penalty: ₦{totalEarningsWithPenalty.toLocaleString()}
                        </div>
                      )}
                    </div>
                    <motion.button
                      onClick={handleSubmitAll}
                      whileHover={{ scale: 1.03, y: -1 }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg shadow-lg transition-colors"
                    >
                      <Save className="w-4 h-4 mr-2" /> Submit All
                    </motion.button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white/5 text-xs uppercase tracking-wide text-slate-400">
                        <tr>
                          <th className="px-4 py-3">Profile</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Hours</th>
                          <th className="px-4 py-3">Submitted</th>
                          <th className="px-4 py-3">Late Penalty</th>
                          <th className="px-4 py-3 text-right">...</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {reportList.map((entry) => {
                          const { isLate } = getSubmissionTimeInfo(entry.submissionTime);
                          return (
                            <motion.tr
                              key={entry.id}
                              className="hover:bg-white/5 transition-colors"
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                            >
                              <td className="px-4 py-4">
                                <div className="font-bold text-white">{entry.profileName}</div>
                                <div className="text-xs text-slate-400">{entry.email}</div>
                              </td>
                              <td className="px-4 py-4 text-slate-300">
                                {entry.category}
                                <span className="block text-xs uppercase text-slate-500">{entry.proxy}</span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-lg font-bold text-indigo-300">
                                {entry.hoursWorked}h
                                <span className="block text-xs font-normal text-slate-400">
                                  {entry.tasksWorked} tasks
                                </span>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-sm text-slate-400">
                                <div className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {new Date(entry.submissionTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap">
                                {isLate ? (
                                  <span className="text-red-400 font-bold">₦{entry.latePenalty.toLocaleString()} <AlertTriangle className="w-3 h-3 ml-1" /></span>
                                ) : (
                                  <span className="text-slate-500">None</span>
                                )}
                              </td>
                              <td className="px-4 py-4 whitespace-nowrap text-right">
                                <motion.button
                                  onClick={() => removeEntry(entry.id)}
                                  whileHover={{ scale: 1.1 }}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </motion.button>
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-xl">
                  <Plus className="w-12 h-12 mb-2 opacity-20" />
                  <p>Add entries from the form to build your batch.</p>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};
