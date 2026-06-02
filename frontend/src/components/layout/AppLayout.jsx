import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard':    'Dashboard',
  '/policies':     'Policy Requests',
  '/operations':   'Operations',
  '/notifications':'Notifications',
  '/users':        'User Management',
  '/settings':     'Settings',
};

export function AppLayout() {
  useWebSocket(); // Connect WS for entire app session

  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = PAGE_TITLES[base] || 'InsureFlow';

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div style={{ marginLeft: 'var(--sidebar-w)', flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Header title={title} />
        <main style={{ flex: 1, padding: 28, background: 'var(--surface)' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
