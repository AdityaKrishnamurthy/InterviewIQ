import { useState, useEffect, useRef, useCallback } from 'react';

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState('');
  const [speechDetected, setSpeechDetected] = useState(false);

  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const speakingSafetyTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const isMountedRef = useRef(true);
  const isListeningRef = useRef(false);

  const isSupported = typeof window !== 'undefined'
    && !!SpeechRecognitionAPI
    && !!window.speechSynthesis;

  // Sync ref with state
  const updateListeningState = (val) => {
    isListeningRef.current = val;
    if (isMountedRef.current) setIsListening(val);
  };

  // Pick the best English voice
  const getVoice = useCallback(() => {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    const english = voices.filter(v => v.lang.startsWith('en'));

    // Prefer Google or Microsoft voices
    const premium = english.find(v =>
      v.name.includes('Google') || v.name.includes('Microsoft')
    );
    if (premium) return premium;

    return english[0] || voices[0] || null;
  }, []);

  // TTS: speak text aloud
  const speak = useCallback((text) => {
    if (!isSupported || !text) return;

    if (speakingSafetyTimerRef.current) clearTimeout(speakingSafetyTimerRef.current);
    window.speechSynthesis.cancel(); // cancel any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voice = getVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (isMountedRef.current) setIsSpeaking(true);
      // Safety reset after 15 seconds in case browser fails to fire onend
      speakingSafetyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setIsSpeaking(false);
      }, 15000);
    };

    utterance.onend = () => {
      if (speakingSafetyTimerRef.current) clearTimeout(speakingSafetyTimerRef.current);
      if (isMountedRef.current) setIsSpeaking(false);
    };

    utterance.onerror = (e) => {
      if (speakingSafetyTimerRef.current) clearTimeout(speakingSafetyTimerRef.current);
      if (e.error !== 'canceled' && isMountedRef.current) {
        setIsSpeaking(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, getVoice]);

  // TTS: stop speaking
  const stopSpeaking = useCallback(() => {
    if (!isSupported) return;
    if (speakingSafetyTimerRef.current) clearTimeout(speakingSafetyTimerRef.current);
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // Clear silence timers
  const clearTimers = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Start silence timer (if no speech at all for 15s)
  const startSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && isListeningRef.current) {
        shouldRestartRef.current = false;
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
        }
        updateListeningState(false);
        setError('no-speech-timeout');
      }
    }, 15000);
  }, []);

  // Initialize recognition
  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      startSilenceTimer();

      let interimText = '';
      let finalText = finalTranscriptRef.current;

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
          finalTranscriptRef.current = finalText;
        } else {
          interimText += result[0].transcript;
        }
      }

      const fullText = (finalText + interimText).trim();

      if (isMountedRef.current) {
        setTranscript(fullText);
        setInterimTranscript(interimText);
        if (fullText.length > 0) {
          setSpeechDetected(true);
        }
      }
    };

    recognition.onerror = (event) => {
      if (!isMountedRef.current) return;

      if (event.error === 'aborted') return;

      if (event.error === 'not-allowed') {
        setError('not-allowed');
        updateListeningState(false);
        shouldRestartRef.current = false;
      } else if (event.error === 'no-speech') {
        // Handled by silence timer
      } else if (event.error === 'network') {
        setError('network');
        updateListeningState(false);
        shouldRestartRef.current = false;
      } else {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      if (shouldRestartRef.current && isMountedRef.current) {
        try {
          recognition.start();
        } catch (e) {
          if (isMountedRef.current) {
            updateListeningState(false);
            shouldRestartRef.current = false;
          }
        }
      } else if (isMountedRef.current) {
        updateListeningState(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isMountedRef.current = false;
      shouldRestartRef.current = false;
      clearTimers();
      if (speakingSafetyTimerRef.current) clearTimeout(speakingSafetyTimerRef.current);
      try { recognition.abort(); } catch (e) { /* ignore */ }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // STT: start listening
  const startListening = useCallback(() => {
    if (!isSupported || !recognitionRef.current) return;

    setError('');
    finalTranscriptRef.current = '';
    setTranscript('');
    setInterimTranscript('');
    setSpeechDetected(false);
    shouldRestartRef.current = true;

    try {
      recognitionRef.current.start();
      updateListeningState(true);
      startSilenceTimer();
    } catch (e) {
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            updateListeningState(true);
            startSilenceTimer();
          } catch (e2) {
            setError('start-failed');
          }
        }, 100);
      } catch (e2) {
        setError('start-failed');
      }
    }
  }, [isSupported, startSilenceTimer]);

  // STT: stop listening
  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    clearTimers();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    updateListeningState(false);
  }, [clearTimers]);

  // STT: reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    finalTranscriptRef.current = '';
    setSpeechDetected(false);
    setError('');
  }, []);

  return {
    // TTS
    speak,
    stopSpeaking,
    isSpeaking,
    // STT
    startListening,
    stopListening,
    transcript,
    setTranscript,
    interimTranscript,
    speechDetected,
    resetTranscript,
    isListening,
    // Shared
    error,
    setError,
    isSupported,
  };
};

export default useSpeech;
