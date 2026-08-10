import { useState, useEffect, useRef, useCallback } from 'react';

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null;

const useSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');

  const recognitionRef = useRef(null);
  const shouldRestartRef = useRef(false);
  const silenceTimerRef = useRef(null);
  const finalTranscriptRef = useRef('');
  const isMountedRef = useRef(true);

  const isSupported = typeof window !== 'undefined'
    && !!SpeechRecognitionAPI
    && !!window.speechSynthesis;

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

    window.speechSynthesis.cancel(); // cancel any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voice = getVoice();
    if (voice) utterance.voice = voice;

    utterance.onstart = () => {
      if (isMountedRef.current) setIsSpeaking(true);
    };
    utterance.onend = () => {
      if (isMountedRef.current) setIsSpeaking(false);
    };
    utterance.onerror = (e) => {
      if (e.error !== 'canceled' && isMountedRef.current) {
        setIsSpeaking(false);
      }
    };

    window.speechSynthesis.speak(utterance);
  }, [isSupported, getVoice]);

  // TTS: stop speaking
  const stopSpeaking = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Start silence timer (15s)
  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      if (isMountedRef.current && isListening) {
        shouldRestartRef.current = false;
        if (recognitionRef.current) {
          try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
        }
        setIsListening(false);
        setError('no-speech-timeout');
      }
    }, 15000);
  }, [clearSilenceTimer, isListening]);

  // Initialize recognition
  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      clearSilenceTimer();
      startSilenceTimer(); // Reset silence timer on any result

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

      if (isMountedRef.current) {
        setTranscript((finalText + interimText).trim());
      }
    };

    recognition.onerror = (event) => {
      if (!isMountedRef.current) return;

      // Ignore 'aborted' errors (triggered by our own stop calls)
      if (event.error === 'aborted') return;

      if (event.error === 'not-allowed') {
        setError('not-allowed');
        setIsListening(false);
        shouldRestartRef.current = false;
      } else if (event.error === 'no-speech') {
        // Chrome fires this after silence — don't treat as fatal
        // The silence timer will handle it
      } else if (event.error === 'network') {
        setError('network');
        setIsListening(false);
        shouldRestartRef.current = false;
      } else {
        setError(event.error);
      }
    };

    recognition.onend = () => {
      // Auto-restart if it stopped unexpectedly (Chrome ~60s timeout)
      if (shouldRestartRef.current && isMountedRef.current) {
        try {
          recognition.start();
        } catch (e) {
          // If restart fails, mark as not listening
          if (isMountedRef.current) {
            setIsListening(false);
            shouldRestartRef.current = false;
          }
        }
      } else if (isMountedRef.current) {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isMountedRef.current = false;
      shouldRestartRef.current = false;
      clearSilenceTimer();
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
    shouldRestartRef.current = true;

    try {
      recognitionRef.current.start();
      setIsListening(true);
      startSilenceTimer();
    } catch (e) {
      // Already started — try aborting and restarting
      try {
        recognitionRef.current.abort();
        setTimeout(() => {
          try {
            recognitionRef.current.start();
            setIsListening(true);
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
    clearSilenceTimer();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) { /* ignore */ }
    }
    setIsListening(false);
  }, [clearSilenceTimer]);

  // STT: reset transcript
  const resetTranscript = useCallback(() => {
    setTranscript('');
    finalTranscriptRef.current = '';
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
    resetTranscript,
    isListening,
    // Shared
    error,
    setError,
    isSupported,
  };
};

export default useSpeech;
