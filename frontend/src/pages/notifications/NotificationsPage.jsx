import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff, CheckCheck, FileText, ClipboardList } from 'lucide-react';
import { getNotifications, markRead, markAllRead } from '../../api/notifications';
import { useNotificationStore } from '../../store/notificationStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { timeAgo } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

const TYPE_ICONS = {
  policy_submitted:    { icon: FileText, color: 'var(--blue)',   bg: 'var(--blue-light)' },
  policy_under_review: { icon: FileText, color: 'var(--purple)', bg: 'var(--purple-light)' },
  policy_approved:     { icon: FileText, color: 'var(--green)',  bg: 'var(--green-light)' },
  policy_rejected:     { icon: FileText, color: 'var(--red)',    bg: 'var(--red-light)' },
  policy_more_info:    { icon: FileText, color: 'var(--amber)',  bg: 'var(--amber-light)' },
  task_assigned:       { icon: ClipboardList, color: 'var(--blue)',  bg: 'var(--blue-light)' },
  task_updated:        { icon: ClipboardList, color: 'var(--amber)', bg: 'var(--amber-light)' },
  task_completed:      { icon: ClipboardList, color: 'var(--green)', bg: 'var(--green-light)' },
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { markAllRead: markAllStore, markRead: markReadStore } = useNotificationStore();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => getNotifications().then(r => r.data),
    refetchInterval: 30000,
  });

  const markAllMut = useMutation({
    mutationFn: markAllRead,
    onSuccess: () => { markAllStore(); qc.invalidateQueries(['notifications']); },
  });

  const markOneMut = useMutation({
    mutationFn: markRead,
    onSuccess: (_, id) => { markReadStore(id); qc.invalidateQueries(['notifications']); },
  });

  const notifications = data?.results || [];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleClick = (n) => {
    if (!n.is_read) markOneMut.mutate(n.id);
    if (n.object_type === 'policy') navigate(`/policies/${n.object_id}`);
    else if (n.object_type === 'task') navigate('/operations');
  };

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{unreadCount} unread</span>
        {unreadCount > 0 && <Button variant="secondary" size="sm" icon={<CheckCheck size={14} />} loading={markAllMut.isPending} onClick={() => markAllMut.mutate()}>Mark all read</Button>}
      </div>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <Loader /> : notifications.length === 0 ? (
          <EmptyState icon={<BellOff size={36} color="var(--text-muted)" />} title="All caught up" subtitle="No notifications yet." />
        ) : notifications.map((n, i) => {
          const meta = TYPE_ICONS[n.type] || { icon: Bell, color: 'var(--text-muted)', bg: 'var(--surface-2)' };
          const Icon = meta.icon;
          return (
            <div key={n.id} onClick={() => handleClick(n)} style={{ display: 'flex', gap: 14, padding: '16px 20px', borderBottom: i < notifications.length - 1 ? '1px solid var(--border-soft)' : 'none', background: n.is_read ? '#fff' : 'rgba(217,119,6,0.03)', cursor: 'pointer', transition: 'background 0.12s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
              onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : 'rgba(217,119,6,0.03)'}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={16} color={meta.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div style={{ fontSize: 14, fontWeight: n.is_read ? 400 : 600 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{timeAgo(n.created_at)}</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 3 }}>{n.message}</div>
              </div>
              {!n.is_read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, marginTop: 5 }} />}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
