import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, AlertCircle, RefreshCw } from 'lucide-react';
import { createPolicy, submitPolicy } from '../../api/policies';
import { Modal } from '../common/Modal';
import { Input, Select, Textarea } from '../common/Input';
import { Button } from '../common/Button';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const INITIAL = {
  client_name: '', client_email: '', client_phone: '', client_national_id: '',
  client_dob: '', client_address: '', coverage_type: 'life',
  coverage_amount: '', premium_amount: '', start_date: '', end_date: '', notes: '',
  beneficiaries: [],
  coverage_items: []
};

export function PolicyCreateModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [serviceError503, setServiceError503] = useState(null);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Beneficiaries helpers
  const addBeneficiary = () => {
    setForm(p => ({
      ...p,
      beneficiaries: [...p.beneficiaries, { full_name: '', relationship: 'spouse', benefit_percentage: '' }]
    }));
  };

  const updateBeneficiary = (idx, field, val) => {
    setForm(p => {
      const updated = [...p.beneficiaries];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...p, beneficiaries: updated };
    });
  };

  const removeBeneficiary = (idx) => {
    setForm(p => ({
      ...p,
      beneficiaries: p.beneficiaries.filter((_, i) => i !== idx)
    }));
  };

  // Coverage items helpers
  const addCoverageItem = () => {
    setForm(p => ({
      ...p,
      coverage_items: [...p.coverage_items, { name: '', limit: '', deductible: '0.00' }]
    }));
  };

  const updateCoverageItem = (idx, field, val) => {
    setForm(p => {
      const updated = [...p.coverage_items];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...p, coverage_items: updated };
    });
  };

  const removeCoverageItem = (idx) => {
    setForm(p => ({
      ...p,
      coverage_items: p.coverage_items.filter((_, i) => i !== idx)
    }));
  };

  const beneficiaryTotal = form.beneficiaries.reduce((acc, b) => acc + (parseFloat(b.benefit_percentage) || 0), 0);

  const mut = useMutation({
    mutationFn: async (payload) => {
      setServiceError503(null);
      const res = await createPolicy(payload);
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(`Policy ${data.reference_no} created successfully!`);
      setForm(INITIAL);
      setErrors({});
      onSuccess();
    },
    onError: (e) => {
      if (e?.response?.status === 503) {
        setServiceError503(e.response.data?.detail || 'External verification service is temporarily unavailable. Please retry.');
      } else {
        const data = e?.response?.data;
        if (typeof data === 'object' && !data.detail) setErrors(data);
        else toast.error(getErrorMessage(e));
      }
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Insurance Policy Request" width={720}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxHeight: '80vh', overflowY: 'auto', paddingRight: 4 }}>
        
        {serviceError503 && (
          <div style={{ padding: '12px 14px', background: '#FEF2F2', border: '1px solid #F87171', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={18} color="#DC2626" />
            <div style={{ flex: 1, fontSize: 13, color: '#991B1B' }}>
              <strong>Service Unavailable (503):</strong> {serviceError503}
            </div>
            <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={() => mut.mutate(form)}>Retry</Button>
          </div>
        )}

        <section>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Client Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Full Name *" value={form.client_name} onChange={e => set('client_name', e.target.value)} error={errors.client_name?.[0]} placeholder="Jane Doe" />
            <Input label="National ID *" value={form.client_national_id} onChange={e => set('client_national_id', e.target.value)} error={errors.client_national_id?.[0]} placeholder="ID-123456" />
            <Input label="Email *" type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} error={errors.client_email?.[0]} placeholder="jane@example.com" />
            <Input label="Phone *" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} error={errors.client_phone?.[0]} placeholder="+1 555 0199" />
            <Input label="Date of Birth" type="date" value={form.client_dob} onChange={e => set('client_dob', e.target.value)} />
            <div style={{ gridColumn: 'span 2' }}>
              <Textarea label="Address" value={form.client_address} onChange={e => set('client_address', e.target.value)} placeholder="12 Oak Street, City" style={{ minHeight: 50 }} />
            </div>
          </div>
        </section>

        <div style={{ height: 1, background: 'var(--border-soft)' }} />

        <section>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Policy & Coverage Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Coverage Type *" value={form.coverage_type} onChange={e => set('coverage_type', e.target.value)} error={errors.coverage_type?.[0]}>
              {[['life','Life Insurance'],['health','Health Insurance'],['auto','Auto Insurance'],['property','Property Insurance'],['liability','Liability Insurance'],['commercial','Commercial Insurance']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Input label="Coverage Amount (USD) *" type="number" value={form.coverage_amount} onChange={e => set('coverage_amount', e.target.value)} error={errors.coverage_amount?.[0]} placeholder="250000" min="0" />
            <Input label="Annual Premium (USD)" type="number" value={form.premium_amount} onChange={e => set('premium_amount', e.target.value)} error={errors.premium_amount?.[0]} placeholder="1200" min="0" />
            <div style={{ display: 'flex', gap: 8 }}>
              <Input label="Start Date" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
              <Input label="End Date" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional policy notes..." style={{ minHeight: 50 }} />
            </div>
          </div>
        </section>

        <div style={{ height: 1, background: 'var(--border-soft)' }} />

        {/* Beneficiaries Sub-form */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Beneficiaries</span>
              {form.beneficiaries.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 600, color: beneficiaryTotal === 100 ? 'var(--green)' : 'var(--red)' }}>
                  (Total: {beneficiaryTotal}%)
                </span>
              )}
            </div>
            <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addBeneficiary}>Add Beneficiary</Button>
          </div>
          {errors.beneficiaries && (
            <div style={{ fontSize: 12, color: 'var(--red)', marginBottom: 8 }}>{errors.beneficiaries}</div>
          )}
          {form.beneficiaries.map((b, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Input placeholder="Full Name" value={b.full_name} onChange={e => updateBeneficiary(idx, 'full_name', e.target.value)} />
              <Input placeholder="Relationship (e.g. spouse)" value={b.relationship} onChange={e => updateBeneficiary(idx, 'relationship', e.target.value)} />
              <Input placeholder="Percentage %" type="number" min="0" max="100" value={b.benefit_percentage} onChange={e => updateBeneficiary(idx, 'benefit_percentage', e.target.value)} />
              <Button size="sm" variant="ghost" icon={<Trash2 size={14} color="var(--red)" />} onClick={() => removeBeneficiary(idx)} />
            </div>
          ))}
        </section>

        <div style={{ height: 1, background: 'var(--border-soft)' }} />

        {/* Coverage Items Sub-form */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Coverage Add-ons / Items</span>
            <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addCoverageItem}>Add Coverage Item</Button>
          </div>
          {form.coverage_items.map((c, idx) => (
            <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1.5fr auto', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <Input placeholder="Item Name (e.g. Accidental Death)" value={c.name} onChange={e => updateCoverageItem(idx, 'name', e.target.value)} />
              <Input placeholder="Limit ($)" type="number" min="0" value={c.limit} onChange={e => updateCoverageItem(idx, 'limit', e.target.value)} />
              <Input placeholder="Deductible ($)" type="number" min="0" value={c.deductible} onChange={e => updateCoverageItem(idx, 'deductible', e.target.value)} />
              <Button size="sm" variant="ghost" icon={<Trash2 size={14} color="var(--red)" />} onClick={() => removeCoverageItem(idx)} />
            </div>
          ))}
        </section>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mut.isPending} onClick={() => mut.mutate(form)}>Create Policy</Button>
        </div>
      </div>
    </Modal>
  );
}
