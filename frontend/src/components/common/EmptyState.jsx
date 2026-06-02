export function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', gap: 12, color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 40 }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-secondary)' }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, textAlign: 'center', maxWidth: 300 }}>{subtitle}</div>}
      {action}
    </div>
  );
}
