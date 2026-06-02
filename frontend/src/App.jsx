import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/authStore';

import { AppLayout } from './components/layout/AppLayout';
import LoginPage        from './pages/auth/LoginPage';
import DashboardPage    from './pages/dashboard/DashboardPage';
import PoliciesPage     from './pages/policies/PoliciesPage';
import PolicyDetailPage from './pages/policies/PolicyDetailPage';
import OperationsPage   from './pages/operations/OperationsPage';
import NotificationsPage from './pages/notifications/NotificationsPage';
import UsersPage        from './pages/users/UsersPage';
import SettingsPage     from './pages/settings/SettingsPage';

const qc = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (!isAdmin()) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  return !isAuthenticated() ? children : <Navigate to="/dashboard" replace />;
}

export default function App() {
  return (
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard"     element={<DashboardPage />} />
            <Route path="policies"      element={<PoliciesPage />} />
            <Route path="policies/:id"  element={<PolicyDetailPage />} />
            <Route path="operations"    element={<OperationsPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings"      element={<SettingsPage />} />
            <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            fontFamily: 'var(--font-body)', fontSize: 13, borderRadius: 10,
            boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-soft)',
            background: '#fff', color: 'var(--text-primary)',
          },
          success: { iconTheme: { primary: 'var(--green)', secondary: '#fff' } },
          error:   { iconTheme: { primary: 'var(--red)',   secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  );
}
