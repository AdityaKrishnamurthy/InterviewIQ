import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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
        <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
            Candidate Dashboard
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            Welcome to InterviewIQ. Select your target prep module below.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {/* Step 1 Card */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(108, 99, 255, 0.05)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--primary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  1. Resume Deep-Dive Setup
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Upload your PDF resume to let AI parse your projects, skills, and technical stack.
                </p>
              </div>
              <button
                onClick={() => navigate('/resume')}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                Upload Resume →
              </button>
            </div>

            {/* Step 2 Card */}
            <div
              style={{
                padding: '1.5rem',
                backgroundColor: 'rgba(0, 212, 170, 0.05)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--secondary)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
                  2. Adaptive Interview Session
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                  Practice real-time Q&A with Google, Amazon, or Startup personas adapting difficulty based on your answers.
                </p>
              </div>
              <button
                onClick={() => navigate('/interview')}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, var(--secondary) 0%, #00B38F 100%)',
                }}
              >
                Start Interview Session →
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
