import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Dot, FileText, Trash, Spinner } from './Icon';

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
  Google:  { color: 'var(--primary)',     border: 'var(--primary)' },
  Amazon:  { color: 'var(--warning)',     border: 'var(--warning)' },
  Startup: { color: 'var(--secondary)',   border: 'var(--secondary)' },
  General: { color: 'var(--primary-ink)', border: 'var(--primary-ink)' },
};

const getDifficultyStyle = (diff) => {
  switch (diff) {
    case 'easy': return { color: 'var(--success)', label: 'Easy' };
    case 'hard': return { color: 'var(--seal)', label: 'Hard' };
    default: return { color: 'var(--warning)', label: 'Medium' };
  }
};

const getScoreColor = (score) => {
  if (score >= 4) return 'var(--success)';
  if (score >= 3) return 'var(--warning)';
  return 'var(--seal)';
};

const SessionHistoryList = ({ sessions = [], onDelete }) => {
  const navigate = useNavigate();
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this interview record?')) return;
    if (onDelete) {
      setDeletingId(sessionId);
      try {
        await onDelete(sessionId);
      } finally {
        setDeletingId(null);
      }
    }
  };

  if (!sessions || sessions.length === 0) {
    return (
      <div className="history-empty-state">
        <FileText size={32} style={{ color: 'var(--ink-muted)', marginBottom: '1rem' }} />
        <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.5rem', color: 'var(--ink)' }}>
          No interviews yet
        </h3>
        <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
          Start your first interview to see your history here.
        </p>
        <button
          onClick={() => navigate('/interview')}
          className="btn btn-seal"
          style={{ width: 'auto', padding: '0.65rem 1.5rem', fontSize: '0.82rem' }}
        >
          Start First Interview →
        </button>
      </div>
    );
  }

  return (
    <div className="session-history-list">
      {sessions.map((s) => {
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
          >
            <div className="session-card-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span className="session-badge" style={{ color: personaStyle.color, border: `1px solid ${personaStyle.border}` }}>
                  {s.companyPersona}
                </span>

                <span className="session-badge" style={{
                  color: isCompleted ? 'var(--success)' : 'var(--warning)',
                  border: `1px solid ${isCompleted ? 'var(--success)' : 'var(--warning)'}`,
                }}>
                  {isCompleted ? <Check size={10} /> : <Dot size={7} />} {isCompleted ? 'Closed' : 'Open'}
                </span>

                <span className="session-badge" style={{ color: diffStyle.color, border: `1px solid ${diffStyle.color}` }}>
                  {diffStyle.label}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
                  {getRelativeTime(s.createdAt)}
                </span>
                {onDelete && (
                  <button
                    type="button"
                    className="session-delete-btn"
                    onClick={(e) => handleDelete(e, s._id)}
                    disabled={deletingId === s._id}
                    title="Delete interview session"
                    aria-label="Delete interview session"
                  >
                    {deletingId === s._id ? <Spinner size={13} /> : <Trash size={14} />}
                  </button>
                )}
              </div>
            </div>

            <div className="session-card-body">
              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '0.2rem' }}>
                  {s.targetRole}
                </h4>
                <span style={{ fontSize: '0.8rem', color: 'var(--ink-muted)' }}>
                  {s.questionCount} Q&amp;A turn{s.questionCount !== 1 ? 's' : ''}
                </span>
              </div>

              {isCompleted && s.overallScore > 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '0.25rem',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: '1.3rem',
                    fontWeight: 700,
                    color: getScoreColor(s.overallScore),
                    lineHeight: 1,
                  }}>
                    {s.overallScore}
                  </span>
                  <span style={{
                    fontSize: '0.82rem',
                    color: 'var(--ink-muted)',
                    fontWeight: 500,
                  }}>
                    / 5.0
                  </span>
                </div>
              )}

              {!isCompleted && (
                <div style={{
                  fontSize: '0.8rem',
                  color: 'var(--warning)',
                  fontWeight: 700,
                }}>
                  Resume →
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
