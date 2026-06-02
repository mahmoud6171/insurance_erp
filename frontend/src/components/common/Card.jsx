export function Card({ children, style, className, onClick }) {
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        background: '#fff',
        border: '1px solid var(--border-soft)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-sm)',
        ...style,
        ...(onClick ? { cursor: 'pointer' } : {}),
      }}
    >
      {children}
    </div>
  );
}
