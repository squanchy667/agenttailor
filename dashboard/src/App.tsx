import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, AUTH_MODE } from './lib/authProvider';
import { AppLayout } from './components/layout/AppLayout';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { TailoringPage } from './pages/TailoringPage';
import { SettingsPage } from './pages/SettingsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AgentBuilderPage } from './pages/AgentBuilderPage';
import { AgentLibraryPage } from './pages/AgentLibraryPage';
import { AgentDetailPage } from './pages/AgentDetailPage';
import { NotFoundPage } from './pages/NotFoundPage';

const isLocal = AUTH_MODE !== 'clerk';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes (Clerk mode only) */}
        {!isLocal && <Route path="/login" element={<LoginPage />} />}
        {!isLocal && <Route path="/signup" element={<SignupPage />} />}

        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/projects" replace />} />

        {/* Protected routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="tailoring" element={<TailoringPage />} />
          <Route path="tailoring/:sessionId" element={<TailoringPage />} />
          <Route path="agents/builder" element={<AgentBuilderPage />} />
          <Route path="agents/library" element={<AgentLibraryPage />} />
          <Route path="agents/:agentId" element={<AgentDetailPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* Catch-all 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
