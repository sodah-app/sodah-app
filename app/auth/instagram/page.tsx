'use client';

export default function InstagramLoginPage() {
  const handleLogin = () => {
    window.location.href = '/api/auth/instagram/login';
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Connect Instagram</h1>
      <button 
        onClick={handleLogin}
        style={{ padding: '10px 20px', cursor: 'pointer' }}
      >
        Log in with Instagram
      </button>
    </div>
  );
}