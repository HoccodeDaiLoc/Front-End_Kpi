import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './styles/mobile.scss';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import AppLayout from './components/layout/AppLayout';
import Spinner from './components/common/Spinner';

import ExamAssignmentPage from './pages/admin/ExamAssignmentPage';
import ExamSubmissionPage from './pages/admin/ExamSubmissionPage';
// Auth
import LoginPage from './pages/auth/LoginPage';
import ActivatePage from './pages/auth/ActivatePage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ExamsPage from './pages/admin/ExamsPage';
import MyExamsPage from './pages/shared/MyExamsPage';
import TakeExamPage from './pages/shared/TakeExamPage';
import ExamResultPage from './pages/shared/ExamResultPage';
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
import ExamResultsPage from './pages/shared/Examresultspage';
// Manager
import TeamPage from './pages/manager/TeamPage';
import DirectorStaffPage from './pages/shared/Directorstaffpage';
import ExamVerifyPage from './pages/shared/ExamVerifyPage';
import ExamDonePage from './pages/shared/ExamDonePage';
import TakeExamMobilePage from './pages/shared/TakeExamMobilePage';

import ProposalsPage from './pages/shared/ProposalsPage';
import ProposalResultsPage from './pages/shared/ProposalResultsPage';
import MyProposalsPage from './pages/shared/MyProposalsPage';
import TakeProposalPage from './pages/shared/TakeProposalPage';
import ManagerReviewPage from './pages/evaluation/ManagerReviewPage';
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
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Authenticated — all roles */}
      <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
      <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
      <Route path="/notifications" element={<PrivateRoute><NotificationsPage /></PrivateRoute>} />
      <Route path="/evaluation/:id" element={<PrivateRoute><EvaluationDetailPage /></PrivateRoute>} />

      {/* Employee */}
      <Route path="/employee/evaluations" element={<PrivateRoute roles={['employee', 'manager', 'director', 'admin']}><EvaluationsPage /></PrivateRoute>} />

      {/* Manager */}
      <Route path="/manager/team" element={<PrivateRoute roles={['manager', 'admin']}><TeamPage /></PrivateRoute>} />
      <Route path="/manager/evaluations" element={<PrivateRoute roles={['manager', 'admin']}><EvaluationsPage /></PrivateRoute>} />

      {/* Director */}
      <Route path="/director/evaluations" element={<PrivateRoute roles={['director', 'admin']}><EvaluationsPage /></PrivateRoute>} />
      <Route path="/director/reports" element={<PrivateRoute roles={['director', 'admin']}><ReportsPage /></PrivateRoute>} />
      <Route path="/director/staff" element={<PrivateRoute roles={['director', 'admin']}><DirectorStaffPage /></PrivateRoute>} />

      {/* Admin */}
      <Route path="/admin/users" element={<PrivateRoute roles={['admin']}><UsersPage /></PrivateRoute>} />
      <Route path="/admin/departments" element={<PrivateRoute roles={['admin']}><DepartmentsPage /></PrivateRoute>} />
      <Route path="/admin/kpi-templates" element={<PrivateRoute roles={['admin', 'manager', 'director']}><KpiTemplatesPage /></PrivateRoute>} />
      <Route path="/admin/evaluations" element={<PrivateRoute roles={['admin']}><EvaluationsPage /></PrivateRoute>} />
      <Route path="/admin/reports" element={<PrivateRoute roles={['admin']}><ReportsPage /></PrivateRoute>} />

      {/* Chairman */}
      <Route path="/chairman/evaluations" element={<PrivateRoute roles={['chairman', 'admin']}><EvaluationsPage /></PrivateRoute>} />
      <Route path="/chairman/reports" element={<PrivateRoute roles={['chairman', 'admin']}><ReportsPage /></PrivateRoute>} />
      <Route path="/chairman/templates" element={<PrivateRoute roles={['chairman', 'admin']}><KpiTemplatesPage /></PrivateRoute>} />

      {/* Fallback */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />

      <Route path="/my-exams" element={<PrivateRoute><MyExamsPage /></PrivateRoute>} />
      <Route path="/exams/:submissionId/take" element={<PrivateRoute><TakeExamPage /></PrivateRoute>} />
      <Route path="/my-exams/:submissionId/take" element={<TakeExamMobilePage />} />
      <Route path="/exams/:submissionId/result" element={<PrivateRoute><ExamResultPage /></PrivateRoute>} />

      {/* Exam - Admin */}
      <Route path="/admin/exams" element={<PrivateRoute roles={['admin']}><ExamsPage /></PrivateRoute>} />
      <Route path="/admin/exam-results" element={<PrivateRoute roles={['admin']}><ExamResultsPage /></PrivateRoute>} />

      <Route path="/admin/exam-results" element={<PrivateRoute roles={['admin']}><ExamResultsPage /></PrivateRoute>} />
      <Route path="/admin/exam-results/:assignmentId" element={<PrivateRoute roles={['admin']}><ExamAssignmentPage /></PrivateRoute>} />
      <Route path="/admin/exam-results/:assignmentId/:submissionId" element={<PrivateRoute roles={['admin']}><ExamSubmissionPage /></PrivateRoute>} />

      <Route path="/exam-verify" element={<ExamVerifyPage />} />
      <Route path="/exam-done" element={<ExamDonePage />} />
      <Route path="/evaluation/:id/review" element={<ManagerReviewPage />} />
      <Route path="/proposals"
        element={<PrivateRoute roles={['admin', 'chairman', 'director']}><ProposalsPage /></PrivateRoute>}
      />
      <Route path="/proposals/:id/results"
        element={<PrivateRoute roles={['admin', 'chairman', 'director']}><ProposalResultsPage /></PrivateRoute>}
      />
      <Route path="/my-proposals"
        element={<PrivateRoute><MyProposalsPage /></PrivateRoute>}
      />
      <Route path="/my-proposals/:id/take"
        element={<PrivateRoute><TakeProposalPage /></PrivateRoute>}
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <NotificationProvider>
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
        </NotificationProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}