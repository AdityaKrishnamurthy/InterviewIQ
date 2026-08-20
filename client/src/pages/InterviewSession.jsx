import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSpeech from '../hooks/useSpeech';
import ThemeToggle from '../components/ThemeToggle';
import Logo from '../components/Logo';
import { Mic, Speaker, Cloud, Link as LinkIcon, Spinner, FileText, Briefcase } from '../components/Icon';
import { API_BASE_URL } from '../config/api';

const PERSONAS_LIST = [
  { id: 'Custom',  mark: 'C',  title: 'Custom Persona',  color: 'var(--primary)',     tag: 'JD & Resume Matched',       desc: 'Hyper-tailored to your uploaded Job Description and Resume, testing exact role competencies.' },
  { id: 'General', mark: 'GN', title: 'General Persona', color: 'var(--primary-ink)', tag: 'Full-Stack Technical',      desc: 'Balanced CS fundamentals, web development, and code reviews.' },
  { id: 'Startup', mark: 'S',  title: 'Startup Persona', color: 'var(--secondary)',   tag: 'Systems & Velocity',        desc: 'Architecture, project deep-dives, production trade-offs, and rapid delivery.' },
  { id: 'Google',  mark: 'G',  title: 'Google Persona',  color: 'var(--primary)',     tag: 'Algorithms & Big-O',       desc: 'LeetCode, DSA, algorithmic complexity, and edge case rigor.' },
  { id: 'Amazon',  mark: 'A',  title: 'Amazon Persona',  color: 'var(--warning)',     tag: 'Leadership & STAR',         desc: 'Behavioral questions, STAR method, customer obsession & system scalability.' },
];

const getDiff = (d) => ({
  easy:   { color: 'var(--success)', label: 'Easy'   },
  hard:   { color: 'var(--seal)',    label: 'Hard'   },
  medium: { color: 'var(--warning)', label: 'Medium' },
}[d] ?? { color: 'var(--warning)', label: 'Medium' });

const InterviewSession = () => {
  const [selectedPersona, setSelectedPersona] = useState('General');
  const [targetRole, setTargetRole]           = useState('Software Engineer');
  const [profileResume, setProfileResume]     = useState(null);
  const [profileJd, setProfileJd]             = useState(null);
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

  // Fetch active Resume and Job Description on mount
  useEffect(() => {
    if (!token) return;
    Promise.all([
      fetch(`${API_BASE_URL}/api/resume/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
      fetch(`${API_BASE_URL}/api/jd/latest`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    ]).then(([resumeData, jdData]) => {
      const activeResume = resumeData?.resume || null;
      const activeJd = jdData?.jd || null;

      setProfileResume(activeResume);
      setProfileJd(activeJd);

      if (activeJd) {
        if (activeJd.parsedData?.roleTitle) {
          setTargetRole(activeJd.parsedData.roleTitle);
        } else if (activeJd.title) {
          setTargetRole(activeJd.title);
        }
      }

      // If BOTH Resume and JD are uploaded, default to Custom Persona.
      // Otherwise, default to General Persona.
      if (activeResume && activeJd) {
        setSelectedPersona('Custom');
      } else {
        setSelectedPersona('General');
      }
    });
  }, [token]);

  const {
    speak, stopSpeaking, isSpeaking,
    startListening, stopListening,
    transcript, setTranscript,
    interimTranscript, speechDetected,
    resetTranscript, isListening, isTranscribing,
    error: speechError, setError: setSpeechError,
    isSttSupported, isTtsSupported,
    sttEngine,
  } = useSpeech(token);

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
      if (isTranscribing) return;
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
  }, [voiceMode, isListening, isSpeaking, isTranscribing, startListening, stopListening, stopSpeaking, resetTranscript]);

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

  /* ──────────────── RENDER ──────────────── */
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

      <header className="navbar">
        <Logo to="/dashboard" />
        <div className="nav-user">
          <button onClick={() => navigate('/resume')} className="btn btn-secondary">Upload Resume</button>
          <ThemeToggle />
          <button onClick={logout} className="btn btn-secondary">Sign Out</button>
        </div>
      </header>

      <main className="dashboard-container" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

        {error && <div className="alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

        {/* Speech errors — only surfaced when the mic is genuinely unusable.
            A native→server-fallback engine switch (e.g. on Brave) recovers
            silently and never sets one of these. */}
        {speechError && ['not-allowed', 'transcription-failed', 'unsupported'].includes(speechError) && (
          <div className="alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>
              {speechError === 'not-allowed' && 'Microphone access denied. Allow mic access in browser settings, then retry.'}
              {speechError === 'transcription-failed' && 'Voice transcription failed — check your connection, or switch to Text Mode.'}
              {speechError === 'unsupported' && 'Voice input isn’t available in this browser. Switch to Text Mode.'}
            </span>
            <button onClick={() => { setSpeechError(''); }} className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
              Dismiss
            </button>
          </div>
        )}

        {/* ── SETUP SCREEN ── */}
        {!session ? (
          <div>
            <div className="docket-heading">
              <h1 style={{ fontSize: '1.6rem' }}>Start Interview</h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', maxWidth: '65ch' }}>
              Select the persona for your interview. The interviewer adapts difficulty in real time
              from your answers.
            </p>

            {/* Active Context Banner */}
            <div className="paper" style={{ padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.86rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={16} style={{ color: profileResume ? 'var(--success)' : 'var(--ink-muted)' }} />
                  <span style={{ color: 'var(--ink-secondary)' }}>Resume:</span>
                  <strong style={{ color: profileResume ? 'var(--ink)' : 'var(--ink-muted)' }}>
                    {profileResume ? profileResume.filename : 'None (general questions)'}
                  </strong>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Briefcase size={16} style={{ color: profileJd ? 'var(--primary)' : 'var(--ink-muted)' }} />
                  <span style={{ color: 'var(--ink-secondary)' }}>Job Description:</span>
                  <strong style={{ color: profileJd ? 'var(--ink)' : 'var(--ink-muted)' }}>
                    {profileJd ? (profileJd.title || profileJd.parsedData?.roleTitle || 'Loaded') : 'None'}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                onClick={() => navigate('/resume')}
                className="btn btn-secondary"
                style={{ width: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}
              >
                Manage Profile &amp; JD ↗
              </button>
            </div>

            <div className="paper" style={{ padding: '1.75rem', marginBottom: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="targetRole">Target Role / Position</label>
                <input id="targetRole" type="text" className="form-input" value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="e.g. Senior Frontend Engineer" />
              </div>
            </div>

            <h3 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-sans)', fontWeight: 700 }}>
              Choose Persona
            </h3>

            <div className="persona-docket" style={{ marginBottom: '1.5rem' }}>
              {PERSONAS_LIST.map((p) => {
                const sel = selectedPersona === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPersona(p.id)}
                    className={`persona-file ${sel ? 'selected' : ''}`}
                  >
                    <span className="persona-file-mark" style={sel ? { color: p.color, borderColor: p.color } : undefined}>
                      {p.mark}
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span className="persona-file-name">{p.title}</span>
                        <span className="persona-file-tag">{p.tag}</span>
                      </span>
                      <span className="persona-file-desc">{p.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <button onClick={handleStartSession} className="btn btn-seal" disabled={starting}
              style={{ width: '100%', padding: '1rem' }}>
              {starting ? 'Starting…' : `Start ${selectedPersona} Interview →`}
            </button>
          </div>

        ) : (
        /* ── INTERVIEW SCREEN ── */
          <div className="interview-shell" style={{ flex: 1 }}>

            {/* Case caption */}
            <div className="case-caption">
              <div>
                <div className="case-caption-title">Live Interview</div>
                <div className="case-caption-name">{session.companyPersona} Persona — {session.targetRole}</div>
              </div>

              <div className="case-caption-controls">
                <button onClick={toggleVoiceMode}
                  className={`voice-toggle-btn ${voiceMode ? 'active' : ''}`}
                  disabled={!isSttSupported}
                  title={!isSttSupported ? 'Voice mode requires microphone access in a supported browser' : undefined}>
                  <Mic size={13} /> {voiceMode ? 'Voice' : 'Text'}
                </button>

                {voiceMode && (
                  <span className="voice-indicator">
                    {isSpeaking ? <><Speaker size={12} /> Speaking</> : isTranscribing ? <><Cloud size={12} /> Transcribing</> : isListening ? 'Recording' : 'Ready'}
                  </span>
                )}

                {voiceMode && sttEngine === 'fallback' && (
                  <span className="stt-engine-badge" title="Your browser blocks the built-in speech engine (common on Brave), so answers are transcribed on the server instead.">
                    <Cloud size={11} /> Server transcription
                  </span>
                )}

                {(() => { const d = getDiff(session.currentDifficulty); return (
                  <span className="difficulty-tag" style={{ color: d.color }}>{d.label}</span>
                ); })()}

                {typeof session.overallScore === 'number' && session.overallScore > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700,
                    color: session.overallScore >= 4 ? 'var(--success)' : 'var(--warning)' }}>
                    {session.overallScore} / 5.0
                  </span>
                )}

                <button className="btn btn-secondary" style={{ padding: '0.55rem 1rem', fontSize: '0.78rem' }}
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
                  End Interview →
                </button>
              </div>
            </div>

            {/* Feedback */}
            {lastFeedback && (
              <div className="finding-row" style={{
                display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.9rem',
              }}>
                <span className="ruling-tag" style={{
                  fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.95rem',
                  color: lastFeedback.score >= 4 ? 'var(--success)' : 'var(--warning)',
                  borderColor: lastFeedback.score >= 4 ? 'var(--success)' : 'var(--warning)',
                }}>
                  {lastFeedback.score}/5
                </span>
                <div style={{ color: 'var(--ink)', flex: 1 }}>{lastFeedback.feedback}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ink-secondary)' }}>
                  Difficulty → <strong>{lastFeedback.newDifficulty}</strong>
                </div>
              </div>
            )}

            {/* Transcript */}
            <div className="transcript">
              {session.messages.map((msg, idx) => {
                const isAI = msg.role === 'interviewer';
                return (
                  <div key={msg.id || idx} className="transcript-line">
                    <span className="transcript-line-no">{String(idx + 1).padStart(2, '0')}</span>
                    <div className="transcript-line-body">
                      <div className={`transcript-speaker ${!isAI ? 'candidate' : ''}`}>
                        {isAI ? `Interviewer · ${msg.difficulty || 'medium'}` : 'Candidate'}
                        {isAI && voiceMode && isSpeaking && idx === session.messages.length - 1 && (
                          <span className="voice-indicator" style={{ fontSize: '0.66rem' }}>
                            <Speaker size={10} /> Speaking
                            <button onClick={stopSpeaking} style={{
                              background: 'none', border: 'none', color: 'var(--seal)',
                              cursor: 'pointer', fontSize: '0.66rem', marginLeft: '0.35rem', padding: 0, textDecoration: 'underline',
                            }}>Stop</button>
                          </span>
                        )}
                      </div>
                      <div className={`transcript-text ${isAI ? 'interviewer' : 'candidate'}`}>
                        {msg.content}
                      </div>
                      {msg.recall && (
                        <div className="transcript-recall-link">
                          <LinkIcon size={11} /> Recalls earlier weak point
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {submitting && (
                <div className="transcript-line">
                  <span className="transcript-line-no" aria-hidden="true">···</span>
                  <div className="transcript-line-body" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'var(--ink-secondary)', fontSize: '0.9rem' }}>
                    <Spinner size={14} /> Evaluating and preparing next question…
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── INPUT AREA ── */}
            {voiceMode ? (
              <div className="voice-input-area">

                <div style={{ textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                  {submitting ? (
                    <span style={{ color: 'var(--ink-secondary)' }}>Submitting…</span>
                  ) : isTranscribing ? (
                    <span style={{ color: 'var(--primary)' }}>Transcribing your answer…</span>
                  ) : isListening ? (
                    speechDetected || sttEngine === 'fallback'
                      ? <span style={{ color: 'var(--success)' }}>Capturing speech — tap mic or press Space to stop</span>
                      : <span style={{ color: 'var(--seal)' }}>Listening… speak now</span>
                  ) : isSpeaking ? (
                    <span style={{ color: 'var(--primary)' }}>AI is speaking… tap mic to skip</span>
                  ) : (
                    <span style={{ color: 'var(--ink-secondary)' }}>Tap mic or press Space to record</span>
                  )}
                </div>

                <button type="button" onClick={handleMicClick} disabled={submitting || isTranscribing}
                  className={`mic-button ${isListening ? 'listening' : isSpeaking ? 'speaking' : isTranscribing ? 'transcribing' : ''}`}
                  aria-label={isListening ? 'Stop recording your answer' : 'Start recording your answer'}
                  title={isListening ? 'Stop recording' : 'Start recording'}>
                  {submitting || isTranscribing
                    ? <Spinner size={22} />
                    : isListening
                      ? <div className="waveform-bars" aria-hidden="true"><span/><span/><span/><span/><span/></div>
                      : <Mic size={26} />}
                </button>

                <div style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between',
                    fontSize: '0.76rem', color: 'var(--ink-secondary)', marginBottom: '0.3rem' }}>
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
                      setTranscript(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (answer.trim() && !submitting) {
                          handleSendAnswer(e, answer);
                        }
                      }
                    }}
                    placeholder={
                      isListening
                        ? 'Spoken words appear here in real time…'
                        : 'Tap the mic to speak, or type your answer here… (Enter to submit, Shift+Enter for newline)'
                    }
                    disabled={submitting}
                    style={{ resize: 'vertical' }}
                  />
                  {isListening && interimTranscript && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--secondary)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                      <em>{interimTranscript}</em>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', width: '100%' }}>
                  <button type="button" onClick={() => { resetTranscript(); setAnswer(''); }}
                    className="btn btn-secondary"
                    style={{ width: 'auto', padding: '0.6rem 1.25rem', fontSize: '0.85rem' }}>
                    Clear
                  </button>
                  <button type="button"
                    onClick={() => handleSendAnswer(null, answer)}
                    className="btn btn-seal"
                    disabled={!answer.trim() || submitting}
                    style={{ width: 'auto', padding: '0.6rem 1.75rem', fontSize: '0.85rem' }}>
                    {submitting ? 'Analysing…' : 'Submit Answer →'}
                  </button>
                </div>

                <div style={{ fontSize: '0.7rem', color: 'var(--ink-muted)' }}>
                  Press{' '}
                  <kbd style={{ padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>
                    Space
                  </kbd>{' '}
                  to toggle recording when not typing ·{' '}
                  <kbd style={{ padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>
                    Enter
                  </kbd>{' '}
                  to submit
                </div>
              </div>

            ) : (
              /* TEXT MODE */
              <form onSubmit={handleSendAnswer} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <textarea
                    ref={textareaRef}
                    className="form-input"
                    rows={3}
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (answer.trim() && !submitting) {
                          handleSendAnswer(e, answer);
                        }
                      }
                    }}
                    placeholder="Type your technical response here… (Press Enter to submit, Shift+Enter for new line)"
                    disabled={submitting}
                    style={{ flex: 1, resize: 'vertical' }}
                  />
                  <button type="submit" className="btn btn-seal"
                    disabled={submitting || !answer.trim()}
                    style={{ width: 'auto', padding: '0 2rem', height: 'auto', alignSelf: 'stretch' }}>
                    {submitting ? 'Analysing…' : 'Submit Answer →'}
                  </button>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--ink-muted)', textAlign: 'right' }}>
                  Press <kbd style={{ padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>Enter</kbd> to submit · <kbd style={{ padding: '0.1rem 0.35rem', borderRadius: 'var(--radius-sm)', background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', fontFamily: 'var(--font-mono)' }}>Shift + Enter</kbd> for new line
                </div>
              </form>
            )}

          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewSession;
