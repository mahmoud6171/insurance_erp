import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, ClipboardList, Bell, Users, Settings, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';

const NavItem = ({ to, icon: Icon, label, badge }) => (
  <NavLink to={to} style={({ isActive }) => ({
    display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px',
    borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: 14, fontWeight: 500,
    color: isActive ? 'var(--ink)' : 'var(--text-secondary)',
    background: isActive ? 'var(--surface-2)' : 'transparent',
    transition: 'all 0.15s', position: 'relative',
  })}>
    <Icon size={17} strokeWidth={isActive => isActive ? 2.2 : 1.8} />
    <span style={{ flex: 1 }}>{label}</span>
    {badge > 0 && (
      <span style={{ background: 'var(--amber)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99, minWidth: 18, textAlign: 'center' }}>{badge > 99 ? '99+' : badge}</span>
    )}
  </NavLink>
);

export function Sidebar() {
  const { user, canReview, canManageTasks, isAdmin } = useAuthStore();
  const { unreadCount } = useNotificationStore();

  return (
    <aside style={{
      width: 'var(--sidebar-w)', height: '100vh', position: 'fixed', top: 0, left: 0,
      background: '#fff', borderRight: '1px solid var(--border-soft)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, background: 'var(--ink)', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, lineHeight: 1.2 }}>InsureFlow</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ERP Platform</div>
          </div>
        </div>
      </div>

      {/* User pill */}
      <div style={{ padding: '12px 14px', borderBottom: '1px solid var(--border-soft)' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)', padding: '9px 12px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>{user?.full_name || user?.first_name}</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role?.replace('_', ' ')}</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 10px', display: 'flex', flexDirection: 'column', gap: 2, overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '6px 14px 4px', textTransform: 'uppercase' }}>Main</div>
        <NavItem to="/dashboard" icon={LayoutDashboard} label="Dashboard" />
        <NavItem to="/policies" icon={FileText} label="Policies" />
        <NavItem to="/operations" icon={ClipboardList} label="Operations" />
        <NavItem to="/notifications" icon={Bell} label="Notifications" badge={unreadCount} />
        {isAdmin() && (
          <>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--text-muted)', padding: '12px 14px 4px', textTransform: 'uppercase' }}>Admin</div>
            <NavItem to="/users" icon={Users} label="Users" />
          </>
        )}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '10px 10px 16px', borderTop: '1px solid var(--border-soft)' }}>
        <NavItem to="/settings" icon={Settings} label="Settings" />
      </div>
    </aside>
  );
}
