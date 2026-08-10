import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useSpeech from '../hooks/useSpeech';

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
  const [voiceMode, setVoiceMode] = useState(false);
  const [voiceState, setVoiceState] = useState('idle'); // idle | listening | processing
  const [autoSubmitCountdown, setAutoSubmitCountdown] = useState(null);

  const { token, logout } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const textareaRef = useRef(null);
  const autoSubmitTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const {
    speak, stopSpeaking, isSpeaking,
    startListening, stopListening, transcript, interimTranscript, speechDetected, resetTranscript,
    isListening, error: speechError, setError: setSpeechError,
    isSupported,
  } = useSpeech();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session?.messages]);

  // Voice mode: auto-read new AI questions
  useEffect(() => {
    if (!voiceMode || !session?.messages) return;

    const currentCount = session.messages.length;
    if (currentCount > prevMessageCountRef.current) {
      const lastMsg = session.messages[currentCount - 1];
      if (lastMsg.role === 'interviewer') {
        speak(lastMsg.content);
      }
    }
    prevMessageCountRef.current = currentCount;
  }, [session?.messages, voiceMode, speak]);

  // Auto-start listening when TTS finishes (voice mode)
  useEffect(() => {
    if (voiceMode && !isSpeaking && session && !submitting && voiceState !== 'processing' && !isListening) {
      const timer = setTimeout(() => {
        if (voiceMode && !isSpeaking && !submitting && !isListening) {
          resetTranscript();
          startListening();
          setVoiceState('listening');
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isSpeaking, voiceMode, session, submitting, voiceState, isListening, resetTranscript, startListening]);

  // Sync isListening state
  useEffect(() => {
    if (isListening && voiceMode) {
      setVoiceState('listening');
    } else if (!isListening && voiceMode && voiceState === 'listening') {
      setVoiceState('idle');
    }
  }, [isListening, voiceMode, voiceState]);

  // Clear auto-submit timers
  const clearAutoSubmit = useCallback(() => {
    if (autoSubmitTimerRef.current) {
      clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setAutoSubmitCountdown(null);
  }, []);

  // Keyboard shortcut: Space to toggle listening
  useEffect(() => {
    if (!voiceMode) return;

    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        if (isListening) {
          clearAutoSubmit();
          stopListening();
          setVoiceState('idle');
        } else {
          clearAutoSubmit();
          resetTranscript();
          startListening();
          setVoiceState('listening');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceMode, isListening, startListening, stopListening, resetTranscript, clearAutoSubmit]);

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

      prevMessageCountRef.current = 0;
      setSession(data.session);
    } catch (err) {
      setError(err.message || 'Error starting session. Please try again.');
    } finally {
      setStarting(false);
    }
  };

  const handleSendAnswer = useCallback(async (e, voiceAnswer) => {
    if (e) e.preventDefault();
    clearAutoSubmit();
    const answerText = voiceAnswer || answer;
    if (!answerText.trim() || submitting || !session) return;

    setError('');
    const currentAnswer = answerText;
    setAnswer('');
    setSubmitting(true);
    if (voiceMode) setVoiceState('processing');

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
      if (voiceMode) {
        resetTranscript();
        setVoiceState('idle');
      }
    } catch (err) {
      setError(err.message || 'Error submitting answer');
      if (!voiceAnswer) setAnswer(currentAnswer);
      if (voiceMode) setVoiceState('idle');
    } finally {
      setSubmitting(false);
    }
  }, [answer, submitting, session, voiceMode, token, resetTranscript, clearAutoSubmit]);

  const handleVoiceDone = useCallback(() => {
    clearAutoSubmit();
    stopListening();
    setVoiceState('processing');
    const finalAnswer = transcript.trim();
    if (finalAnswer) {
      handleSendAnswer(null, finalAnswer);
    } else {
      setVoiceState('idle');
    }
  }, [stopListening, transcript, handleSendAnswer, clearAutoSubmit]);

  // Auto-pause detection: when user stops speaking for 3.5s after speech is detected
  useEffect(() => {
    if (!voiceMode || !isListening || !speechDetected || !transcript.trim()) {
      clearAutoSubmit();
      return;
    }

    // Reset countdown on new speech input
    clearAutoSubmit();

    // Set a 3-second auto-submit timer after last speech input
    let count = 3;
    setAutoSubmitCountdown(count);

    countdownIntervalRef.current = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setAutoSubmitCountdown(count);
      } else {
        clearInterval(countdownIntervalRef.current);
        countdownIntervalRef.current = null;
        setAutoSubmitCountdown(null);
        handleVoiceDone();
      }
    }, 1000);

    return () => {
      clearAutoSubmit();
    };
  }, [transcript, interimTranscript, voiceMode, isListening, speechDetected, handleVoiceDone, clearAutoSubmit]);

  const handleVoiceReset = useCallback(() => {
    clearAutoSubmit();
    stopListening();
    resetTranscript();
    setVoiceState('idle');
  }, [stopListening, resetTranscript, clearAutoSubmit]);

  const toggleVoiceMode = () => {
    if (!isSupported) return;
    const newMode = !voiceMode;
    setVoiceMode(newMode);
    clearAutoSubmit();
    if (!newMode) {
      stopListening();
      stopSpeaking();
      setVoiceState('idle');
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

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).length : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Header Navbar */}
      <header className="navbar">
        <Link to="/dashboard" className="auth-brand" style={{ marginBottom: 0 }}>
          Interview<span>IQ</span>
        </Link>
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

        {/* Speech error alerts */}
        {speechError === 'not-allowed' && (
          <div className="alert-error" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>🎤 Microphone access denied. Please allow microphone access in your browser settings.</span>
            <button
              onClick={() => { setSpeechError(''); startListening(); }}
              className="btn btn-secondary"
              style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              Retry
            </button>
          </div>
        )}
        {speechError === 'no-speech-timeout' && (
          <div className="alert-error" style={{ marginBottom: '1rem' }}>
            🔇 No speech detected. Tap the mic to start speaking your answer.
          </div>
        )}

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
                {/* Voice Mode Toggle */}
                <button
                  onClick={toggleVoiceMode}
                  className={`voice-toggle-btn ${voiceMode ? 'active' : ''}`}
                  disabled={!isSupported}
                  title={!isSupported ? 'Voice mode requires Chrome, Edge, or Safari' : (voiceMode ? 'Switch to Text Mode' : 'Switch to Voice Mode')}
                >
                  {voiceMode ? '🎤 Voice' : '⌨️ Text'}
                </button>

                {voiceMode && (
                  <span className="voice-indicator">
                    {isSpeaking ? '🔊 Speaking...' : isListening ? '🎙️ Recording...' : '🎤 Voice Active'}
                  </span>
                )}

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
                      if (voiceMode) {
                        clearAutoSubmit();
                        stopListening();
                        stopSpeaking();
                      }
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
                        alignItems: 'center',
                      }}
                    >
                      <span>{isInterviewer ? `🤖 AI Interviewer (${msg.difficulty || 'medium'})` : '👤 Candidate'}</span>
                      {isInterviewer && voiceMode && isSpeaking && idx === session.messages.length - 1 && (
                        <span className="voice-indicator" style={{ fontSize: '0.7rem' }}>
                          🔊 Speaking...
                          <button
                            onClick={stopSpeaking}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--error)',
                              cursor: 'pointer',
                              fontSize: '0.7rem',
                              marginLeft: '0.35rem',
                              padding: 0,
                            }}
                          >
                            🔇 Stop
                          </button>
                        </span>
                      )}
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
            {voiceMode ? (
              /* Voice Mode Input */
              <div className="voice-input-area">
                {/* Mic Button */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                  <button
                    className={`mic-button ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
                    onClick={() => {
                      if (isListening) {
                        handleVoiceDone();
                      } else {
                        setSpeechError('');
                        clearAutoSubmit();
                        resetTranscript();
                        startListening();
                        setVoiceState('listening');
                      }
                    }}
                    disabled={submitting || isSpeaking}
                  >
                    {voiceState === 'processing' ? (
                      <span style={{ fontSize: '1.5rem' }}>⏳</span>
                    ) : isListening ? (
                      <div className="waveform-bars">
                        <span /><span /><span /><span /><span />
                      </div>
                    ) : (
                      <span style={{ fontSize: '1.8rem' }}>🎤</span>
                    )}
                  </button>

                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                    {voiceState === 'processing' ? (
                      'Submitting answer...'
                    ) : isListening ? (
                      speechDetected ? (
                        <span style={{ color: 'var(--success)', fontWeight: 600 }}>🎙️ Capturing your voice live...</span>
                      ) : (
                        <span style={{ color: 'var(--error)' }}>Listening... start speaking</span>
                      )
                    ) : isSpeaking ? (
                      <span style={{ color: 'var(--primary)' }}>AI is speaking...</span>
                    ) : (
                      'Tap mic or press Space to record your answer'
                    )}
                  </div>

                  {/* Auto-submit countdown alert when user stops speaking */}
                  {autoSubmitCountdown !== null && (
                    <div style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--warning)',
                      background: 'rgba(255, 179, 71, 0.15)',
                      border: '1px solid var(--warning)',
                      padding: '0.35rem 1rem',
                      borderRadius: '20px',
                    }}>
                      ⏱️ Silence detected — auto-submitting in {autoSubmitCountdown}s...
                    </div>
                  )}

                  {/* Keyboard shortcut hint */}
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    Press <kbd style={{ padding: '0.1rem 0.4rem', borderRadius: '3px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>Space</kbd> or click <strong>Done</strong> when finished
                  </div>
                </div>

                {/* Live Transcript Preview */}
                <div className="voice-transcript-preview">
                  {transcript ? (
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem', fontSize: '0.75rem', color: 'var(--secondary)' }}>
                        <span>💬 Live Transcript Captured</span>
                        <span>{wordCount} words ({transcript.length} chars)</span>
                      </div>
                      <div style={{ color: 'var(--text-primary)', fontStyle: 'normal' }}>
                        {transcript}
                        {interimTranscript && (
                          <span style={{ color: 'var(--text-secondary)', opacity: 0.7 }}> {interimTranscript}</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      {isListening ? 'Speak into your microphone...' : 'Recorded text will appear here in real time.'}
                    </span>
                  )}
                </div>

                {/* Long answer warning */}
                {transcript.length > 2000 && (
                  <div style={{ color: 'var(--warning)', fontSize: '0.8rem', textAlign: 'center' }}>
                    ⚠️ Answer is getting long — consider wrapping up.
                  </div>
                )}

                {/* Voice action buttons */}
                {(isListening || transcript) && (
                  <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                      onClick={handleVoiceReset}
                      className="btn btn-secondary"
                      style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                    >
                      🔄 Reset / Re-record
                    </button>
                    <button
                      onClick={handleVoiceDone}
                      className="btn btn-primary"
                      disabled={!transcript.trim() || submitting}
                      style={{ width: 'auto', padding: '0.5rem 1.25rem', fontSize: '0.85rem' }}
                    >
                      ✓ Submit Answer →
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Text Mode Input */
              <form onSubmit={handleSendAnswer} style={{ display: 'flex', gap: '0.75rem' }}>
                <textarea
                  ref={textareaRef}
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
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewSession;
