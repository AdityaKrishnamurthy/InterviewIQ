import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import ScoreTrendChart from '../components/ScoreTrendChart';
import SessionHistoryList from '../components/SessionHistoryList';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { FileText, Stamp, Check, Clock, TrendUp } from '../components/Icon';
import { API_BASE_URL } from '../config/api';

const STAT_ICONS = [Clock, Check, TrendUp, Stamp];

const todayCaseDate = () =>
  new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

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
        const res = await fetch(`${API_BASE_URL}/api/session/history`, {
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

  const handleDeleteSession = async (sessionId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/session/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete session');
      // Refresh history & stats
      const historyRes = await fetch(`${API_BASE_URL}/api/session/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const historyData = await historyRes.json();
      if (historyRes.ok) {
        setStats(historyData.stats);
        setSessions(historyData.sessions);
      } else {
        setSessions((prev) => prev.filter((s) => s._id !== sessionId));
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const statCards = stats ? [
    { Icon: STAT_ICONS[0], label: 'Total Sessions', value: stats.totalSessions },
    { Icon: STAT_ICONS[1], label: 'Completed', value: stats.completedSessions },
    { Icon: STAT_ICONS[2], label: 'Average Score', value: stats.averageScore > 0 ? `${stats.averageScore} / 5` : '—' },
    { Icon: STAT_ICONS[3], label: 'Best Score', value: stats.bestScore > 0 ? `${stats.bestScore} / 5` : '—' },
  ] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="navbar">
        <Logo to="/dashboard" />
        <div className="nav-user">
          <span className="nav-user-name">{user?.name || 'Candidate'}</span>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        {error && <div className="alert-error">{error}</div>}

        <div className="docket-heading">
          <h1>Dashboard</h1>
          <span className="docket-date">{todayCaseDate()}</span>
        </div>

        {/* Quick Action Row */}
        <div className="dashboard-actions">
          <button
            onClick={() => navigate('/resume')}
            className="btn btn-secondary dashboard-action-btn"
          >
            <FileText size={16} /> Upload Resume
          </button>
          <button
            onClick={() => navigate('/interview')}
            className="btn btn-seal dashboard-action-btn"
          >
            Start Interview →
          </button>
        </div>

        {/* Loading Skeleton */}
        {loading && (
          <div>
            <div className="stats-bar">
              {[0,1,2,3].map(i => (
                <div key={i} className="stat-card skeleton-pulse" style={{ height: '90px' }} />
              ))}
            </div>
            <div className="dashboard-section skeleton-pulse" style={{ height: '340px', marginBottom: '1.5rem' }} />
            <div className="dashboard-section skeleton-pulse" style={{ height: '200px' }} />
          </div>
        )}

        {!loading && (
          <>
            {/* Stats — ledger row */}
            <div className="stats-bar">
              {statCards.map(({ Icon, label, value }, i) => (
                <div key={i} className="stat-card fade-in-up" style={{ animationDelay: `${i * 40}ms` }}>
                  <Icon size={18} className="icon" style={{ color: 'var(--ink-muted)', marginBottom: '0.5rem' }} />
                  <div className="stat-value">{value}</div>
                  <div className="stat-label">{label}</div>
                </div>
              ))}
            </div>

            {/* Persona Breakdown */}
            {stats && Object.keys(stats.personaBreakdown).length > 0 && (
              <div className="dashboard-section fade-in-up" style={{ animationDelay: '120ms' }}>
                <h3 className="section-heading">Persona Breakdown</h3>
                <div className="persona-breakdown-row">
                  {Object.entries(stats.personaBreakdown).map(([persona, data]) => (
                    <div key={persona} className="persona-chip">
                      <span className="persona-chip-name">{persona}</span>
                      <span className="persona-chip-count">{data.count} session{data.count !== 1 ? 's' : ''}</span>
                      <span className="persona-chip-score" style={{
                        color: data.averageScore >= 4 ? 'var(--success)' : data.averageScore >= 3 ? 'var(--warning)' : 'var(--seal)'
                      }}>
                        Avg {data.averageScore}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Score Trend Chart */}
            <div className="dashboard-section fade-in-up" style={{ animationDelay: '180ms' }}>
              <h3 className="section-heading">Performance Trend</h3>
              <ScoreTrendChart data={stats?.scoreTimeline || []} />
            </div>

            {/* Session History List */}
            <div className="dashboard-section fade-in-up" style={{ animationDelay: '240ms' }}>
              <h3 className="section-heading">Interview History</h3>
              <SessionHistoryList sessions={sessions} onDelete={handleDeleteSession} />
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default Dashboard;
