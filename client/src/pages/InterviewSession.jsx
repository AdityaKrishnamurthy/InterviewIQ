import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSpeech from '../hooks/useSpeech';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { API_BASE_URL } from '../config/api';

const PERSONAS_LIST = [
  { id: 'Google',  title: 'Google Persona',  icon: '🔍', color: '#4285F4', tag: 'Algorithms & Big-O', desc: 'LeetCode, DSA, algorithmic complexity, and edge case rigor.' },
  { id: 'Amazon',  title: 'Amazon Persona',  icon: '📦', color: '#FF9900', tag: 'Leadership & STAR',    desc: 'Behavioral questions, STAR method, customer obsession & system scalability.' },
  { id: 'Startup', title: 'Startup Persona', icon: '🚀', color: '#00D4AA', tag: 'Systems & Velocity',   desc: 'Architecture, project deep-dives, production trade-offs, and rapid delivery.' },
  { id: 'General', title: 'General Persona', icon: '💻', color: '#6C63FF', tag: 'Full-Stack Technical', desc: 'Balanced CS fundamentals, web development, and code reviews.' },
];

const InterviewSession = () => {
  const [selectedPersona, setSelectedPersona] = useState('Google');
  const [targetRole, setTargetRole]           = useState('Software Engineer');
  const [session, setSession]                 = useState(null);
  const [answer, setAnswer]                   = useState('');
  const [starting, setStarting]               = useState(false);
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState('');
  const [lastFeedback, setLastFeedback]       = useState(null);
  const [voiceMode, setVoiceMode]             = useState(false);

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef   = useRef(null);
  const prevMsgCountRef  = useRef(0);
  const textareaRef      = useRef(null);

  const {
    speak, stopSpeaking, isSpeaking,
    startListening, stopListening,
    transcript, setTranscript,
    interimTranscript, speechDetected,
    resetTranscript, isListening,
    error: speechError, setError: setSpeechError,
    isSttSupported, isTtsSupported,
  } = useSpeech();

  /* ── scroll ── */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  /* ── mirror STT transcript → answer textarea (voice mode only) ── */
  useEffect(() => {
    if (voiceMode && transcript) {
      setAnswer(transcript);
    }
  }, [transcript, voiceMode]);

  /* ── auto-read new AI question via TTS ── */
  useEffect(() => {
    if (!voiceMode || !session?.messages || !isTtsSupported) return;
    const count = session.messages.length;
    if (count > prevMsgCountRef.current) {
      const last = session.messages[count - 1];
      if (last.role === 'interviewer') speak(last.content);
    }
    prevMsgCountRef.current = count;
  }, [session?.messages, voiceMode, speak, isTtsSupported]);

  /* ── Space bar toggle (not in textarea / input) ── */
  useEffect(() => {
    if (!voiceMode) return;
    const onKey = async (e) => {
      if (e.code !== 'Space') return;
      if (['TEXTAREA', 'INPUT'].includes(e.target.tagName)) return;
      e.preventDefault();
      if (isListening) {
        stopListening();
      } else {
        if (isSpeaking) stopSpeaking();
        resetTranscript();
        setAnswer('');
        await startListening();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [voiceMode, isListening, isSpeaking, startListening, stopListening, stopSpeaking, resetTranscript]);

  /* ── handlers ── */
  const handleStartSession = async () => {
    setError('');
    setStarting(true);
    try {
      const res  = await fetch(`${API_BASE_URL}/api/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ companyPersona: selectedPersona, targetRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to start session');
      prevMsgCountRef.current = 0;
      setSession(data.session);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const handleSendAnswer = useCallback(async (e, override) => {
    if (e) e.preventDefault();
    const text = (override ?? answer ?? transcript).trim();
    if (!text || submitting || !session) return;

    setError('');
    setAnswer('');
    resetTranscript();
    setSubmitting(true);
    if (voiceMode) stopListening();

    try {
      const res  = await fetch(`${API_BASE_URL}/api/session/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId: session._id, answer: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit answer');
      setSession(data.session);
      if (data.evaluation) setLastFeedback(data.evaluation);
    } catch (err) {
      setError(err.message);
      setAnswer(text); // restore on error
    } finally {
      setSubmitting(false);
    }
  }, [answer, transcript, submitting, session, voiceMode, token, resetTranscript, stopListening]);

  const toggleVoiceMode = () => {
    const next = !voiceMode;
    if (!next) {
      stopListening();
      stopSpeaking();
      resetTranscript();
      setAnswer('');
    }
    setVoiceMode(next);
  };

  const handleMicClick = async () => {
    if (isListening) {
      stopListening();
    } else {
      if (isSpeaking) stopSpeaking();
      resetTranscript();
      setAnswer('');
      await startListening();
    }
  };

  const getDiff = (d) => ({
    easy:   { bg: 'rgba(0,212,170,.15)',  color: 'var(--success)', border: 'var(--success)', label: 'Easy'   },
    hard:   { bg: 'rgba(255,107,107,.15)', color: 'var(--error)',  border: 'var(--error)',  label: 'Hard'   },
    medium: { bg: 'rgba(255,179,71,.15)',  color: 'var(--warning)', border: 'var(--warning)', label: 'Medium' },
  }[d] ?? { bg: 'rgba(255,179,71,.15)', color: 'var(--warning)', border: 'var(--warning)', label: 'Medium' });

  /* ──────────────── RENDER ──────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      {/* Navbar */}
      <header className="navbar">
        <Logo to="/dashboard" />
        <div className="nav-user">
          <button onClick={() => navigate('/resume')} className="btn btn-secondary">Resume Specs</button>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-secondary">Sign Out</button>
        </div>
      </header>

      <main className="dashboard-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Global errors */}
        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Speech permission error */}
        {speechError === 'not-allowed' && (
          <div className="alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>🎤 Microphone access denied. Allow mic access in browser settings, then retry.</span>
            <button onClick={() => { setSpeechError(''); }} className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              Dismiss
            </button>
          </div>
        )}

        {/* ── SETUP SCREEN ── */}
        {!session ? (
          <div>
            <div style={{ marginBottom: '2rem' }}>
              <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Adaptive Technical Interview Session
              </h1>
              <p style={{ color: 'var(--text-secondary)' }}>
                Select a company persona. The AI will analyse your answers and adapt difficulty in real time.
              </p>
            </div>

            <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label">Target Role / Position</label>
                <input type="text" className="form-input" value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer" />
              </div>

              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                Select Company Persona
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
                {PERSONAS_LIST.map((p) => {
                  const sel = selectedPersona === p.id;
                  return (
                    <div key={p.id} onClick={() => setSelectedPersona(p.id)} style={{
                      padding: '1.25rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                      background: sel ? `rgba(108,99,255,.12)` : 'var(--bg-main)',
                      border: sel ? `2px solid ${p.color}` : '1px solid var(--border-color)',
                      boxShadow: sel ? `0 0 16px rgba(108, 99, 255, 0.2)` : 'none',
                      transition: 'all .2s ease',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.2rem' }}>{p.icon}</span>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>{p.title}</h4>
                        </div>
                        <span style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '12px',
                          background: sel ? p.color : 'var(--bg-surface)',
                          color: sel ? '#FFF' : 'var(--text-secondary)', fontWeight: 600 }}>{p.tag}</span>
                      </div>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5 }}>{p.desc}</p>
                    </div>
                  );
                })}
              </div>

              <button onClick={handleStartSession} className="btn btn-primary" disabled={starting}
                style={{ width: '100%', padding: '1rem' }}>
                {starting ? 'Initializing Interview Agent...' : `Start ${selectedPersona} Interview →`}
              </button>
            </div>
          </div>

        ) : (
        /* ── INTERVIEW SCREEN ── */
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '1rem' }}>

            {/* Status bar */}
            <div className="auth-card" style={{
              maxWidth: '100%', padding: '1rem 1.5rem',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: '1rem',
            }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Interview Persona</span>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {session.companyPersona} Agent — {session.targetRole}
                </h3>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {/* Voice toggle */}
                <button onClick={toggleVoiceMode}
                  className={`voice-toggle-btn ${voiceMode ? 'active' : ''}`}
                  disabled={!isSttSupported}
                  title={!isSttSupported ? 'Voice mode requires Chrome, Edge, or Safari' : undefined}>
                  {voiceMode ? '🎤 Voice Mode' : '⌨️ Text Mode'}
                </button>

                {voiceMode && (
                  <span className="voice-indicator">
                    {isSpeaking ? '🔊 AI Speaking...' : isListening ? '🎙️ Recording...' : '🎤 Ready'}
                  </span>
                )}

                {/* Difficulty */}
                {(() => { const d = getDiff(session.currentDifficulty); return (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Difficulty</span>
                    <span style={{ display: 'inline-block', background: d.bg, color: d.color,
                      border: `1px solid ${d.border}`, padding: '0.2rem 0.75rem',
                      borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700 }}>
                      ⚡ {d.label.toUpperCase()}
                    </span>
                  </div>
                ); })()}

                {/* Score */}
                {typeof session.overallScore === 'number' && session.overallScore > 0 && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block' }}>Score</span>
                    <span style={{ fontSize: '1rem', fontWeight: 700,
                      color: session.overallScore >= 4 ? 'var(--success)' : 'var(--warning)' }}>
                      {session.overallScore} / 5.0
                    </span>
                  </div>
                )}

                {/* End */}
                <button className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  onClick={async () => {
                    try {
                      setSubmitting(true);
                      stopListening(); stopSpeaking();
                      await fetch(`${API_BASE_URL}/api/session/${session._id}/complete`, {
                        method: 'POST', headers: { Authorization: `Bearer ${token}` },
                      });
                      navigate(`/report/${session._id}`);
                    } catch { setError('Error completing session'); }
                    finally { setSubmitting(false); }
                  }}>
                  End & View Report →
                </button>
              </div>
            </div>

            {/* Feedback banner */}
            {lastFeedback && (
              <div style={{
                background: lastFeedback.score >= 4 ? 'rgba(0,212,170,.1)' : 'rgba(255,179,71,.1)',
                border: `1px solid ${lastFeedback.score >= 4 ? 'var(--success)' : 'var(--warning)'}`,
                borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem',
                display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem',
              }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem',
                  color: lastFeedback.score >= 4 ? 'var(--success)' : 'var(--warning)' }}>
                  Score: {lastFeedback.score}/5
                </div>
                <div style={{ color: 'var(--text-primary)', flex: 1 }}>{lastFeedback.feedback}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Difficulty → <strong>{lastFeedback.newDifficulty}</strong>
                </div>
              </div>
            )}

            {/* Conversation */}
            <div style={{
              flex: 1, minHeight: '340px', maxHeight: '480px', overflowY: 'auto',
              background: 'var(--bg-surface)', border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-lg)', padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '1.25rem',
            }}>
              {session.messages.map((msg, idx) => {
                const isAI = msg.role === 'interviewer';
                return (
                  <div key={msg.id || idx} style={{ display: 'flex', flexDirection: 'column',
                    alignItems: isAI ? 'flex-start' : 'flex-end' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem',
                      display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span>{isAI ? `🤖 AI Interviewer (${msg.difficulty || 'medium'})` : '👤 You'}</span>
                      {isAI && voiceMode && isSpeaking && idx === session.messages.length - 1 && (
                        <span className="voice-indicator" style={{ fontSize: '0.7rem' }}>
                          🔊 Speaking...
                          <button onClick={stopSpeaking} style={{
                            background: 'none', border: 'none', color: 'var(--error)',
                            cursor: 'pointer', fontSize: '0.7rem', marginLeft: '0.35rem', padding: 0,
                          }}>🔇 Stop</button>
                        </span>
                      )}
                    </div>
                    <div style={{
                      maxWidth: '85%', padding: '1rem 1.25rem', borderRadius: 'var(--radius-md)',
                      background: isAI ? 'var(--bg-main)' : 'rgba(108,99,255,.15)',
                      border: isAI ? '1px solid var(--border-color)' : '1px solid var(--primary)',
                      color: 'var(--text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    }}>{msg.content}</div>
                  </div>
                );
              })}
              {submitting && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                  color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  ⏳ Evaluating and generating next question...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── INPUT AREA ── */}
            {voiceMode ? (
              /* VOICE MODE */
              <div className="voice-input-area">

                {/* Status label */}
                <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 600 }}>
                  {submitting ? (
                    <span style={{ color: 'var(--text-secondary)' }}>Submitting…</span>
                  ) : isListening ? (
                    speechDetected
                      ? <span style={{ color: 'var(--success)' }}>🎙️ Capturing speech — tap mic or press Space to stop</span>
                      : <span style={{ color: 'var(--error)' }}>🎙️ Listening… speak now</span>
                  ) : isSpeaking ? (
                    <span style={{ color: 'var(--primary)' }}>🔊 AI is speaking… tap mic to skip</span>
                  ) : (
                    <span style={{ color: 'var(--text-secondary)' }}>Tap mic or press Space to record</span>
                  )}
                </div>

                {/* Mic button */}
                <button type="button" onClick={handleMicClick} disabled={submitting}
                  className={`mic-button ${isListening ? 'listening' : isSpeaking ? 'speaking' : ''}`}>
                  {submitting
                    ? <span style={{ fontSize: '1.5rem' }}>⏳</span>
                    : isListening
                      ? <div className="waveform-bars"><span/><span/><span/><span/><span/></div>
                      : <span style={{ fontSize: '1.8rem' }}>🎤</span>}
                </button>

                {/* Editable textarea — shows spoken text; user can also type */}
                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: '0.3rem' }}>
                    <span>Your answer (edit freely or just speak):</span>
                    {answer.trim() && (
                      <span>{answer.trim().split(/\s+/).length} words</span>
                    )}
                  </div>
                  <textarea
                    ref={textareaRef}
                    className="form-input"
                    rows={4}
                    value={answer}
                    onChange={(e) => {
                      setAnswer(e.target.value);
                      // keep transcript in sync so submit uses latest text
                      setTranscript(e.target.value);
                    }}
                    placeholder={
                      isListening
                        ? 'Spoken words appear here in real time…'
                        : 'Tap the mic to speak, or type your answer here…'
                    }
                    disabled={submitting}
                    style={{ resize: 'vertical' }}
                  />
                  {isListening && interimTranscript && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--secondary)', marginTop: '0.25rem' }}>
                      ⚡ <em>{interimTranscript}</em>
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
                  <button type="button" onClick={() => { resetTranscript(); setAnswer(''); }}
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                    🔄 Clear
                  </button>
                  <button type="button"
                    onClick={() => handleSendAnswer(null, answer)}
                    className="btn btn-primary"
                    disabled={!answer.trim() || submitting}
                    style={{ width: 'auto', padding: '0.6rem 1.75rem', fontSize: '0.85rem' }}>
                    {submitting ? 'Analysing…' : 'Submit Answer →'}
                  </button>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Press{' '}
                  <kbd style={{ padding: '0.1rem 0.4rem', borderRadius: '3px',
                    background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                    Space
                  </kbd>{' '}
                  to toggle recording when not typing
                </div>
              </div>

            ) : (
              /* TEXT MODE */
              <form onSubmit={handleSendAnswer} style={{ display: 'flex', gap: '0.75rem' }}>
                <textarea
                  ref={textareaRef}
                  className="form-input"
                  rows={3}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your technical response here…"
                  disabled={submitting}
                  style={{ flex: 1, resize: 'vertical' }}
                />
                <button type="submit" className="btn btn-primary"
                  disabled={submitting || !answer.trim()}
                  style={{ width: 'auto', padding: '0 2rem', height: 'auto', alignSelf: 'stretch' }}>
                  {submitting ? 'Analysing…' : 'Submit Answer →'}
                </button>
              </form>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewSession;
