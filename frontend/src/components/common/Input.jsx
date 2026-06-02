export function Input({ label, error, icon, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', display:'flex', alignItems:'center' }}>{icon}</span>}
        <input
          {...props}
          style={{
            width: '100%', padding: icon ? '9px 12px 9px 36px' : '9px 12px',
            border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', fontSize: 14,
            fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
            background: '#fff', outline: 'none', transition: 'border-color 0.15s',
            ...props.style,
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--ink)'; if (props.onFocus) props.onFocus(e); }}
          onBlur={(e) => { e.target.style.borderColor = error ? 'var(--red)' : 'var(--border)'; if (props.onBlur) props.onBlur(e); }}
        />
      </div>
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

export function Select({ label, error, children, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
      <select
        {...props}
        style={{
          width: '100%', padding: '9px 12px',
          border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', fontSize: 14,
          fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
          background: '#fff', outline: 'none', cursor: 'pointer',
          ...props.style,
        }}
      >
        {children}
      </select>
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}

export function Textarea({ label, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>}
      <textarea
        {...props}
        style={{
          width: '100%', padding: '9px 12px',
          border: `1.5px solid ${error ? 'var(--red)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)', fontSize: 14,
          fontFamily: 'var(--font-body)', color: 'var(--text-primary)',
          background: '#fff', outline: 'none', resize: 'vertical', minHeight: 80,
          ...props.style,
        }}
      />
      {error && <span style={{ fontSize: 12, color: 'var(--red)' }}>{error}</span>}
    </div>
  );
}
