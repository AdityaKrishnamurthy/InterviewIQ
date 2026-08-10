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

  const isSupported =
    typeof window !== 'undefined' &&
    !!SpeechRecognitionAPI &&
    !!window.speechSynthesis;

  /* ── helpers ── */
  const setListening = (val) => {
    isListeningRef.current = val;
    if (isMountedRef.current) setIsListening(val);
  };

  /* ── TTS ── */
  const getVoice = useCallback(() => {
    const voices = window.speechSynthesis?.getVoices() ?? [];
    const en = voices.filter((v) => v.lang.startsWith('en'));
    return en.find((v) => v.name.includes('Google') || v.name.includes('Microsoft')) ?? en[0] ?? voices[0] ?? null;
  }, []);

  const speak = useCallback(
    (text) => {
      if (!isSupported || !text) return;
      if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
      window.speechSynthesis.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.rate = 0.95;
      const voice = getVoice();
      if (voice) utter.voice = voice;

      utter.onstart = () => { if (isMountedRef.current) setIsSpeaking(true); };
      utter.onend = () => {
        if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
        if (isMountedRef.current) setIsSpeaking(false);
      };
      utter.onerror = (e) => {
        if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
        if (e.error !== 'canceled' && isMountedRef.current) setIsSpeaking(false);
      };

      window.speechSynthesis.speak(utter);
      // safety: reset isSpeaking after 20s max
      speakSafetyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setIsSpeaking(false);
      }, 20000);
    },
    [isSupported, getVoice]
  );

  const stopSpeaking = useCallback(() => {
    if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
    window.speechSynthesis?.cancel();
    if (isMountedRef.current) setIsSpeaking(false);
  }, []);

  /* ── STT: initialise once ── */
  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const rec = new SpeechRecognitionAPI();
    // NON-continuous: recognition stops on its own after a pause.
    // We call .start() manually on each mic-press.
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.maxAlternatives = 1;

    rec.onresult = (event) => {
      let interim = '';
      let final = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          final += res[0].transcript + ' ';
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
      if (event.error === 'not-allowed') {
        setError('not-allowed');
        setListening(false);
      } else if (event.error === 'no-speech') {
        // browser detected silence — just stop quietly
        setListening(false);
      } else if (event.error === 'network') {
        setError('network');
        setListening(false);
      }
      // else ignore
    };

    rec.onend = () => {
      // recognition session ended (either naturally or via .stop())
      if (isMountedRef.current) setListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      isMountedRef.current = false;
      if (speakSafetyTimerRef.current) clearTimeout(speakSafetyTimerRef.current);
      try { rec.abort(); } catch (_) {}
      window.speechSynthesis?.cancel();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── STT: start ── */
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;
    if (isListeningRef.current) return; // already running

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
      console.warn('startListening error:', e.message);
    }
  }, [isSupported]);

  /* ── STT: stop ── */
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return;
    try { recognitionRef.current.stop(); } catch (_) {}
    setListening(false);
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

  return {
    speak, stopSpeaking, isSpeaking,
    startListening, stopListening,
    transcript, setTranscript,
    interimTranscript, speechDetected,
    resetTranscript, isListening,
    error, setError, isSupported,
  };
};

export default useSpeech;
