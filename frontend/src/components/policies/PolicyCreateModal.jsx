import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createPolicy } from '../../api/policies';
import { Modal } from '../common/Modal';
import { Input, Select, Textarea } from '../common/Input';
import { Button } from '../common/Button';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

const INITIAL = {
  client_name: '', client_email: '', client_phone: '', client_national_id: '',
  client_dob: '', client_address: '', coverage_type: 'life',
  coverage_amount: '', start_date: '', end_date: '', notes: '',
};

export function PolicyCreateModal({ open, onClose, onSuccess }) {
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => { toast.success('Policy draft created!'); setForm(INITIAL); onSuccess(); },
    onError: (e) => {
      const data = e?.response?.data;
      if (typeof data === 'object' && !data.detail) setErrors(data);
      else toast.error(getErrorMessage(e));
    },
  });

  return (
    <Modal open={open} onClose={onClose} title="New Policy Request" width={640}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <section>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Client Information</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Full Name *" value={form.client_name} onChange={e => set('client_name', e.target.value)} error={errors.client_name?.[0]} placeholder="Ahmed Mohamed" />
            <Input label="National ID *" value={form.client_national_id} onChange={e => set('client_national_id', e.target.value)} error={errors.client_national_id?.[0]} placeholder="29901011234567" />
            <Input label="Email *" type="email" value={form.client_email} onChange={e => set('client_email', e.target.value)} error={errors.client_email?.[0]} placeholder="client@email.com" />
            <Input label="Phone *" value={form.client_phone} onChange={e => set('client_phone', e.target.value)} error={errors.client_phone?.[0]} placeholder="+20 100 000 0000" />
            <Input label="Date of Birth" type="date" value={form.client_dob} onChange={e => set('client_dob', e.target.value)} />
            <div style={{ gridColumn: 'span 2' }}>
              <Textarea label="Address" value={form.client_address} onChange={e => set('client_address', e.target.value)} placeholder="123 Street, City" style={{ minHeight: 60 }} />
            </div>
          </div>
        </section>

        <div style={{ height: 1, background: 'var(--border-soft)' }} />

        <section>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 12 }}>Policy Details</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Select label="Coverage Type *" value={form.coverage_type} onChange={e => set('coverage_type', e.target.value)} error={errors.coverage_type?.[0]}>
              {[['life','Life Insurance'],['health','Health Insurance'],['auto','Auto Insurance'],['property','Property Insurance'],['liability','Liability Insurance'],['commercial','Commercial Insurance']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
            </Select>
            <Input label="Coverage Amount (USD) *" type="number" value={form.coverage_amount} onChange={e => set('coverage_amount', e.target.value)} error={errors.coverage_amount?.[0]} placeholder="100000" min="0" />
            <Input label="Start Date" type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} />
            <Input label="End Date" type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} />
            <div style={{ gridColumn: 'span 2' }}>
              <Textarea label="Notes" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional information about this policy request..." />
            </div>
          </div>
        </section>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mut.isPending} onClick={() => mut.mutate(form)}>Save as Draft</Button>
        </div>
      </div>
    </Modal>
  );
}
