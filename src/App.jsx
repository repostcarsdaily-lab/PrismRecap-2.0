import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardView from './components/DashboardView';
import AuthPages from './components/AuthPages';
import MeetingProcessingPage from './components/MeetingProcessingPage';
import KanbanBoard from './components/KanbanBoard';
import MeetingHistoryPage from './components/MeetingHistoryPage';
import EmailCenterPage from './components/EmailCenterPage';
import TeamChatPage from './components/TeamChatPage';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/auth" replace />} />
          <Route path="/auth" element={<AuthPages />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardView />} />
            <Route path="/meeting-processing" element={<MeetingProcessingPage />} />
            <Route path="/meeting-history" element={<MeetingHistoryPage />} />
            <Route path="/email-center" element={<EmailCenterPage />} />
            <Route path="/team-chat" element={<TeamChatPage />} />
            <Route path="/kanban" element={<KanbanBoard />} />
          </Route>
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
