export default function CrmLoading() {
  return (
    <div style={{ padding: '2rem 2.5rem' }}>
      <div
        style={{
          height: '1.5rem',
          width: '12rem',
          background: 'oklch(90% 0.005 240)',
          marginBottom: '1.5rem',
        }}
      />
      <div
        style={{
          height: '2.5rem',
          width: '100%',
          background: 'oklch(93% 0.004 240)',
          marginBottom: '1rem',
        }}
      />
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          style={{
            height: '3rem',
            width: '100%',
            background: i % 2 === 0 ? 'oklch(95% 0.003 240)' : 'oklch(97% 0.002 240)',
            marginBottom: '2px',
          }}
        />
      ))}
    </div>
  )
}
