import Link from 'next/link';

export default function NotFound() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        textAlign: 'center',
        gap: '16px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <div style={{ fontSize: '64px', color: '#999' }}>404</div>
      <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>Page Not Found</h1>
      <p style={{ color: '#666', margin: 0 }}>The page you are looking for does not exist.</p>
      <Link
        href="/"
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          backgroundColor: '#1976d2',
          color: '#fff',
          borderRadius: '8px',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
