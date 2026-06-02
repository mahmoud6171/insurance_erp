import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { login } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { getErrorMessage } from '../../utils/helpers';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await login(form);
      setAuth({ user: data.user, access: data.access, refresh: data.refresh });
      toast.success(`Welcome back, ${data.user.first_name}!`);
      navigate('/dashboard');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--surface)' }}>
      {/* Left panel */}
      <div style={{ flex: '0 0 420px', background: 'var(--ink)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '40px 44px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative rings */}
        {[300, 500, 700].map((s, i) => (
          <div key={i} style={{ position: 'absolute', width: s, height: s, border: '1px solid rgba(255,255,255,0.05)', borderRadius: '50%', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }} />
        ))}
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, background: 'var(--amber)', borderRadius: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: '#fff' }}>InsureFlow</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>ERP Platform</div>
            </div>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 36, color: '#fff', lineHeight: 1.2, marginBottom: 16 }}>
            Insurance<br /><em>made</em><br />effortless.
          </div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, maxWidth: 280 }}>
            Manage policy requests, underwriter reviews, and operations tasks in one unified platform.
          </p>
        </div>
        <div style={{ position: 'relative', display: 'flex', gap: 20 }}>
          {[['Policies', '2.4k'], ['Reviews', '98%'], ['SLA', '24h']].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 22, fontFamily: 'var(--font-display)', color: '#fff' }}>{v}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right — login form */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
        <div className="animate-fade-up" style={{ width: '100%', maxWidth: 380 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 30, fontWeight: 400, marginBottom: 6 }}>Sign in</h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 32 }}>Enter your credentials to continue</p>

          {error && (
            <div style={{ padding: '11px 14px', background: 'var(--red-light)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--red)', marginBottom: 20, border: '1px solid #fca5a5' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Email address" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} icon={<Mail size={15} />} required />
            <div>
              <Input label="Password" type={showPw ? 'text' : 'password'} placeholder="••••••••" value={form.password} onChange={(e) => setForm(p => ({ ...p, password: e.target.value }))} icon={<Lock size={15} />} required />
              <button type="button" onClick={() => setShowPw(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', marginTop: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
                {showPw ? <EyeOff size={13} /> : <Eye size={13} />} {showPw ? 'Hide' : 'Show'} password
              </button>
            </div>
            <Button type="submit" loading={loading} size="lg" style={{ marginTop: 8, justifyContent: 'center' }}>Sign in to InsureFlow</Button>
          </form>

          {/* Test accounts hint */}
          <div style={{ marginTop: 32, padding: 16, background: 'var(--surface-2)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-soft)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>Test accounts</div>
            {[
              ['Employee', 'employee@erp.com', 'Test@1234'],
              ['Underwriter', 'underwriter@erp.com', 'Test@1234'],
              ['Ops Manager', 'ops@erp.com', 'Test@1234'],
            ].map(([role, email, pw]) => (
              <div key={role} onClick={() => setForm({ email, password: pw })} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '5px 0', borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <span style={{ fontWeight: 600 }}>{role}</span>
                <span style={{ color: 'var(--text-muted)' }}>{email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
