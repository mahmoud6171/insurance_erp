export function Loader({ size = 28 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
      <div style={{ width: size, height: size, border: '2.5px solid var(--border)', borderTopColor: 'var(--ink)', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
}
