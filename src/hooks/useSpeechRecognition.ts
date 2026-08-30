import { useState, useEffect, useRef, useCallback } from 'react';
import { cleanVoiceTranscript } from '../lib/cleanSpeech';

declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

export interface SpeechRecognitionHook {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  recordingTime: number;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setTranscript: (text: string) => void;
}

export function useSpeechRecognition(): SpeechRecognitionHook {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscriptState] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const timerRef = useRef<any>(null);
  const finalSegmentsRef = useRef<string[]>([]);

  const setTranscript = useCallback((text: string) => {
    finalSegmentsRef.current = text ? [text] : [];
    setTranscriptState(text);
  }, []);

  useEffect(() => {
    const SpeechRecognitionClass =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      setIsSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      // Try Bolivian Spanish first
      try {
        recognition.lang = 'es-BO';
      } catch {
        recognition.lang = 'es-ES';
      }

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res && res[0] && res[0].transcript) {
            const text = res[0].transcript.trim();
            if (res.isFinal) {
              if (text && !finalSegmentsRef.current.includes(text)) {
                finalSegmentsRef.current.push(text);
              }
            } else {
              currentInterim = text;
            }
          }
        }

        const rawJoined = finalSegmentsRef.current.join(' ');
        const cleaned = cleanVoiceTranscript(rawJoined);
        setTranscriptState(cleaned);
        setInterimTranscript(currentInterim);
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'no-speech') {
          return;
        }
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setError(
            'Permiso de micrófono denegado. Puedes permitirlo en tu navegador o escribir directamente.'
          );
        } else if (event.error === 'network') {
          setError('Aviso de conexión de voz. Puedes escribir tu pedido directamente.');
        } else if (event.error !== 'aborted') {
          console.warn('Speech error:', event.error);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (err: any) {
      console.error('Speech recognition initialization failed:', err);
      setIsSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer counter when listening
  useEffect(() => {
    if (isListening) {
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isListening]);

  const startListening = useCallback(() => {
    setError(null);
    finalSegmentsRef.current = [];
    setTranscriptState('');
    setInterimTranscript('');

    if (!recognitionRef.current) {
      setError('Reconocimiento de voz no disponible en este dispositivo.');
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (inner) {
            console.warn('Speech start error retry:', inner);
          }
        }, 150);
      } catch (innerErr) {
        console.warn('Speech restart error:', innerErr);
      }
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.warn('Speech stop error:', err);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    finalSegmentsRef.current = [];
    setTranscriptState('');
    setInterimTranscript('');
    setError(null);
    setRecordingTime(0);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    recordingTime,
    startListening,
    stopListening,
    resetTranscript,
    setTranscript,
  };
}
