import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Send, UserCheck, FileText, DollarSign, User, Paperclip,
  History, Users, Shield, Edit, AlertCircle, RefreshCw, Calendar, CheckCircle
} from 'lucide-react';
import { getPolicy, submitPolicy, takePolicy, reviewPolicy, updatePolicy, getPolicyAudit } from '../../api/policies';
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
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
      <Icon size={15} color="var(--text-muted)" />
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

function EditPolicyModal({ open, onClose, policy }) {
  const [form, setForm] = useState({
    client_name: policy.client_name || '',
    client_email: policy.client_email || '',
    client_phone: policy.client_phone || '',
    client_address: policy.client_address || '',
    coverage_type: policy.coverage_type || 'life',
    coverage_amount: policy.coverage_amount || '',
    premium_amount: policy.premium_amount || '',
    start_date: policy.start_date || '',
    end_date: policy.end_date || '',
    notes: policy.notes || '',
  });
  const [conflictError, setConflictError] = useState(null);
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (data) => updatePolicy(policy.id, data, policy.version),
    onSuccess: () => {
      toast.success('Policy updated!');
      qc.invalidateQueries(['policy', policy.id]);
      qc.invalidateQueries(['policies']);
      onClose();
    },
    onError: (e) => {
      if (e?.response?.status === 409) {
        setConflictError('This policy was modified by another user. Please refresh to load the latest data.');
      } else {
        toast.error(getErrorMessage(e));
      }
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={`Edit Policy (${policy.reference_no})`} width={580}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {conflictError && (
          <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="#DC2626" />
            <div style={{ flex: 1, fontSize: 13, color: '#991B1B' }}>{conflictError}</div>
            <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={() => {
              qc.invalidateQueries(['policy', policy.id]);
              onClose();
            }}>Refresh</Button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="Client Name" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} />
          <Input label="Client Email" type="email" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} />
          <Input label="Client Phone" value={form.client_phone} onChange={e => setForm(p => ({ ...p, client_phone: e.target.value }))} />
          <Input label="Annual Premium ($)" type="number" value={form.premium_amount} onChange={e => setForm(p => ({ ...p, premium_amount: e.target.value }))} />
          <Input label="Start Date" type="date" value={form.start_date} onChange={e => setForm(p => ({ ...p, start_date: e.target.value }))} />
          <Input label="End Date" type="date" value={form.end_date} onChange={e => setForm(p => ({ ...p, end_date: e.target.value }))} />
          <div style={{ gridColumn: 'span 2' }}>
            <Textarea label="Notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mut.isPending} onClick={() => mut.mutate(form)}>Save Changes</Button>
        </div>
      </div>
    </Modal>
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

const TABS = ['Details', 'Beneficiaries & Coverage', 'Reviews', 'Documents', 'Audit Trail'];

export default function PolicyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isEmployee, canReview } = useAuthStore();
  const qc = useQueryClient();
  const [showReview, setShowReview] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [activeTab, setActiveTab] = useState('Details');

  const { data: policy, isLoading, refetch } = useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicy(id).then(r => r.data),
  });

  const { data: auditLogs = [], isLoading: isAuditLoading } = useQuery({
    queryKey: ['policy-audit', id],
    queryFn: () => getPolicyAudit(id).then(r => r.data),
    enabled: activeTab === 'Audit Trail',
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
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 960 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <Button variant="ghost" size="sm" icon={<ArrowLeft size={15} />} onClick={() => navigate('/policies')}>Back</Button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 16 }}>{policy.reference_no}</span>
            <Badge {...meta} />
            <span style={{ fontSize: 11, background: 'var(--surface-3)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>
              v{policy.version || 1}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Created {formatDateTime(policy.created_at)}
            {policy.renewal_date && (
              <span style={{ marginLeft: 12, color: 'var(--brand-primary, #0284C7)', fontWeight: 500 }}>
                • Renewal: {formatDate(policy.renewal_date)}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" icon={<Edit size={14} />} onClick={() => setShowEdit(true)}>Edit</Button>
          {policy.status === 'draft' && isEmployee() && (
            <Button icon={<Send size={14} />} loading={submitMut.isPending} onClick={() => submitMut.mutate()}>Submit</Button>
          )}
          {policy.status === 'pending' && canReview() && (
            <Button icon={<UserCheck size={14} />} variant="amber" loading={takeMut.isPending} onClick={() => takeMut.mutate()}>Take</Button>
          )}
          {policy.status === 'under_review' && canReview() && (
            <Button icon={<FileText size={14} />} onClick={() => setShowReview(true)}>Review</Button>
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
            {tab === 'Beneficiaries & Coverage' && (
              <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: 'var(--surface-3)', color: 'var(--text-muted)', padding: '1px 6px', borderRadius: 99 }}>
                {(policy.beneficiaries?.length || 0) + (policy.coverage_items?.length || 0)}
              </span>
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
              <InfoRow label="Annual Premium"  value={policy.premium_amount ? formatCurrency(policy.premium_amount) : '—'} />
              <InfoRow label="Requires Approval" value={policy.requires_approval ? 'Yes (> $10,000)' : 'No'} />
              <InfoRow label="Start Date" value={formatDate(policy.start_date)} />
              <InfoRow label="End Date"   value={formatDate(policy.end_date)} />
              <InfoRow label="Renewal Date" value={formatDate(policy.renewal_date)} />
              <InfoRow label="Version" value={`v${policy.version || 1}`} />
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

      {/* ── Tab: Beneficiaries & Coverage ── */}
      {activeTab === 'Beneficiaries & Coverage' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ padding: 22 }}>
            <SectionHeader icon={Users} label="Beneficiaries" />
            {policy.beneficiaries?.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No beneficiaries specified for this policy.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-soft)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Full Name</th>
                    <th style={{ padding: '8px 12px' }}>Relationship</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Benefit %</th>
                  </tr>
                </thead>
                <tbody>
                  {policy.beneficiaries.map((b) => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{b.full_name}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>{b.relationship}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{b.benefit_percentage}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card style={{ padding: 22 }}>
            <SectionHeader icon={Shield} label="Coverage Items / Add-ons" />
            {policy.coverage_items?.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No add-on coverage items attached.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-soft)', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '8px 12px' }}>Item Name</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Limit</th>
                    <th style={{ padding: '8px 12px', textAlign: 'right' }}>Deductible</th>
                  </tr>
                </thead>
                <tbody>
                  {policy.coverage_items.map((c) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid var(--border-soft)' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 500 }}>{c.name}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>{formatCurrency(c.limit)}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: 'var(--text-secondary)' }}>{formatCurrency(c.deductible)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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

      {/* ── Tab: Audit Trail ── */}
      {activeTab === 'Audit Trail' && (
        <Card style={{ padding: 22 }}>
          <SectionHeader icon={History} label="Immutable Audit Trail" />
          {isAuditLoading ? <Loader /> : auditLogs.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No audit records found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {auditLogs.map((log) => (
                <div key={log.id} style={{ padding: '12px 16px', background: 'var(--surface)', borderRadius: 'var(--radius)', borderLeft: '3px solid var(--ink)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', color: 'var(--ink)' }}>{log.action}</span>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>by {log.actor?.full_name || 'System'}</span>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDateTime(log.created_at)}</span>
                  </div>
                  {log.diff && Object.keys(log.diff).length > 0 && (
                    <pre style={{ fontSize: 11, fontFamily: 'var(--font-mono)', background: 'var(--surface-2)', padding: '6px 10px', borderRadius: 4, margin: '6px 0 0', overflowX: 'auto' }}>
                      {JSON.stringify(log.diff, null, 2)}
                    </pre>
                  )}
                  {log.trace_id && (
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Trace ID: {log.trace_id}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <ReviewModal open={showReview} onClose={() => setShowReview(false)} policyId={id} />
      <EditPolicyModal open={showEdit} onClose={() => setShowEdit(false)} policy={policy} />
    </div>
  );
}
