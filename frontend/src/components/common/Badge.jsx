export function Badge({ label, color, bg, size = 'sm' }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: size === 'sm' ? '3px 9px' : '5px 12px',
      borderRadius: 99,
      fontSize: size === 'sm' ? 11 : 12,
      fontWeight: 600,
      letterSpacing: '0.03em',
      color: color,
      background: bg,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
      {label}
    </span>
  );
}
