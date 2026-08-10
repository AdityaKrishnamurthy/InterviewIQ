import React from 'react';
import { useNavigate } from 'react-router-dom';

const getRelativeTime = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

const PERSONA_COLORS = {
  Google: { bg: 'rgba(66, 133, 244, 0.15)', color: '#4285F4', border: '#4285F4' },
  Amazon: { bg: 'rgba(255, 153, 0, 0.15)', color: '#FF9900', border: '#FF9900' },
  Startup: { bg: 'rgba(0, 212, 170, 0.15)', color: 'var(--secondary)', border: 'var(--secondary)' },
  General: { bg: 'rgba(108, 99, 255, 0.15)', color: 'var(--primary)', border: 'var(--primary)' },
};

const getDifficultyStyle = (diff) => {
  switch (diff) {
    case 'easy': return { bg: 'rgba(0, 212, 170, 0.12)', color: 'var(--success)', label: 'Easy' };
    case 'hard': return { bg: 'rgba(255, 107, 107, 0.12)', color: 'var(--error)', label: 'Hard' };
    default: return { bg: 'rgba(255, 179, 71, 0.12)', color: 'var(--warning)', label: 'Medium' };
  }
};

const getScoreColor = (score) => {
  if (score >= 4) return 'var(--success)';
  if (score >= 3) return 'var(--warning)';
  return 'var(--error)';
};

const SessionHistoryList = ({ sessions = [] }) => {
  const navigate = useNavigate();

  if (!sessions || sessions.length === 0) {
    return (
      <div className="history-empty-state">
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem', opacity: 0.5 }}>🎯</div>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
          No interview sessions yet
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Start your first interview to track your progress!
        </p>
        <button
          onClick={() => navigate('/interview')}
          className="btn btn-primary"
          style={{ width: 'auto', padding: '0.65rem 1.5rem', fontSize: '0.9rem' }}
        >
          Start First Interview →
        </button>
      </div>
    );
  }

  return (
    <div className="session-history-list">
      {sessions.map((s, idx) => {
        const personaStyle = PERSONA_COLORS[s.companyPersona] || PERSONA_COLORS.General;
        const diffStyle = getDifficultyStyle(s.currentDifficulty);
        const isCompleted = s.status === 'completed';

        return (
          <div
            key={s._id}
            className="session-history-card"
            onClick={() => {
              if (isCompleted) {
                navigate(`/report/${s._id}`);
              } else {
                navigate('/interview');
              }
            }}
            style={{ animationDelay: `${idx * 60}ms` }}
          >
            <div className="session-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Persona badge */}
                <span
                  className="session-badge"
                  style={{
                    background: personaStyle.bg,
                    color: personaStyle.color,
                    border: `1px solid ${personaStyle.border}`,
                  }}
                >
                  {s.companyPersona}
                </span>

                {/* Status badge */}
                <span
                  className="session-badge"
                  style={{
                    background: isCompleted ? 'rgba(0, 212, 170, 0.12)' : 'rgba(255, 179, 71, 0.12)',
                    color: isCompleted ? 'var(--success)' : 'var(--warning)',
                    border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--warning)'}`,
                  }}
                >
                  {isCompleted ? '✓ Completed' : '● Active'}
                </span>

                {/* Difficulty badge */}
                <span
                  className="session-badge"
                  style={{
                    background: diffStyle.bg,
                    color: diffStyle.color,
                  }}
                >
                  ⚡ {diffStyle.label}
                </span>
              </div>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {getRelativeTime(s.createdAt)}
              </span>
            </div>

            <div className="session-card-body">
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                  {s.targetRole}
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {s.questionCount} Q&A turn{s.questionCount !== 1 ? 's' : ''}
                </span>
              </div>

              {isCompleted && s.overallScore > 0 && (
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: getScoreColor(s.overallScore),
                    lineHeight: 1,
                  }}>
                    {s.overallScore}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/ 5.0</div>
                </div>
              )}

              {!isCompleted && (
                <div style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontStyle: 'italic',
                }}>
                  Resume not supported yet →
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SessionHistoryList;
