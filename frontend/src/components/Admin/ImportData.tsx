import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authService } from '../../services/authService';
import { reportService, type RequestReport } from '../../services/reportService';
import { ArrowLeft, Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { GlassCard } from '../UI/GlassCard';

export const ImportData: React.FC = () => {
  const navigate = useNavigate();
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [previewStats, setPreviewStats] = useState<{ users: number; reports: number } | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLog([]);
    setError(null);
    setPreviewStats(null);
    setProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        processCSV(text);
      } catch {
        setError('Failed to read file.');
        setProcessing(false);
      }
    };
    reader.readAsText(file);
  };

  const processCSV = (csvText: string) => {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) {
      setError('CSV file is empty or missing headers.');
      setProcessing(false);
      return;
    }

    const parseLine = (line: string) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseLine(lines[0]).map((h) => h.toLowerCase());
    const getIndex = (keys: string[]) => headers.findIndex((h) => keys.some((k) => h.includes(k)));

    const idxRater = getIndex(['rater', 'name']);
    const idxEmail = getIndex(['email']);
    const idxProfile = getIndex(['profile']);
    const idxCategory = getIndex(['category']);
    const idxHours = getIndex(['hours', 'duration']);
    const idxTask = getIndex(['task']);
    const idxDate = getIndex(['date', 'timestamp']);
    const idxProxy = getIndex(['proxy']);

    if (idxRater === -1 || idxEmail === -1) {
      setError('Could not find "Rater Name" or "Email" columns in CSV. Please check headers.');
      setProcessing(false);
      return;
    }

    const newReports: Omit<RequestReport, 'submissionTime'>[] = [];
    const newUsers = new Set<string>();
    let successCount = 0;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const cols = parseLine(lines[i]);
      if (cols.length < headers.length * 0.5) continue;

      const raterName = cols[idxRater]?.replace(/^"|"$/g, '').trim();
      const email = cols[idxEmail]?.replace(/^"|"$/g, '').trim();

      if (!raterName || !email) continue;

      newUsers.add(raterName);

      const report: Omit<RequestReport, 'submissionTime'> = {
        id: Date.now() + i,
        raterName: raterName,
        email: email,
        profileName: cols[idxProfile]?.replace(/^"|"$/g, '') || 'Unknown Profile',
        category: cols[idxCategory]?.replace(/^"|"$/g, '') || 'Other',
        proxy: idxProxy !== -1 ? cols[idxProxy]?.replace(/^"|"$/g, '') : 'N/A',
        tasksWorked: idxTask !== -1 ? cols[idxTask] : '0',
        hoursWorked: idxHours !== -1 ? cols[idxHours] : '0',
        date: idxDate !== -1 ? cols[idxDate]?.replace(/^"|"$/g, '') : new Date().toLocaleDateString(),
        status: 'Active',
      };

      report.hoursWorked = report.hoursWorked.replace(/[^0-9.]/g, '') || '0';
      report.tasksWorked = report.tasksWorked.replace(/[^0-9]/g, '') || '0';

      newReports.push(report);
      successCount++;
    }

    setPreviewStats({
      users: newUsers.size,
      reports: successCount,
    });

    if (successCount > 0) {
      newUsers.forEach((username) => {
        void authService.register(username);
      });
      setLog((prev) => [...prev, `Registered/Verified ${newUsers.size} Rater Profiles.`]);

      reportService.saveReports(newReports);
      setLog((prev) => [...prev, `Successfully imported ${successCount} reports.`]);
    }

    setProcessing(false);
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          className="flex justify-between items-center mb-8"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold text-white">Import Data (CSV)</h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          <GlassCard className="p-8 text-center" delay={0.15}>
            <motion.div
              className="mb-4"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
            >
              <Upload className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium text-white mb-2">Upload your CSV File</h3>
              <p className="text-slate-400 mb-6 px-4">
                Upload a CSV file containing columns for
                <strong> Rater Name, Email, Profile, Category, Hours Worked, Tasks Worked</strong>.
              </p>
            </motion.div>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-slate-400
                file:mr-4 file:py-3 file:px-6
                file:rounded-xl file:border-0
                file:text-sm file:font-semibold
                file:bg-gradient-to-r file:from-indigo-500 file:to-violet-600 file:text-white
                hover:file:from-indigo-600 hover:file:to-violet-700
                file:cursor-pointer"
            />
          </GlassCard>
        </motion.div>

        {processing && (
          <motion.div
            className="mt-6 text-center py-4 text-indigo-300 font-medium animate-pulse"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Processing file...
          </motion.div>
        )}

        {error && (
          <motion.div
            className="mt-6 p-4 bg-red-900/20 border border-red-500/20 rounded-xl flex items-start text-red-300"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-bold">Import Failed</h4>
              <p className="text-sm">{error}</p>
            </div>
          </motion.div>
        )}

        {previewStats && !error && (
          <motion.div
            className="mt-6 space-y-4"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <motion.div
              className="p-4 bg-emerald-900/20 border border-emerald-500/20 rounded-xl flex items-start text-emerald-300"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <CheckCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold">Import Success!</h4>
                <p className="text-sm mt-1">
                  Found <strong>{previewStats.users}</strong> unique raters.
                  <br />
                  Imported <strong>{previewStats.reports}</strong> historical reports.
                </p>
              </div>
            </motion.div>

            <GlassCard className="p-0 overflow-hidden" delay={0.3} hover={false}>
              <div className="max-h-56 overflow-y-auto">
                {log.map((line, i) => (
                  <motion.div
                    key={i}
                    className="px-4 py-2.5 font-mono text-sm text-slate-300 border-b border-white/5 last:border-0"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.05 * i }}
                  >
                    <FileText className="w-3 h-3 inline mr-2 text-slate-500" />
                    {line}
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        )}

        <motion.div
          className="mt-8 pt-6 border-t border-white/5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
            Instructions
          </h3>
          <ul className="text-sm text-slate-400 space-y-2 list-disc list-inside">
            <li>Ensure your Google Sheet is downloaded as <strong>.csv</strong>.</li>
            <li>Required Columns: <strong>Rater Name</strong> and <strong>Email</strong>.</li>
            <li>Recommended Columns: Profile, Category, Hours Worked, Tasks Worked, Date.</li>
            <li>
              The system will automatically create user accounts (password: name + "123!")
              for new names found.
            </li>
          </ul>
        </motion.div>
      </div>
    </div>
  );
};
