export default function Debug() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Debug Mode</h1>
      <p>If you see this, Next.js routing works</p>
      <p>Time: {new Date().toLocaleString()}</p>
      <p>Environment variables loaded:</p>
      <ul>
        <li>NODE_ENV: {process.env.NODE_ENV}</li>
        <li>Database URL exists: {process.env.DATABASE_URL ? 'Yes' : 'No'}</li>
        <li>Supabase URL exists: {process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Yes' : 'No'}</li>
      </ul>
    </div>
  );
}