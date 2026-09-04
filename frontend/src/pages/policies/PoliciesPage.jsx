import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Filter, Eye, Send, UserCheck, RefreshCw } from 'lucide-react';
import { getPolicies, submitPolicy, takePolicy } from '../../api/policies';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { STATUS_META, COVERAGE_LABELS, formatCurrency, formatDate, getErrorMessage } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { PolicyCreateModal } from '../../components/policies/PolicyCreateModal';
import toast from 'react-hot-toast';

export default function PoliciesPage() {
  const { isEmployee, canReview } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['policies', search, statusFilter],
    queryFn: () => getPolicies({ q: search || undefined, search: search || undefined, status: statusFilter || undefined }).then(r => r.data),
  });

  const submitMut = useMutation({
    mutationFn: submitPolicy,
    onSuccess: () => { toast.success('Policy submitted for review!'); qc.invalidateQueries(['policies']); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const takeMut = useMutation({
    mutationFn: takePolicy,
    onSuccess: () => { toast.success('Policy taken for review.'); qc.invalidateQueries(['policies']); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const policies = data?.results || [];

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 220 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by client or reference..." style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', background: '#fff' }} />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Statuses</option>
          {Object.entries(STATUS_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <Button icon={<RefreshCw size={14} />} variant="secondary" onClick={() => refetch()}>Refresh</Button>
        {isEmployee() && <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New Request</Button>}
      </div>

      {/* Table */}
      <Card style={{ overflow: 'hidden', padding: 0 }}>
        {isLoading ? <Loader /> : policies.length === 0 ? (
          <EmptyState icon="📋" title="No policy requests" subtitle={isEmployee() ? 'Create your first policy request to get started.' : 'No requests match your filters.'} action={isEmployee() && <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New Request</Button>} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-soft)', background: 'var(--surface)' }}>
                  {['Reference', 'Client', 'Coverage', 'Amount', 'Status', 'Submitted', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {policies.map((p, i) => {
                  const meta = STATUS_META[p.status] || {};
                  return (
                    <tr key={p.id} style={{ borderBottom: i < policies.length - 1 ? '1px solid var(--border-soft)' : 'none', transition: 'background 0.12s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--ink)', background: 'var(--surface-2)', padding: '2px 7px', borderRadius: 5 }}>{p.reference_no}</span>
                      </td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>{p.client_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{p.requested_by?.full_name}</div>
                      </td>
                      <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{COVERAGE_LABELS[p.coverage_type] || p.coverage_type}</td>
                      <td style={{ padding: '13px 16px', fontSize: 14, fontWeight: 600 }}>{formatCurrency(p.coverage_amount)}</td>
                      <td style={{ padding: '13px 16px' }}><Badge {...meta} /></td>
                      <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(p.submitted_at || p.created_at)}</td>
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button variant="ghost" size="sm" icon={<Eye size={13} />} onClick={() => navigate(`/policies/${p.id}`)}>View</Button>
                          {p.status === 'draft' && isEmployee() && (
                            <Button variant="secondary" size="sm" icon={<Send size={13} />} loading={submitMut.isPending} onClick={() => submitMut.mutate(p.id)}>Submit</Button>
                          )}
                          {p.status === 'pending' && canReview() && (
                            <Button variant="amber" size="sm" icon={<UserCheck size={13} />} loading={takeMut.isPending} onClick={() => takeMut.mutate(p.id)}>Take</Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PolicyCreateModal open={showCreate} onClose={() => setShowCreate(false)} onSuccess={() => { setShowCreate(false); qc.invalidateQueries(['policies']); }} />
    </div>
  );
}
