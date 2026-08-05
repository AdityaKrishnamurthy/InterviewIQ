import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PERSONAS_LIST = [
  { id: 'Google', title: 'Google Persona', tag: 'Algorithms & Complexity', desc: 'LeetCode, DSA, Big-O trade-offs, and edge case rigor.' },
  { id: 'Amazon', title: 'Amazon Persona', tag: 'Leadership & STAR', desc: 'Behavioral questions, STAR method, customer obsession & system scalability.' },
  { id: 'Startup', title: 'Startup Persona', tag: 'Systems & Projects', desc: 'Architecture, project deep-dives, production trade-offs, and rapid execution.' },
  { id: 'General', title: 'General Persona', tag: 'Full-Stack Technical', desc: 'Balanced CS fundamentals, web dev, and code review.' },
];

const InterviewSession = () => {
  const [selectedPersona, setSelectedPersona] = useState('Google');
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [session, setSession] = useState(null);
  const [answer, setAnswer] = useState('');
  const [starting, setStarting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [lastFeedback, setLastFeedback] = useState(null);

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  const handleStartSession = async () => {
    setError('');
    setStarting(true);

    try {
      const response = await fetch('/api/session/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          companyPersona: selectedPersona,
          targetRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to start interview session');
      }

      setSession(data.session);
    } catch (err) {
      setError(err.message || 'Error starting session. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleSendAnswer = async (e) => {
    e.preventDefault();
    if (!answer.trim() || submitting || !session) return;

    setError('');
    const currentAnswer = answer;
    setAnswer('');
    setSubmitting(true);

    try {
      const response = await fetch('/api/session/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId: session._id,
          answer: currentAnswer,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to submit answer');
      }

      setSession(data.session);
      if (data.evaluation) {
        setLastFeedback(data.evaluation);
      }
    } catch (err) {
      setError(err.message || 'Error submitting answer');
      setAnswer(currentAnswer); // restore answer input on failure
    } finally {
      setSubmitting(false);
    }
  };

  const getDifficultyBadgeStyle = (difficulty) => {
    switch (difficulty) {
      case 'easy':
        return { bg: 'rgba(0, 212, 170, 0.15)', color: 'var(--success)', border: 'var(--success)', text: 'Easy' };
      case 'hard':
        return { bg: 'rgba(255, 107, 107, 0.15)', color: 'var(--error)', border: 'var(--error)', text: 'Hard' };
      case 'medium':
      default:
        return { bg: 'rgba(255, 179, 71, 0.15)', color: 'var(--warning)', border: 'var(--warning)', text: 'Medium' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header Navbar */}
      <header className="navbar">
        <div className="auth-brand" style={{ marginBottom: 0 }}>
          Interview<span>IQ</span>
        </div>
        <div className="nav-user">
          <button onClick={() => navigate('/resume')} className="btn btn-secondary">
            Resume Specs
          </button>
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Step A: Select Persona & Target Role if Session not yet started */}
        {!session ? (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Adaptive Technical Interview Session
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Select a target company persona. The AI interviewer will analyze your response quality in real time and adjust difficulty dynamically.
              </p>
            </div>

            <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Target Role / Position</label>
                <input
                  type="text"
                  className="form-input"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer / Full Stack Developer"
                />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Select Company Persona
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {PERSONAS_LIST.map((persona) => {
                  const isSelected = selectedPersona === persona.id;
                  return (
                    <div
                      key={persona.id}
                      onClick={() => setSelectedPersona(persona.id)}
                      style={{
                        padding: '1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'var(--bg-main)',
                        border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-color)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {persona.title}
                        </h4>
                        <span
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.15rem 0.5rem',
                            borderRadius: '4px',
                            background: isSelected ? 'var(--primary)' : 'var(--bg-surface)',
                            color: isSelected ? '#FFF' : 'var(--text-secondary)',
                          }}
                        >
                          {persona.tag}
                        </span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                        {persona.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleStartSession}
                className="btn btn-primary"
                disabled={starting}
                style={{ width: '100%', padding: '1rem' }}
              >
                {starting ? 'Initializing Adaptive Interview Agent...' : `Start ${selectedPersona} Interview →`}
              </button>
            </div>
          </div>
        ) : (
          /* Step B: Live Interview Interface */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>
            {/* Top Bar Status */}
            <div
              className="auth-card"
              style={{
                maxWidth: '100%',
                padding: '1rem 1.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Interview Persona</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {session.companyPersona} Agent — {session.targetRole}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                    Current Difficulty
                  </span>
                  {(() => {
                    const badge = getDifficultyBadgeStyle(session.currentDifficulty);
                    return (
                      <span
                        style={{
                          display: 'inline-block',
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                          padding: '0.2rem 0.75rem',
                          borderRadius: '20px',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                        }}
                      >
                        ⚡ {badge.text.toUpperCase()}
                      </span>
                    );
                  })()}
                </div>

                {typeof session.overallScore === 'number' && session.overallScore > 0 && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>
                      Performance Rating
                    </span>
                    <span
                      style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        color: session.overallScore >= 4 ? 'var(--success)' : 'var(--warning)',
                      }}
                    >
                      {session.overallScore} / 5.0
                    </span>
                  </div>
                )}

                <button
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      await fetch(`/api/session/${session._id}/complete`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      navigate(`/report/${session._id}`);
                    } catch (err) {
                      setError('Error completing session');
                    } finally {
                      setSubmitting(false);
                    }
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                >
                  End & View Report →
                </button>
              </div>
            </div>

            {/* AI Answer Evaluation Banner */}
            {lastFeedback && (
              <div
                style={{
                  background: lastFeedback.score >= 4 ? 'rgba(0, 212, 170, 0.1)' : 'rgba(255, 179, 71, 0.1)',
                  border: `1px solid ${lastFeedback.score >= 4 ? 'var(--success)' : 'var(--warning)'}`,
                  borderRadius: 'var(--radius-md)',
                  padding: '0.85rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    color: lastFeedback.score >= 4 ? 'var(--success)' : 'var(--warning)',
                  }}
                >
                  Score: {lastFeedback.score}/5
                </div>
                <div style={{ color: 'var(--text-primary)', flex: 1 }}>
                  {lastFeedback.feedback}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Adapted difficulty to <strong>{lastFeedback.newDifficulty}</strong>
                </div>
              </div>
            )}

            {/* Conversation Log */}
            <div
              style={{
                flex: 1,
                minHeight: '380px',
                maxHeight: '520px',
                overflowY: 'auto',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
              }}
            >
              {session.messages.map((msg, idx) => {
                const isInterviewer = msg.role === 'interviewer';
                return (
                  <div
                    key={msg.id || idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isInterviewer ? 'flex-start' : 'flex-end',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        marginBottom: '0.25rem',
                        display: 'flex',
                        gap: '0.5rem',
                      }}
                    >
                      <span>{isInterviewer ? `🤖 AI Interviewer (${msg.difficulty || 'medium'})` : '👤 Candidate'}</span>
                    </div>

                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '1rem 1.25rem',
                        borderRadius: 'var(--radius-md)',
                        background: isInterviewer ? 'var(--bg-main)' : 'rgba(108, 99, 255, 0.15)',
                        border: isInterviewer ? '1px solid var(--border-color)' : '1px solid var(--primary)',
                        color: 'var(--text-primary)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}

              {submitting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span className="spinner">⏳</span> Evaluating answer quality and generating adaptive follow-up...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Answer Input Controls */}
            <form onSubmit={handleSendAnswer} style={{ display: 'flex', gap: '0.75rem' }}>
              <textarea
                className="form-input"
                rows={3}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Type your technical response here (explain trade-offs, architecture, complexity)..."
                disabled={submitting}
                style={{ flex: 1, resize: 'vertical' }}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !answer.trim()}
                style={{ width: 'auto', padding: '0 2rem', height: 'auto', alignSelf: 'stretch' }}
              >
                {submitting ? 'Analyzing...' : 'Submit Answer →'}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewSession;
