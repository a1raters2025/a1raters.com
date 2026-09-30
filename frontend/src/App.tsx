import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { Dashboard } from './components/Dashboard/Dashboard';
import { ReportPage } from './components/Report/ReportPage';
import { ReportHistory } from './components/Report/ReportHistory';
import { RaterReportHistory } from './components/Report/RaterReportHistory';
import { AdminAuditLog } from './components/Admin/AdminAuditLog';
import { AddTask } from './components/Admin/AddTask';
import { ImportData } from './components/Admin/ImportData';
import { TaskLayout } from './components/Task/TaskLayout';
import { authService } from './services/authService';
import { ClientDashboard } from './components/Dashboard/ClientDashboard';
import { AppShell } from './components/Layout/AppShell';
import { TrainingPage } from './components/Training/TrainingPage';
import { SettingsPage } from './components/Settings/SettingsPage';
import { ContactPage } from './components/Contact/ContactPage';
import { LeaderboardPage } from './components/Leaderboard/LeaderboardPage';
import { ProfilePage } from './components/Profile/ProfilePage';
import { TasksPage } from './components/Task/TasksPage';
import { AdminAuth } from './components/Auth/AdminAuth';
import { NotificationsPage } from './components/Notifications/NotificationsPage';
import { UserManagement } from './components/Admin/UserManagement';
import { TaskManagement } from './components/Admin/TaskManagement';
import { VideoTraining } from './components/Admin/VideoTraining';
import { AdminSettings } from './components/Admin/AdminSettings';
import { AuthProvider } from './components/Auth/AuthProvider';

const Shell: React.FC<{ children: React.ReactNode }> = ({ children }) => <AppShell>{children}</AppShell>;

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = authService.getUser();
  const isAdmin = user?.role === 'admin';
  return isAdmin ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const ClientRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = authService.getUser();
  return user?.role === 'client' || user?.role === 'admin' ? <>{children}</> : <Navigate to="/login" replace />;
};

const RaterRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = authService.getUser();
  return user?.role !== 'client' ? <>{children}</> : <Navigate to="/client-dashboard" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/login" element={<AdminAuth mode="login" />} />
          <Route path="/admin/register" element={<AdminAuth mode="register" />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <RaterRoute>
                  <Shell><Dashboard /></Shell>
                </RaterRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/client-dashboard"
            element={
              <PrivateRoute>
                <ClientRoute>
                  <Shell><ClientDashboard /></Shell>
                </ClientRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/add-task"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Shell><AddTask /></Shell>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/import-data"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Shell><ImportData /></Shell>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/users"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Shell><UserManagement /></Shell>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/tasks"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Shell><TaskManagement /></Shell>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/training"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Shell><VideoTraining /></Shell>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/settings"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Shell><AdminSettings /></Shell>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/report"
            element={
              <PrivateRoute>
                <Shell><ReportPage /></Shell>
              </PrivateRoute>
            }
          />

          <Route
            path="/history"
            element={
              <PrivateRoute><Shell><ReportHistory /></Shell></PrivateRoute>
            }
          />

          <Route
            path="/my-reports"
            element={
              <PrivateRoute>
                <Shell><RaterReportHistory /></Shell>
              </PrivateRoute>
            }
          />

          <Route
            path="/admin/audit-log"
            element={
              <PrivateRoute>
                <AdminRoute>
                  <Shell><AdminAuditLog /></Shell>
                </AdminRoute>
              </PrivateRoute>
            }
          />

          <Route
            path="/task/:mode/:category"
            element={
              <PrivateRoute>
                <Shell><TaskLayout /></Shell>
              </PrivateRoute>
            }
          />

          <Route path="/training" element={<PrivateRoute><Shell><TrainingPage /></Shell></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Shell><SettingsPage /></Shell></PrivateRoute>} />
          <Route path="/contact" element={<PrivateRoute><Shell><ContactPage /></Shell></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Shell><LeaderboardPage /></Shell></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><Shell><ProfilePage /></Shell></PrivateRoute>} />
          <Route path="/tasks" element={<PrivateRoute><RaterRoute><Shell><TasksPage /></Shell></RaterRoute></PrivateRoute>} />
          <Route path="/task" element={<PrivateRoute><RaterRoute><Shell><TasksPage /></Shell></RaterRoute></PrivateRoute>} />
          <Route path="/test" element={<PrivateRoute><Shell><TasksPage defaultMode="test" /></Shell></PrivateRoute>} />
          <Route path="/App Store" element={<PrivateRoute><Shell><TaskLayout /></Shell></PrivateRoute>} />
          <Route path="/app-store" element={<PrivateRoute><Shell><TaskLayout /></Shell></PrivateRoute>} />
          <Route path="/notifications" element={<PrivateRoute><Shell><NotificationsPage /></Shell></PrivateRoute>} />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
