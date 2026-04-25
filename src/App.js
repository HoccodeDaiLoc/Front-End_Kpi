import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/layout/AppLayout';
import Spinner from './components/common/Spinner';

// Auth
import LoginPage from './pages/auth/LoginPage';
import ActivatePage from './pages/auth/ActivatePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';

// Shared
import DashboardPage from './pages/shared/DashboardPage';
import EvaluationsPage from './pages/shared/EvaluationsPage';
import EvaluationDetailPage from './pages/shared/EvaluationDetailPage';
import ProfilePage from './pages/shared/ProfilePage';
import NotificationsPage from './pages/shared/NotificationsPage';

// Admin
import UsersPage from './pages/admin/UsersPage';
import DepartmentsPage from './pages/admin/DepartmentsPage';
import KpiTemplatesPage from './pages/admin/KpiTemplatesPage';
import ReportsPage from './pages/admin/ReportsPage';

// Manager
import TeamPage from './pages/manager/TeamPage';

const PrivateRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}><div className="spinner spinner-lg" /></div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/activate" element={<ActivatePage />} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPasswordPage /></PublicRoute>} />

      {/* Authenticated — all roles */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/evaluation/:id" element={<PrivateRoute><EvaluationDetailPage /></PrivateRoute>} />

      {/* Employee */}
      <Route path="/employee/evaluations" element={<PrivateRoute roles={['employee', 'admin']}><EvaluationsPage /></PrivateRoute>} />

      {/* Manager */}
      <Route path="/manager/team" element={<PrivateRoute roles={['manager', 'admin']}><TeamPage /></PrivateRoute>} />
      <Route path="/manager/evaluations" element={<PrivateRoute roles={['manager', 'admin']}><EvaluationsPage /></PrivateRoute>} />

      {/* Director */}
      <Route path="/director/evaluations" element={<PrivateRoute roles={['director', 'admin']}><EvaluationsPage /></PrivateRoute>} />
      <Route path="/director/reports" element={<PrivateRoute roles={['director', 'admin']}><ReportsPage /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
      <Route path="/admin/departments" element={<PrivateRoute roles={['admin']}><DepartmentsPage /></PrivateRoute>} />
      <Route path="/admin/kpi-templates" element={<PrivateRoute roles={['admin', 'manager', 'director']}><KpiTemplatesPage /></PrivateRoute>} />
      <Route path="/admin/evaluations" element={<PrivateRoute roles={['admin']}><EvaluationsPage /></PrivateRoute>} />
      <Route path="/admin/reports" element={<PrivateRoute roles={['admin']}><ReportsPage /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: {
            fontFamily: "'Be Vietnam Pro', sans-serif",
            fontSize: '13.5px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,.12)'
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } }
        }} />
      </BrowserRouter>
    </AuthProvider>
  );
}
