export function Button({ children, variant = 'primary', size = 'md', loading, icon, onClick, type = 'button', disabled, style }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    fontFamily: 'var(--font-body)', fontWeight: 500,
    border: 'none', cursor: disabled || loading ? 'not-allowed' : 'pointer',
    borderRadius: 'var(--radius)', transition: 'all 0.18s ease',
    opacity: disabled || loading ? 0.6 : 1,
    whiteSpace: 'nowrap', outline: 'none',
    padding: size === 'sm' ? '6px 14px' : size === 'lg' ? '12px 24px' : '9px 18px',
    fontSize: size === 'sm' ? 13 : size === 'lg' ? 15 : 14,
  };

  const variants = {
    primary: { background: 'var(--ink)', color: 'var(--text-inverse)', boxShadow: 'var(--shadow-sm)' },
    secondary: { background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
    danger: { background: 'var(--red)', color: '#fff' },
    ghost: { background: 'transparent', color: 'var(--text-secondary)' },
    amber: { background: 'var(--amber)', color: '#fff' },
    success: { background: 'var(--green)', color: '#fff' },
  };

  return (
    <button type={type} onClick={onClick} disabled={disabled || loading} style={{ ...base, ...variants[variant], ...style }}>
      {loading ? <span style={{ width: 14, height: 14, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : icon}
      {children}
    </button>
  );
}
