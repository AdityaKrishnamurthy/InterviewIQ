import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { Printer, Check, AlertFlag, Spinner, Stamp } from '../components/Icon';
import { API_BASE_URL } from '../config/api';

const ScoreRing = ({ score }) => {
  const safeScore = typeof score === 'number' && !isNaN(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0;
  const radius = 66;
  const stroke = 10;
  const normalizedRadius = radius - stroke * 0.5;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (safeScore / 100) * circumference;

  let strokeColor = 'var(--success)';
  if (safeScore < 60) strokeColor = 'var(--seal)';
  else if (safeScore < 80) strokeColor = 'var(--warning)';

  return (
    <div style={{ position: 'relative', width: radius * 2, height: radius * 2, margin: '0 auto' }}>
      <svg height={radius * 2} width={radius * 2} style={{ transform: 'rotate(-90deg)' }}>
        <circle stroke="var(--border-color)" fill="transparent" strokeWidth={stroke} r={normalizedRadius} cx={radius} cy={radius} />
        <circle
          stroke={strokeColor}
          fill="transparent"
          strokeWidth={stroke}
          strokeDasharray={circumference + ' ' + circumference}
          style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16, 1, 0.3, 1)' }}
          strokeLinecap="butt"
          r={normalizedRadius}
          cx={radius}
          cy={radius}
        />
      </svg>
      <div style={{
        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}>
          {safeScore}%
        </span>
        <span style={{ fontSize: '0.7rem', color: 'var(--ink-secondary)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Confidence
        </span>
      </div>
    </div>
  );
};

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'truthfulness', label: 'Truthfulness Audit' },
  { id: 'strengths', label: 'Strengths & Gaps' },
  { id: 'roadmap', label: 'Action Roadmap' },
];

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
          const resSessions = await fetch(`${API_BASE_URL}/api/session`, {
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

        const response = await fetch(`${API_BASE_URL}/api/session/${id}/report`, {
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

  const handlePrint = () => window.print();

  if (loading) {
    return (
      <div className="auth-container">
        <div style={{ textAlign: 'center', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Spinner size={26} />
          Preparing the ruling…
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
          <button onClick={() => navigate('/interview')} className="btn btn-seal">
            Start New Interview →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="navbar no-print">
        <Logo to="/dashboard" />
        <div className="nav-user">
          <button onClick={handlePrint} className="btn btn-secondary">
            <Printer size={14} /> Export PDF
          </button>
          <button onClick={() => navigate('/interview')} className="btn btn-seal" style={{ width: 'auto' }}>
            New Interview →
          </button>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-secondary">Sign Out</button>
        </div>
      </header>

      <main className="dashboard-container" style={{ flex: 1, paddingBottom: '3rem' }}>
        <div className="ruling-header">
          <div>
            <div className="ruling-tag-row">
              <span className="ruling-tag" style={{ color: 'var(--primary-ink)', borderColor: 'var(--primary-ink)' }}>
                {session?.companyPersona} Persona
              </span>
              <span className="ruling-tag" style={{ color: 'var(--ink-secondary)', borderColor: 'var(--border-color)' }}>
                {session?.targetRole}
              </span>
            </div>
            <h1 style={{ fontSize: '1.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--ink)' }}>
              The Ruling
            </h1>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: '55ch' }}>
              {report.summary}
            </p>
          </div>

          <ScoreRing score={report.overallScore} />
        </div>

        {/* Tabs */}
        <div className="report-tabs no-print">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`report-tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="paper" style={{ padding: '1.5rem' }}>
              <h3 className="section-heading">Session Metrics</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--ink-secondary)' }}>Target Role</span>
                  <strong style={{ color: 'var(--ink)' }}>{session?.targetRole}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--ink-secondary)' }}>Company Persona</span>
                  <strong style={{ color: 'var(--primary-ink)' }}>{session?.companyPersona}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--ink-secondary)' }}>Final Difficulty</span>
                  <strong style={{ color: 'var(--warning)', textTransform: 'uppercase' }}>{session?.currentDifficulty}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--ink-secondary)' }}>Q&amp;A Turns Evaluated</span>
                  <strong style={{ color: 'var(--ink)' }}>
                    {session?.messages?.filter((m) => m.role === 'candidate').length || 0}
                  </strong>
                </div>
              </div>
            </div>

            <div className="paper" style={{ padding: '1.5rem' }}>
              <h3 className="section-heading">Topics on Record</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {session?.topicHistory?.map((topic, idx) => (
                  <span key={idx} className="exhibit-tag">{topic}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Truthfulness Audit */}
        {activeTab === 'truthfulness' && (
          <div className="paper" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--ink)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              Resume Truthfulness Checker
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Cross-check of claimed resume skills against demonstrated depth during the interview Q&amp;A.
            </p>

            <div>
              {report.skillConfidence?.map((item, idx) => {
                const isStrong = item.status === 'strong';
                const isWeak = item.status === 'weak';
                const badgeColor = isStrong ? 'var(--success)' : isWeak ? 'var(--seal)' : 'var(--warning)';
                return (
                  <div key={idx} className="finding-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}>{item.skill}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--ink-secondary)', fontFamily: 'var(--font-mono)' }}>
                          {item.score} / 5
                        </span>
                        <span style={{
                          color: badgeColor, border: `1px solid ${badgeColor}`,
                          padding: '0.15rem 0.6rem', borderRadius: 'var(--radius-sm)',
                          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--font-mono)',
                        }}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      "{item.evidence}"
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Strengths & Weaknesses */}
        {activeTab === 'strengths' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div className="paper" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--success)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                <Stamp size={17} /> Demonstrated Strengths
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {report.strengths?.map((str, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.92rem' }}>
                    <Check size={15} style={{ color: 'var(--success)', marginTop: '0.15rem', flexShrink: 0 }} />
                    <span style={{ color: 'var(--ink)' }}>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="paper" style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--seal)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                <AlertFlag size={17} /> Key Gaps & Weak Points
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                {report.weaknesses?.map((weak, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem', fontSize: '0.92rem' }}>
                    <AlertFlag size={15} style={{ color: 'var(--seal)', marginTop: '0.15rem', flexShrink: 0 }} />
                    <span style={{ color: 'var(--ink)' }}>{weak}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Roadmap */}
        {activeTab === 'roadmap' && (
          <div className="paper" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.15rem', color: 'var(--ink)', marginBottom: '0.4rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
              Actionable Roadmap
            </h3>
            <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Tailored preparation recommendations based on your technical session.
            </p>

            <div>
              {report.roadmap?.map((item, idx) => {
                const isHigh = item.priority === 'High';
                const pColor = isHigh ? 'var(--seal)' : 'var(--warning)';
                return (
                  <div key={idx} className="finding-row">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--ink)' }}>{item.title}</h4>
                      <span style={{
                        color: pColor, border: `1px solid ${pColor}`, padding: '0.15rem 0.6rem',
                        borderRadius: 'var(--radius-sm)', fontSize: '0.7rem', fontWeight: 700,
                        fontFamily: 'var(--font-mono)', textTransform: 'uppercase',
                      }}>
                        {item.priority} Priority
                      </span>
                    </div>
                    <p style={{ color: 'var(--ink-secondary)', fontSize: '0.9rem' }}>{item.description}</p>
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
