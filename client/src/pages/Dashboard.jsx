import React from 'react';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="navbar">
        <div className="auth-brand" style={{ marginBottom: 0 }}>
          Interview<span>IQ</span>
        </div>
        <div className="nav-user">
          <span className="nav-user-name">Welcome, {user?.name || 'Candidate'}</span>
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        <div
          className="auth-card"
          style={{ maxWidth: '100%', marginBottom: '2rem' }}
        >
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Candidate Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Welcome to InterviewIQ. Your account has been authenticated successfully.
          </p>

          <div
            style={{
              padding: '1.5rem',
              backgroundColor: 'var(--bg-main)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              marginBottom: '1.5rem',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>
              Authentication Status: Active
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Email: <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
            </p>
          </div>

          <div
            style={{
              padding: '1.5rem',
              backgroundColor: 'rgba(108, 99, 255, 0.05)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--primary)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Step 1: Upload Your Technical Resume
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Let our AI extract your project experience and tech stack to customize your technical interview.
              </p>
            </div>
            <a href="/resume" className="btn btn-primary" style={{ width: 'auto', padding: '0.75rem 1.5rem' }}>
              Upload Resume →
            </a>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
