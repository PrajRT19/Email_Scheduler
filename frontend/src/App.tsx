import { Routes, Route, Navigate } from 'react-router-dom';
import { RequireAuth } from './components/RequireAuth';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import ScheduledPage from './pages/ScheduledPage';
import SentPage from './pages/SentPage';
import EmailDetailPage from './pages/EmailDetailPage';
import ComposePage from './pages/ComposePage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<Navigate to="/scheduled" replace />} />
          <Route path="/scheduled" element={<ScheduledPage />} />
          <Route path="/sent" element={<SentPage />} />
          <Route path="/emails/:id" element={<EmailDetailPage />} />
          <Route path="/compose" element={<ComposePage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/scheduled" replace />} />
    </Routes>
  );
}
