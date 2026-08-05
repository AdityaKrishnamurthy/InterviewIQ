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
            }}
          >
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--secondary)' }}>
              Authentication Status: Active
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Email: <strong style={{ color: 'var(--text-primary)' }}>{user?.email}</strong>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
