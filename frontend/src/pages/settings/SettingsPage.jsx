import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { logout, changePassword } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { getErrorMessage } from '../../utils/helpers';
import { useNavigate } from 'react-router-dom';
import { LogOut, Lock, User } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const { user, refreshToken, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [pwForm, setPwForm] = useState({ old_password: '', new_password: '' });

  const logoutMut = useMutation({
    mutationFn: () => logout(refreshToken),
    onSettled: () => { clearAuth(); navigate('/login'); },
  });

  const changePwMut = useMutation({
    mutationFn: changePassword,
    onSuccess: () => { toast.success('Password changed!'); setPwForm({ old_password: '', new_password: '' }); },
    onError: (e) => toast.error(getErrorMessage(e)),
  });

  return (
    <div className="animate-fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 520 }}>
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <User size={15} color="var(--text-muted)" />
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Profile</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {[['Name', user?.full_name], ['Email', user?.email], ['Role', user?.role?.replace('_', ' ')], ['Department', user?.department || '—']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 14, fontWeight: 500, textTransform: 'capitalize' }}>{v}</div>
            </div>
          ))}
        </div>
      </Card>
      <Card style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <Lock size={15} color="var(--text-muted)" />
          <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>Change Password</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Current Password" type="password" value={pwForm.old_password} onChange={e => setPwForm(p => ({ ...p, old_password: e.target.value }))} />
          <Input label="New Password" type="password" value={pwForm.new_password} onChange={e => setPwForm(p => ({ ...p, new_password: e.target.value }))} />
          <Button loading={changePwMut.isPending} onClick={() => changePwMut.mutate(pwForm)} style={{ alignSelf: 'flex-start' }}>Update Password</Button>
        </div>
      </Card>
      <Card style={{ padding: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--red)', marginBottom: 12 }}>Danger Zone</div>
        <Button variant="danger" icon={<LogOut size={14} />} loading={logoutMut.isPending} onClick={() => logoutMut.mutate()}>Sign out of InsureFlow</Button>
      </Card>
    </div>
  );
}
