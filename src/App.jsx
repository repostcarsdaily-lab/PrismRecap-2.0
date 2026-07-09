import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DashboardView from './components/DashboardView';
import AuthPages from './components/AuthPages';
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
          </Route>
          <Route path="*" element={<Navigate to="/auth" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
