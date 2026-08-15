import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import ScoreTrendChart from '../components/ScoreTrendChart';
import SessionHistoryList from '../components/SessionHistoryList';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';

const STAT_ICONS = ['📊', '✅', '⭐', '🏆'];

const Dashboard = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/session/history', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || 'Failed to fetch history');
        setStats(data.stats);
        setSessions(data.sessions);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const statCards = stats ? [
    { icon: STAT_ICONS[0], label: 'Total Sessions', value: stats.totalSessions },
    { icon: STAT_ICONS[1], label: 'Completed', value: stats.completedSessions },
    { icon: STAT_ICONS[2], label: 'Average Score', value: stats.averageScore > 0 ? `${stats.averageScore} / 5` : '—' },
    { icon: STAT_ICONS[3], label: 'Best Score', value: stats.bestScore > 0 ? `${stats.bestScore} / 5` : '—' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="navbar">
        <Logo to="/dashboard" />
        <div className="nav-user">
          <span className="nav-user-name">Welcome, {user?.name || 'Candidate'}</span>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        {error && <div className="alert-error">{error}</div>}

        {/* Quick Action Row */}
        <div className="dashboard-actions">
          <button
            onClick={() => navigate('/resume')}
            className="btn btn-secondary dashboard-action-btn"
          >
            📄 Upload Resume
          </button>
          <button
            onClick={() => navigate('/interview')}
            className="btn btn-primary dashboard-action-btn"
            style={{ background: 'linear-gradient(135deg, var(--secondary) 0%, #00B38F 100%)' }}
          >
            🎯 Start New Interview →
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div>
            <div className="stats-bar">
              {[0,1,2,3].map(i => (
                <div key={i} className="stat-card skeleton-pulse" style={{ height: '100px' }} />
              ))}
            </div>
            <div className="dashboard-section skeleton-pulse" style={{ height: '340px', marginBottom: '1.5rem' }} />
            <div className="dashboard-section skeleton-pulse" style={{ height: '200px' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* Stats Bar */}
            <div className="stats-bar">
              {statCards.map((card, i) => (
                <div key={i} className="stat-card fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="stat-icon">{card.icon}</div>
                  <div className="stat-value">{card.value}</div>
                  <div className="stat-label">{card.label}</div>
                </div>
              ))}
            </div>

            {/* Persona Breakdown */}
            {stats && Object.keys(stats.personaBreakdown).length > 0 && (
              <div className="dashboard-section fade-in-up" style={{ animationDelay: '350ms' }}>
                <h3 className="section-heading">Persona Breakdown</h3>
                <div className="persona-breakdown-row">
                  {Object.entries(stats.personaBreakdown).map(([persona, data]) => (
                    <div key={persona} className="persona-chip">
                      <span className="persona-chip-name">{persona}</span>
                      <span className="persona-chip-count">{data.count} session{data.count !== 1 ? 's' : ''}</span>
                      <span className="persona-chip-score" style={{
                        color: data.averageScore >= 4 ? 'var(--success)' : data.averageScore >= 3 ? 'var(--warning)' : 'var(--error)'
                      }}>
                        Avg: {data.averageScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Trend Chart */}
            <div className="dashboard-section fade-in-up" style={{ animationDelay: '450ms' }}>
              <h3 className="section-heading">📈 Performance Trend</h3>
              <ScoreTrendChart data={stats?.scoreTimeline || []} />
            </div>

            {/* Session History List */}
            <div className="dashboard-section fade-in-up" style={{ animationDelay: '550ms' }}>
              <h3 className="section-heading">📋 Past Sessions</h3>
              <SessionHistoryList sessions={sessions} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
