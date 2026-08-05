import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ScoreRing = ({ score }) => {
  const radius = 70;
  const stroke = 12;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let strokeColor = 'var(--secondary)'; // > 80%
  if (score < 60) strokeColor = 'var(--error)';
  else if (score < 80) strokeColor = 'var(--warning)';

  return (
    <div style={{ position: 'relative', width: radius * 2, height: radius * 2, margin: '0 auto' }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          stroke="var(--bg-main)"
          fill="transparent"
          strokeWidth={stroke}
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
        <circle
          stroke={strokeColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          strokeLinecap="round"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span style={{ fontSize: '2.2rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>
          {score}%
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
          Confidence Score
        </span>
      </div>
    </div>
  );
};

const FinalReport = () => {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [report, setReport] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const { token, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReport = async () => {
      try {
        let id = sessionId;
        if (!id) {
          // fetch latest user session if no ID in URL
          const resSessions = await fetch('/api/session', {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (resSessions.ok) {
            const dataSessions = await resSessions.json();
            if (dataSessions.sessions && dataSessions.sessions.length > 0) {
              id = dataSessions.sessions[0]._id;
            }
          }
        }

        if (!id) {
          setError('No interview session found');
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/session/${id}/report`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to load report');
        }

        setSession(data.session);
        setReport(data.report);
      } catch (err) {
        setError(err.message || 'Error fetching interview report');
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchReport();
  }, [sessionId, token]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          <span className="spinner" style={{ fontSize: '2rem', display: 'block', marginBottom: '1rem' }}>⚡</span>
          Generating Candidate Truthfulness & Skill Audit Report...
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div className="alert-error" style={{ marginBottom: '1.5rem' }}>
            {error || 'Report unavailable'}
          </div>
          <button onClick={() => navigate('/interview')} className="btn btn-primary">
            Start New Interview Session →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header */}
      <header className="navbar no-print">
        <div className="auth-brand" style={{ marginBottom: 0 }}>
          Interview<span>IQ</span>
        </div>
        <div className="nav-user">
          <button onClick={handlePrint} className="btn btn-secondary">
            🖨️ Export PDF
          </button>
          <button onClick={() => navigate('/interview')} className="btn btn-primary" style={{ width: 'auto' }}>
            New Session →
          </button>
          <button onClick={logout} className="btn btn-secondary">
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-container" style={{ flex: 1, paddingBottom: '3rem' }}>
        {/* Hero Section */}
        <div
          className="auth-card"
          style={{
            maxWidth: '100%',
            marginBottom: '2rem',
            background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(108, 99, 255, 0.08) 100%)',
            border: '1px solid var(--border-color)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '2rem',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span
                style={{
                  background: 'rgba(108, 99, 255, 0.15)',
                  color: 'var(--primary)',
                  border: '1px solid var(--primary)',
                  padding: '0.2rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {session?.companyPersona} Persona Audit
              </span>
              <span
                style={{
                  background: 'var(--bg-main)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                  padding: '0.2rem 0.75rem',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                }}
              >
                Role: {session?.targetRole}
              </span>
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-primary)' }}>
              Technical Candidate Report
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              {report.summary}
            </p>
          </div>

          <div>
            <ScoreRing score={report.overallScore} />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className="no-print"
          style={{
            display: 'flex',
            gap: '0.5rem',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '1.5rem',
            overflowX: 'auto',
          }}
        >
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'truthfulness', label: '🔍 Truthfulness Audit' },
            { id: 'strengths', label: '⚡ Strengths & Gaps' },
            { id: 'roadmap', label: '🗺️ Action Roadmap' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? '2px solid var(--primary)' : '2px solid transparent',
                  color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
                  padding: '0.75rem 1.25rem',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.95rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab 1: Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="auth-card" style={{ maxWidth: '100%' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--secondary)', marginBottom: '1rem' }}>
                Interview Session Metrics
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Target Role</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{session?.targetRole}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Company Persona</span>
                  <strong style={{ color: 'var(--primary)' }}>{session?.companyPersona}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Final Difficulty Level</span>
                  <strong style={{ color: 'var(--warning)', textTransform: 'uppercase' }}>{session?.currentDifficulty}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>Q&A Turns Evaluated</span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {session?.messages?.filter((m) => m.role === 'candidate').length || 0} Turns
                  </strong>
                </div>
              </div>
            </div>

            <div className="auth-card" style={{ maxWidth: '100%' }}>
              <h3 style={{ fontSize: '1.1rem', color: 'var(--primary)', marginBottom: '1rem' }}>
                Topics & Resume Deep Dive Areas
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {session?.topicHistory?.map((topic, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      color: 'var(--text-primary)',
                      padding: '0.35rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem',
                    }}
                  >
                    🎯 {topic}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Truthfulness Audit */}
        {activeTab === 'truthfulness' && (
          <div className="auth-card" style={{ maxWidth: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Resume Truthfulness Checker
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Cross-check of claimed resume skills against demonstrated depth during the interview Q&A.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {report.skillConfidence?.map((item, idx) => {
                const isStrong = item.status === 'strong';
                const isWeak = item.status === 'weak';
                const badgeColor = isStrong ? 'var(--success)' : isWeak ? 'var(--error)' : 'var(--warning)';
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-main)',
                      border: `1px solid var(--border-color)`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.skill}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          Rating: <strong style={{ color: badgeColor }}>{item.score} / 5</strong>
                        </span>
                        <span
                          style={{
                            background: `rgba(${isStrong ? '0,212,170' : isWeak ? '255,107,107' : '255,179,71'}, 0.15)`,
                            color: badgeColor,
                            border: `1px solid ${badgeColor}`,
                            padding: '0.15rem 0.65rem',
                            borderRadius: '20px',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      💬 <em>"{item.evidence}"</em>
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Strengths & Weaknesses */}
        {activeTab === 'strengths' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="auth-card" style={{ maxWidth: '100%', borderColor: 'rgba(0, 212, 170, 0.3)' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🟢 Demonstrated Strengths
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {report.strengths?.map((str, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.925rem' }}>
                    <span style={{ color: 'var(--success)', fontWeight: 700 }}>✓</span>
                    <span style={{ color: 'var(--text-primary)' }}>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="auth-card" style={{ maxWidth: '100%', borderColor: 'rgba(255, 107, 107, 0.3)' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'var(--error)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔴 Key Gaps & Weak Points
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {report.weaknesses?.map((weak, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', fontSize: '0.925rem' }}>
                    <span style={{ color: 'var(--error)', fontWeight: 700 }}>!</span>
                    <span style={{ color: 'var(--text-primary)' }}>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Tab 4: Improvement Roadmap */}
        {activeTab === 'roadmap' && (
          <div className="auth-card" style={{ maxWidth: '100%' }}>
            <h3 style={{ fontSize: '1.2rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Actionable Candidate Roadmap
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Tailored preparation recommendations generated by Groq AI based on your technical session.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {report.roadmap?.map((item, idx) => {
                const isHigh = item.priority === 'High';
                const pColor = isHigh ? 'var(--error)' : 'var(--warning)';
                return (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderLeft: `4px solid ${pColor}`,
                      borderRadius: 'var(--radius-md)',
                      padding: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.title}
                      </h4>
                      <span
                        style={{
                          background: `rgba(${isHigh ? '255,107,107' : '255,179,71'}, 0.15)`,
                          color: pColor,
                          padding: '0.15rem 0.65rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        {item.priority} Priority
                      </span>
                    </div>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FinalReport;
