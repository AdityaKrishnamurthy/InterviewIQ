import { useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';

const SpeechRecognitionAPI =
  typeof window !== 'undefined'
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : null;

// Chromium's webkitSpeechRecognition streams mic audio to Google's remote
// recognition backend rather than running on-device. Brave (and other
// de-Googled Chromium builds) blocks that backend by default, so recognition
// fails immediately even with mic permission granted. MediaRecorder + a
// server-side Whisper endpoint is the fallback for browsers where native
// recognition is unsupported or gets blocked at runtime.
const hasMediaRecorderFallback =
  typeof window !== 'undefined' &&
  typeof window.MediaRecorder !== 'undefined' &&
  !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

const getSupportedMimeType = () => {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

const useSpeech = (token) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechDetected, setSpeechDetected] = useState(false);
  const [error, setError] = useState('');
  const [sttEngine, setSttEngine] = useState(() =>
    SpeechRecognitionAPI ? 'native' : hasMediaRecorderFallback ? 'fallback' : 'none'
  );

  const recognitionRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const isMountedRef = useRef(true);
  const isListeningRef = useRef(false);
  const speakSafetyTimerRef = useRef(null);
  const utteranceRef = useRef(null);
  const tokenRef = useRef(token);
  const nativeBrokenRef = useRef(false);
  const startFallbackRecordingRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const mediaStreamRef = useRef(null);
  const transcribeSafetyTimerRef = useRef(null);

  const isSttSupported = typeof window !== 'undefined' && (!!SpeechRecognitionAPI || hasMediaRecorderFallback);
  const isTtsSupported = typeof window !== 'undefined' && !!window.speechSynthesis;
  const isSupported = isSttSupported && isTtsSupported;

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

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

  /* ── STT fallback: MediaRecorder + server-side Whisper transcription ── */
  const startFallbackRecording = useCallback(async () => {
    if (!hasMediaRecorderFallback) {
      if (isMountedRef.current) setError('unsupported');
      setListening(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;

        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (!chunks.length) {
          setListening(false);
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        if (isMountedRef.current) setIsTranscribing(true);

        if (transcribeSafetyTimerRef.current) clearTimeout(transcribeSafetyTimerRef.current);
        transcribeSafetyTimerRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setIsTranscribing(false);
            setError('transcription-failed');
          }
        }, 30000);

        try {
          const ext = (recorder.mimeType || '').includes('mp4') ? 'mp4' : 'webm';
          const form = new FormData();
          form.append('audio', blob, `answer.${ext}`);

          const res = await fetch(`${API_BASE_URL}/api/speech/transcribe`, {
            method: 'POST',
            headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
            body: form,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || 'Transcription failed');

          if (isMountedRef.current) {
            finalTranscriptRef.current = data.transcript || '';
            setTranscript(data.transcript || '');
            setInterimTranscript('');
            if (data.transcript) setSpeechDetected(true);
            setError('');
          }
        } catch {
          if (isMountedRef.current) setError('transcription-failed');
        } finally {
          if (transcribeSafetyTimerRef.current) clearTimeout(transcribeSafetyTimerRef.current);
          if (isMountedRef.current) setIsTranscribing(false);
          setListening(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      if (isMountedRef.current) setSttEngine('fallback');
      setListening(true);
    } catch {
      if (isMountedRef.current) setError('not-allowed');
      setListening(false);
    }
  }, []);

  useEffect(() => {
    startFallbackRecordingRef.current = startFallbackRecording;
  }, [startFallbackRecording]);

  /* ── STT: initialise native engine ── */
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

    // Chromium's speech-recognition backend is a remote Google service, not
    // an on-device one. Browsers that don't wire it up (Brave, etc.) fail
    // with 'service-not-allowed' or 'network' the instant recognition starts
    // — even though mic permission was granted fine. Treat that as "this
    // engine doesn't work here", not "the user denied the mic", and switch
    // to the MediaRecorder fallback transparently rather than dead-ending.
    rec.onerror = (event) => {
      if (!isMountedRef.current) return;
      if (event.error === 'aborted') return;

      if (event.error === 'not-allowed') {
        setError('not-allowed');
        setListening(false);
      } else if (event.error === 'service-not-allowed' || event.error === 'network') {
        nativeBrokenRef.current = true;
        try { rec.abort(); } catch {}
        if (isListeningRef.current) {
          startFallbackRecordingRef.current?.();
        } else {
          setListening(false);
        }
      } else if (event.error === 'no-speech') {
        // If listening mode is active, attempt to keep listening
        if (isListeningRef.current) {
          try { rec.start(); } catch {}
        }
      }
    };

    rec.onend = () => {
      if (!isMountedRef.current) return;
      // Already handed off to the fallback engine in onerror above — don't
      // race its state with a native restart attempt that will just refail.
      if (nativeBrokenRef.current) return;
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
      if (transcribeSafetyTimerRef.current) clearTimeout(transcribeSafetyTimerRef.current);
      try { rec.abort(); } catch {}
      try { window.speechSynthesis?.cancel(); } catch {}
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
      } catch {}
      try { mediaStreamRef.current?.getTracks().forEach((t) => t.stop()); } catch {}
    };
  }, []);

  /* ── STT: start ── */
  const startListening = useCallback(async () => {
    if (!isSttSupported) {
      setError('unsupported');
      return;
    }

    if (isListeningRef.current) return;

    const useNative = !!SpeechRecognitionAPI && recognitionRef.current && !nativeBrokenRef.current;

    finalTranscriptRef.current = '';
    if (isMountedRef.current) {
      setTranscript('');
      setInterimTranscript('');
      setSpeechDetected(false);
      setError('');
    }

    if (!useNative) {
      await startFallbackRecording();
      return;
    }

    // Check mic permission explicitly if available
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch {
        if (isMountedRef.current) setError('not-allowed');
        return;
      }
    }

    try {
      recognitionRef.current.start();
      if (isMountedRef.current) setSttEngine('native');
      setListening(true);
    } catch (e) {
      // If already started or transitioning, ensure listening state is true
      if (e.name === 'InvalidStateError') {
        setListening(true);
      } else {
        console.warn('startListening error:', e.message);
      }
    }
  }, [isSttSupported, startFallbackRecording]);

  /* ── STT: stop ── */
  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop(); // onstop drives transcription + setListening(false)
      return;
    }
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
    resetTranscript, isListening, isTranscribing,
    error, setError, isSupported, isSttSupported, isTtsSupported,
    sttEngine,
  };
};

export default useSpeech;
