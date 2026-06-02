import { Bell, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationStore } from '../../store/notificationStore';

export function Header({ title }) {
  const { unreadCount, wsConnected } = useNotificationStore();
  const navigate = useNavigate();

  return (
    <header style={{
      height: 'var(--header-h)', background: '#fff',
      borderBottom: '1px solid var(--border-soft)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 400 }}>{title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* WS status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: wsConnected ? 'var(--green)' : 'var(--text-muted)', padding: '4px 10px', background: wsConnected ? 'var(--green-light)' : 'var(--surface-2)', borderRadius: 99 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: wsConnected ? 'var(--green)' : 'var(--border)', animation: wsConnected ? 'pulse-dot 2s ease infinite' : 'none' }} />
          {wsConnected ? 'Live' : 'Offline'}
        </div>

        <button onClick={() => navigate('/notifications')} style={{ position: 'relative', background: 'var(--surface-2)', border: '1px solid var(--border-soft)', borderRadius: 'var(--radius)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <Bell size={16} color="var(--text-secondary)" />
          {unreadCount > 0 && (
            <span style={{ position: 'absolute', top: -4, right: -4, background: 'var(--amber)', color: '#fff', fontSize: 9, fontWeight: 700, width: 16, height: 16, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #fff' }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
