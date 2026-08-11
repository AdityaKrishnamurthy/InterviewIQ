import { useState, useEffect, useRef, useCallback } from 'react';

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechDetected, setSpeechDetected] = useState(false);
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const isMountedRef = useRef(true);
  const isListeningRef = useRef(false);
  const speakSafetyTimerRef = useRef(null);
  const utteranceRef = useRef(null);

  const isSttSupported = typeof window !== 'undefined' && !!SpeechRecognitionAPI;
  const isTtsSupported = typeof window !== 'undefined' && !!window.speechSynthesis;
  const isSupported = isSttSupported && isTtsSupported;

  /* ── helpers ── */
  const setListening = (val) => {
    isListeningRef.current = val;
    if (isMountedRef.current) setIsListening(val);
  };

  /* ── TTS ── */
  const getVoice = useCallback(() => {
    if (!isTtsSupported) return null;
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const en = voices.filter((v) => v.lang.startsWith('en'));
    return en.find((v) => v.name.includes('Google') || v.name.includes('Microsoft')) ?? en[0] ?? voices[0] ?? null;
  }, [isTtsSupported]);

  const speak = useCallback(
    (text) => {
      if (!isTtsSupported || !text) return;
      if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      utter.pitch = 1.0;
      const voice = getVoice();
      if (voice) utter.voice = voice;

      // Chrome silently kills utterances mid-speech if nothing outside the
      // engine's internal queue keeps a reference (GC-related bug); holding
      // one here keeps it alive until onend/onerror fires.
      utteranceRef.current = utter;

      utter.onstart = () => { if (isMountedRef.current) setIsSpeaking(true); };
      utter.onend = () => {
        if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
        utteranceRef.current = null;
        if (isMountedRef.current) setIsSpeaking(false);
      };
      utter.onerror = (e) => {
        if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
        utteranceRef.current = null;
        if (e.error !== 'canceled' && isMountedRef.current) setIsSpeaking(false);
      };

      // Some browsers leave the engine in a "paused" state after a tab
      // becomes inactive; resume() is a no-op otherwise.
      window.speechSynthesis.resume();
      window.speechSynthesis.speak(utter);
      // safety: reset isSpeaking after 20s max
      speakSafetyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setIsSpeaking(false);
      }, 20000);
    },
    [isTtsSupported, getVoice]
  );

  const stopSpeaking = useCallback(() => {
    if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
    utteranceRef.current = null;
    if (isTtsSupported) window.speechSynthesis?.cancel();
    if (isMountedRef.current) setIsSpeaking(false);
  }, [isTtsSupported]);

  /* ── STT: initialise ── */
  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    // StrictMode double-invokes effects on mount (setup → cleanup → setup);
    // the cleanup below sets this false, so it must be restored on (re)setup
    // or every gated state update stays dead for the rest of the session.
    isMountedRef.current = true;

    const rec = new SpeechRecognitionAPI();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let interim = '';
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          final += (final && !final.endsWith(' ') ? ' ' : '') + res[0].transcript.trim() + ' ';
          finalTranscriptRef.current = final;
        } else {
          interim += res[0].transcript;
        }
      }

      const full = (final + interim).trim();
      if (isMountedRef.current) {
        setTranscript(full);
        setInterimTranscript(interim);
        if (full.length > 0) setSpeechDetected(true);
      }
    };

    rec.onerror = (event) => {
      if (!isMountedRef.current) return;
      if (event.error === 'aborted') return;
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setError('not-allowed');
        setListening(false);
      } else if (event.error === 'no-speech') {
        // If listening mode is active, attempt to keep listening
        if (isListeningRef.current) {
          try { rec.start(); } catch {}
        }
      } else if (event.error === 'network') {
        setError('network');
        setListening(false);
      }
    };

    rec.onend = () => {
      if (!isMountedRef.current) return;
      // Auto-restart continuous listening if user hasn't explicitly stopped
      if (isListeningRef.current) {
        try {
          rec.start();
        } catch {
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    recognitionRef.current = rec;

    return () => {
      isMountedRef.current = false;
      if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
      try { rec.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
    };
  }, []);

  /* ── STT: start ── */
  const startListening = useCallback(async () => {
    if (!isSttSupported || !recognitionRef.current) {
      setError('unsupported');
      return;
    }

    if (isListeningRef.current) return;

    // Check mic permission explicitly if available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (isMountedRef.current) setError('not-allowed');
        return;
      }
    }

    finalTranscriptRef.current = '';
    if (isMountedRef.current) {
      setTranscript('');
      setInterimTranscript('');
      setSpeechDetected(false);
      setError('');
    }

    try {
      recognitionRef.current.start();
      setListening(true);
    } catch (e) {
      // If already started or transitioning, ensure listening state is true
      if (e.name === 'InvalidStateError') {
        setListening(true);
      } else {
        console.warn('startListening error:', e.message);
      }
    }
  }, [isSttSupported]);

  /* ── STT: stop ── */
  const stopListening = useCallback(() => {
    setListening(false);
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch {}
  }, []);

  /* ── STT: reset ── */
  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = '';
    if (isMountedRef.current) {
      setTranscript('');
      setInterimTranscript('');
      setSpeechDetected(false);
      setError('');
    }
  }, []);

  /* ── STT: sync manual edits ── */
  const updateTranscript = useCallback((newText) => {
    finalTranscriptRef.current = newText;
    if (isMountedRef.current) {
      setTranscript(newText);
      setInterimTranscript('');
      if (newText.trim().length > 0) setSpeechDetected(true);
    }
  }, []);

  return {
    speak, stopSpeaking, isSpeaking,
    startListening, stopListening,
    transcript, setTranscript: updateTranscript,
    interimTranscript, speechDetected,
    resetTranscript, isListening,
    error, setError, isSupported, isSttSupported, isTtsSupported,
  };
};

export default useSpeech;
