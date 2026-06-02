import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, Trash2, UserCheck, ShieldCheck, Briefcase, User } from 'lucide-react';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/auth';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { EmptyState } from '../../components/common/EmptyState';
import { Modal } from '../../components/common/Modal';
import { Input, Select } from '../../components/common/Input';
import { Badge } from '../../components/common/Badge';
import { getErrorMessage, formatDate } from '../../utils/helpers';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

const ROLE_META = {
  employee:    { label: 'Employee',    color: 'var(--blue)',   bg: 'var(--blue-light)',   icon: User },
  underwriter: { label: 'Underwriter', color: 'var(--purple)', bg: 'var(--purple-light)', icon: ShieldCheck },
  ops_manager: { label: 'Ops Manager', color: 'var(--amber)',  bg: 'var(--amber-light)',  icon: Briefcase },
  admin:       { label: 'Admin',       color: 'var(--red)',    bg: 'var(--red-light)',    icon: UserCheck },
};

const EMPTY_FORM = { email: '', first_name: '', last_name: '', role: 'employee', department: '', password: '', password_confirm: '' };

function UserFormModal({ open, onClose, editUser, onSuccess }) {
  const isEdit = !!editUser;
  const [form, setForm] = useState(isEdit ? { first_name: editUser.first_name, last_name: editUser.last_name, role: editUser.role, department: editUser.department || '' } : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const mut = useMutation({
    mutationFn: isEdit ? (data) => updateUser(editUser.id, data) : createUser,
    onSuccess: () => { toast.success(isEdit ? 'User updated!' : 'User created!'); onSuccess(); onClose(); },
    onError: (e) => {
      const d = e?.response?.data;
      if (typeof d === 'object' && !d.detail) setErrors(d);
      else toast.error(getErrorMessage(e));
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? `Edit — ${editUser.full_name}` : 'Create New User'} width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Input label="First Name *" value={form.first_name} onChange={e => set('first_name', e.target.value)} error={errors.first_name?.[0]} placeholder="Sara" />
          <Input label="Last Name *"  value={form.last_name}  onChange={e => set('last_name',  e.target.value)} error={errors.last_name?.[0]}  placeholder="Ahmed" />
        </div>
        {!isEdit && <Input label="Email *" type="email" value={form.email} onChange={e => set('email', e.target.value)} error={errors.email?.[0]} placeholder="sara@company.com" />}
        <Select label="Role *" value={form.role} onChange={e => set('role', e.target.value)} error={errors.role?.[0]}>
          {Object.entries(ROLE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </Select>
        <Input label="Department" value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Commercial Lines" />
        {!isEdit && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Input label="Password *" type="password" value={form.password} onChange={e => set('password', e.target.value)} error={errors.password?.[0]} />
            <Input label="Confirm *"  type="password" value={form.password_confirm} onChange={e => set('password_confirm', e.target.value)} error={errors.password_confirm?.[0]} />
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={mut.isPending} onClick={() => mut.mutate(form)}>{isEdit ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </div>
    </Modal>
  );
}

function DeleteConfirmModal({ open, onClose, user, onSuccess }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => deleteUser(user.id),
    onSuccess: () => { toast.success('User deleted.'); qc.invalidateQueries(['users']); onSuccess(); onClose(); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <Modal open={open} onClose={onClose} title="Delete User" width={400}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Are you sure you want to delete <strong>{user?.full_name}</strong>? This action cannot be undone.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="danger" loading={mut.isPending} onClick={() => mut.mutate()}>Delete User</Button>
        </div>
      </div>
    </Modal>
  );
}

export default function UsersPage() {
  const { user: me } = useAuthStore();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers().then(r => r.data),
  });

  const users = (data?.results || data || []).filter(u => {
    const matchSearch = !search || u.email.includes(search) || u.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Role summary counts
  const roleCounts = (data?.results || data || []).reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Role summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {Object.entries(ROLE_META).map(([role, meta]) => {
          const Icon = meta.icon;
          return (
            <Card key={role} style={{ padding: '16px 18px', cursor: 'pointer', border: roleFilter === role ? `2px solid ${meta.color}` : '1px solid var(--border-soft)' }}
              onClick={() => setRoleFilter(r => r === role ? '' : role)}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: 26, fontFamily: 'var(--font-display)', lineHeight: 1 }}>{roleCounts[role] || 0}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{meta.label}s</div>
                </div>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={18} color={meta.color} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: 200 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email..." style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none', background: '#fff' }} />
        </div>
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 'var(--radius)', fontSize: 14, fontFamily: 'var(--font-body)', background: '#fff', cursor: 'pointer', outline: 'none' }}>
          <option value="">All Roles</option>
          {Object.entries(ROLE_META).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
        </select>
        <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New User</Button>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {isLoading ? <Loader /> : users.length === 0 ? (
          <EmptyState icon="👤" title="No users found" subtitle="Adjust your filters or create a new user." action={<Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New User</Button>} />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-soft)', background: 'var(--surface)' }}>
                {['User', 'Email', 'Role', 'Department', 'Joined', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const rmeta = ROLE_META[u.role] || {};
                const initials = `${u.first_name?.[0] || ''}${u.last_name?.[0] || ''}`.toUpperCase();
                const isMe = u.id === me?.id;
                return (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--border-soft)' : 'none', opacity: u.is_active ? 1 : 0.5 }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: rmeta.bg || 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: rmeta.color || 'var(--text-muted)', flexShrink: 0 }}>{initials}</div>
                        <div>
                          <div style={{ fontSize: 14, fontWeight: 500 }}>{u.full_name} {isMe && <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>(you)</span>}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.is_active ? 'Active' : 'Inactive'}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td style={{ padding: '13px 16px' }}><Badge label={rmeta.label} color={rmeta.color} bg={rmeta.bg} /></td>
                    <td style={{ padding: '13px 16px', fontSize: 13, color: 'var(--text-muted)' }}>{u.department || '—'}</td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: 'var(--text-muted)' }}>{formatDate(u.created_at)}</td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button variant="ghost" size="sm" icon={<Edit2 size={13} />} onClick={() => setEditTarget(u)}>Edit</Button>
                        {!isMe && <Button variant="ghost" size="sm" icon={<Trash2 size={13} />} style={{ color: 'var(--red)' }} onClick={() => setDeleteTarget(u)}>Delete</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <UserFormModal open={showCreate || !!editTarget} onClose={() => { setShowCreate(false); setEditTarget(null); }} editUser={editTarget} onSuccess={() => qc.invalidateQueries(['users'])} />
      {deleteTarget && <DeleteConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} user={deleteTarget} onSuccess={() => {}} />}
    </div>
  );
}
