import { useQuery } from '@tanstack/react-query';
import { FileText, ClipboardList, CheckCircle, Clock, AlertCircle, TrendingUp, Calendar, RefreshCw, Users } from 'lucide-react';
import { getPolicySummary } from '../../api/policies';
import { getTaskSummary } from '../../api/operations';
import { getNotifications } from '../../api/notifications';
import { Card } from '../../components/common/Card';
import { Loader } from '../../components/common/Loader';
import { Badge } from '../../components/common/Badge';
import { useAuthStore } from '../../store/authStore';
import { timeAgo, STATUS_META, formatCurrency } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';

function StatCard({ label, value, icon: Icon, color, bg, sub, onClick }) {
  return (
    <Card style={{ padding: 22, cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 34, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{value ?? '—'}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</div>}
        </div>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={20} color={color} />
        </div>
      </div>
    </Card>
  );
}

const SCHEDULED_JOBS = [
  {
    name: 'Stale Pending Reminder',
    description: 'Notifies underwriters about policies pending >24 hrs',
    schedule: 'Daily @ 8:00 AM',
    icon: Clock,
    color: 'var(--amber)',
    bg: 'var(--amber-light)',
  },
  {
    name: 'Expiring Policies Alert',
    description: 'Alerts employees about policies expiring within 30 days',
    schedule: 'Daily @ 9:00 AM',
    icon: Calendar,
    color: 'var(--blue)',
    bg: 'var(--blue-light)',
  },
  {
    name: 'Weekly Task Digest',
    description: 'Sends ops managers a summary of open & overdue tasks',
    schedule: 'Every Mon @ 8:00 AM',
    icon: ClipboardList,
    color: 'var(--purple)',
    bg: 'var(--purple-light)',
  },
];

export default function DashboardPage() {
  const { user, canReview, isAdmin } = useAuthStore();
  const navigate = useNavigate();

  const { data: pSummary, isLoading: pLoading } = useQuery({
    queryKey: ['policy-summary'],
    queryFn: () => getPolicySummary().then(r => r.data),
  });
  const { data: tSummary, isLoading: tLoading } = useQuery({
    queryKey: ['task-summary'],
    queryFn: () => getTaskSummary().then(r => r.data),
  });
  const { data: notifs } = useQuery({
    queryKey: ['notifs-recent'],
    queryFn: () => getNotifications({ page: 1 }).then(r => r.data),
  });

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Greeting */}
      <div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, marginBottom: 4 }}>
          Good day, <em>{user?.first_name}</em>
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Here's what's happening across your platform today.
        </p>
      </div>

      {/* Policy stats */}
      <section>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Policy Overview</div>
        {pLoading ? <Loader size={22} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 12 }}>
            <StatCard label="Total"        value={pSummary?.total}        icon={FileText}     color="var(--text-secondary)" bg="var(--surface-3)" onClick={() => navigate('/policies')} />
            <StatCard label="Pending"      value={pSummary?.pending}      icon={Clock}        color="var(--amber)"  bg="var(--amber-light)"   sub="Awaiting review"  onClick={() => navigate('/policies?status=pending')} />
            <StatCard label="Under Review" value={pSummary?.under_review} icon={TrendingUp}   color="var(--purple)" bg="var(--purple-light)"  onClick={() => navigate('/policies?status=under_review')} />
            <StatCard label="Approved"     value={pSummary?.approved}     icon={CheckCircle}  color="var(--green)"  bg="var(--green-light)"  onClick={() => navigate('/policies?status=approved')} />
            <StatCard label="Rejected"     value={pSummary?.rejected}     icon={AlertCircle}  color="var(--red)"    bg="var(--red-light)')"  onClick={() => navigate('/policies?status=rejected')} />
            <StatCard label="More Info"    value={pSummary?.more_info}    icon={RefreshCw}    color="var(--orange)" bg="var(--orange-light)"  onClick={() => navigate('/policies?status=more_info')} />
          </div>
        )}
      </section>

      {/* Middle row: Tasks + Notifications */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Operations bar chart */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Operations Tasks</div>
          <Card style={{ padding: 20 }}>
            {tLoading ? <Loader size={20} /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.entries(tSummary || {}).filter(([k]) => k !== 'total').map(([status, count]) => {
                  const total = tSummary?.total || 1;
                  const pct   = Math.round((count / total) * 100);
                  const COLORS = { open: 'var(--blue)', in_progress: 'var(--amber)', on_hold: 'var(--text-muted)', done: 'var(--green)', cancelled: 'var(--red)' };
                  return (
                    <div key={status}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                        <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{status.replace('_', ' ')}</span>
                        <span style={{ fontWeight: 600, color: COLORS[status] }}>{count}</span>
                      </div>
                      <div style={{ height: 5, background: 'var(--surface-3)', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: COLORS[status] || 'var(--ink)', borderRadius: 99, transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
                <div style={{ paddingTop: 8, borderTop: '1px solid var(--border-soft)', display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--text-muted)' }}>Total tasks</span>
                  <span style={{ fontWeight: 700 }}>{tSummary?.total || 0}</span>
                </div>
              </div>
            )}
          </Card>
        </section>

        {/* Recent notifications */}
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Recent Activity</div>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {!notifs ? <Loader size={20} /> : notifs.results?.length === 0 ? (
              <div style={{ padding: '28px 20px', textAlign: 'center', fontSize: 13, color: 'var(--text-muted)' }}>No recent activity</div>
            ) : (
              notifs.results?.slice(0, 6).map((n, i) => (
                <div key={n.id} onClick={() => navigate('/notifications')}
                  style={{ padding: '12px 18px', borderBottom: i < 5 ? '1px solid var(--border-soft)' : 'none', cursor: 'pointer', background: n.is_read ? '#fff' : 'rgba(217,119,6,0.03)', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                  onMouseLeave={e => e.currentTarget.style.background = n.is_read ? '#fff' : 'rgba(217,119,6,0.03)'}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    {!n.is_read && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0, marginTop: 6 }} />}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: n.is_read ? 400 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1 }}>{timeAgo(n.created_at)}</div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </Card>
        </section>
      </div>

      {/* Scheduled Jobs (visible to all, managed by admins) */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
            Automated Jobs — Celery Beat
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--green)', background: 'var(--green-light)', padding: '3px 10px', borderRadius: 99 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', animation: 'pulse-dot 2s ease infinite', display: 'inline-block' }} />
            Scheduler active
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {SCHEDULED_JOBS.map((job) => {
            const Icon = job.icon;
            return (
              <Card key={job.name} style={{ padding: 18 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: job.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={17} color={job.color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{job.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 8 }}>{job.description}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: job.color, background: job.bg, display: 'inline-block', padding: '2px 8px', borderRadius: 99 }}>
                      {job.schedule}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>
    </div>
  );
}
