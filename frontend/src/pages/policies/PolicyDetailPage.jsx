import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Send, UserCheck, FileText, DollarSign, User, Paperclip } from 'lucide-react';
import { getPolicy, submitPolicy, takePolicy, reviewPolicy } from '../../api/policies';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { Modal } from '../../components/common/Modal';
import { Select, Textarea, Input } from '../../components/common/Input';
import { DocumentUpload } from '../../components/policies/DocumentUpload';
import { useAuthStore } from '../../store/authStore';
import { STATUS_META, COVERAGE_LABELS, formatCurrency, formatDate, formatDateTime, getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 500 }}>{value || '—'}</div>
    </div>
  );
}

function SectionHeader({ icon: Icon, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
      <Icon size={15} color="var(--text-muted)" />
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function ReviewModal({ open, onClose, policyId }) {
  const [form, setForm] = useState({ decision: 'approved', notes: '', premium_suggested: '', risk_assessment: 'medium' });
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (data) => reviewPolicy(policyId, data),
    onSuccess: () => {
      toast.success('Review submitted!');
      qc.invalidateQueries(['policy', policyId]);
      qc.invalidateQueries(['policies']);
      onClose();
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const DECISIONS = [
    { value: 'approved',  label: 'Approve',   color: 'var(--green)' },
    { value: 'rejected',  label: 'Reject',    color: 'var(--red)'   },
    { value: 'more_info', label: 'More Info', color: 'var(--amber)' },
  ];

  return (
    <Modal open={open} onClose={onClose} title="Submit Underwriter Review" width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Decision selector */}
        <div style={{ display: 'flex', gap: 8 }}>
          {DECISIONS.map(({ value, label, color }) => (
            <button key={value} onClick={() => setForm(p => ({ ...p, decision: value }))}
              style={{
                flex: 1, padding: '10px 8px', fontFamily: 'var(--font-body)', cursor: 'pointer',
                border: `2px solid ${form.decision === value ? color : 'var(--border)'}`,
                borderRadius: 'var(--radius)', fontSize: 13, fontWeight: 600,
                color: form.decision === value ? color : 'var(--text-muted)',
                background: form.decision === value ? `${color}18` : '#fff',
                transition: 'all 0.15s',
              }}>
              {label}
            </button>
          ))}
        </div>

        {form.decision === 'approved' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Suggested Premium (USD)" type="number" value={form.premium_suggested} onChange={e => setForm(p => ({ ...p, premium_suggested: e.target.value }))} placeholder="5000" />
            <Select label="Risk Level" value={form.risk_assessment} onChange={e => setForm(p => ({ ...p, risk_assessment: e.target.value }))}>
              <option value="low">Low Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="high">High Risk</option>
            </Select>
          </div>
        )}

        <Textarea label="Review Notes *" value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          placeholder="Provide detailed review notes and justification for your decision..."
          style={{ minHeight: 100 }} />

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button
            loading={mut.isPending}
            variant={form.decision === 'approved' ? 'success' : form.decision === 'rejected' ? 'danger' : 'amber'}
            onClick={() => mut.mutate(form)}
          >
            Submit Review
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const TABS = ['Details', 'Reviews', 'Documents'];

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployee, canReview } = useAuthStore();
  const qc = useQueryClient();
  const [showReview, setShowReview] = useState(false);
  const [activeTab, setActiveTab] = useState('Details');

  const { data: policy, isLoading } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicy(id).then(r => r.data),
  });

  const submitMut = useMutation({
    mutationFn: () => submitPolicy(id),
    onSuccess: () => { toast.success('Policy submitted for review!'); qc.invalidateQueries(['policy', id]); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  const takeMut = useMutation({
    mutationFn: () => takePolicy(id),
    onSuccess: () => { toast.success('Policy taken for review.'); qc.invalidateQueries(['policy', id]); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  if (isLoading) return <Loader />;
  if (!policy) return null;

  const meta = STATUS_META[policy.status] || {};

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate('/policies')}>Back</Button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>{policy.reference_no}</span>
            <Badge {...meta} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>Created {formatDateTime(policy.created_at)}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {policy.status === 'draft' && isEmployee() && (
            <Button icon={<Send size={14} />} loading={submitMut.isPending} onClick={() => submitMut.mutate()}>Submit for Review</Button>
          )}
          {policy.status === 'pending' && canReview() && (
            <Button icon={<UserCheck size={14} />} variant="amber" loading={takeMut.isPending} onClick={() => takeMut.mutate()}>Take for Review</Button>
          )}
          {policy.status === 'under_review' && canReview() && (
            <Button icon={<FileText size={14} />} onClick={() => setShowReview(true)}>Submit Review</Button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '2px solid var(--border-soft)' }}>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            style={{
              padding: '9px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              fontFamily: 'var(--font-body)', background: 'transparent',
              color: activeTab === tab ? 'var(--ink)' : 'var(--text-muted)',
              borderBottom: activeTab === tab ? '2px solid var(--ink)' : '2px solid transparent',
              marginBottom: -2, transition: 'all 0.15s',
            }}>
            {tab}
            {tab === 'Reviews' && policy.reviews?.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: 'var(--surface-3)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 99 }}>{policy.reviews.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Details ── */}
      {activeTab === 'Details' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card style={{ padding: 22 }}>
            <SectionHeader icon={User} label="Client Information" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InfoRow label="Full Name"   value={policy.client_name} />
              <InfoRow label="National ID" value={policy.client_national_id} />
              <InfoRow label="Email"       value={policy.client_email} />
              <InfoRow label="Phone"       value={policy.client_phone} />
              <InfoRow label="Date of Birth" value={formatDate(policy.client_dob)} />
              <div style={{ gridColumn: 'span 2' }}>
                <InfoRow label="Address" value={policy.client_address} />
              </div>
            </div>
          </Card>

          <Card style={{ padding: 22 }}>
            <SectionHeader icon={DollarSign} label="Policy Details" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <InfoRow label="Coverage Type"   value={COVERAGE_LABELS[policy.coverage_type]} />
              <InfoRow label="Coverage Amount" value={formatCurrency(policy.coverage_amount)} />
              {policy.premium_amount && <InfoRow label="Premium"    value={formatCurrency(policy.premium_amount)} />}
              {policy.risk_level     && <InfoRow label="Risk Level" value={<span style={{ textTransform: 'capitalize' }}>{policy.risk_level}</span>} />}
              <InfoRow label="Start Date" value={formatDate(policy.start_date)} />
              <InfoRow label="End Date"   value={formatDate(policy.end_date)} />
              <InfoRow label="Requested By" value={policy.requested_by?.full_name} />
              {policy.assigned_to && <InfoRow label="Assigned To" value={policy.assigned_to?.full_name} />}
            </div>
            {policy.notes && (
              <div style={{ marginTop: 14, padding: '10px 12px', background: 'var(--surface)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--text-secondary)', borderLeft: '3px solid var(--border)', lineHeight: 1.6 }}>
                {policy.notes}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ── Tab: Reviews ── */}
      {activeTab === 'Reviews' && (
        <Card style={{ padding: 22 }}>
          {policy.reviews?.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 14 }}>
              No reviews yet
              {policy.status === 'under_review' && canReview() && (
                <div style={{ marginTop: 14 }}>
                  <Button icon={<FileText size={14} />} onClick={() => setShowReview(true)}>Submit First Review</Button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {policy.reviews.map((r) => {
                const colors = {
                  approved:  ['var(--green)', 'var(--green-light)'],
                  rejected:  ['var(--red)',   'var(--red-light)'],
                  more_info: ['var(--amber)', 'var(--amber-light)'],
                };
                const [c, bg] = colors[r.decision] || ['var(--text-muted)', 'var(--surface-2)'];
                return (
                  <div key={r.id} style={{ padding: '16px 18px', background: bg, borderRadius: 'var(--radius-lg)', border: `1px solid ${c}30` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: c, textTransform: 'capitalize' }}>
                          {r.decision.replace('_', ' ')}
                        </span>
                        {r.premium_suggested && (
                          <span style={{ fontSize: 12, color: 'var(--text-secondary)', background: '#fff', padding: '2px 8px', borderRadius: 99 }}>
                            Premium: {formatCurrency(r.premium_suggested)}
                          </span>
                        )}
                        {r.risk_assessment && (
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', background: '#fff', padding: '2px 8px', borderRadius: 99, textTransform: 'capitalize' }}>
                            Risk: {r.risk_assessment}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap', textAlign: 'right' }}>
                        <div>{r.reviewed_by?.full_name}</div>
                        <div>{formatDateTime(r.created_at)}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{r.notes}</div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {/* ── Tab: Documents ── */}
      {activeTab === 'Documents' && (
        <Card style={{ padding: 22 }}>
          <SectionHeader icon={Paperclip} label="Policy Documents" />
          <DocumentUpload policyId={id} />
        </Card>
      )}

      <ReviewModal open={showReview} onClose={() => setShowReview(false)} policyId={id} />
    </div>
  );
}
