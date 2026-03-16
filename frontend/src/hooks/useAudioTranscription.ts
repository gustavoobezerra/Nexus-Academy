import { useState, useCallback, useRef, useEffect } from 'react';

// Extensão da interface Window para APIs específicas do navegador
declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}


interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

interface BrowserSpeechRecognitionAlternative {
  transcript: string;
}

interface BrowserSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: BrowserSpeechRecognitionAlternative;
}

interface BrowserSpeechRecognitionEvent {
  resultIndex: number;
  results: BrowserSpeechRecognitionResult[];
}

interface BrowserSpeechRecognitionErrorEvent {
  error: string;
}

export const useAudioTranscription = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const support = !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
      return support ? null : 'Reconhecimento de fala não suportado neste navegador';
    }
    return 'Reconhecimento de fala não suportado neste navegador';
  });

  const recognitionRef = useRef<any>(null);
  const onTranscriptCallback = useRef<((result: TranscriptionResult) => void) | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'pt-BR';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: BrowserSpeechRecognitionEvent) => {
      let interimTrans = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + ' ' + transcript);

          if (onTranscriptCallback.current) {
            onTranscriptCallback.current({
              text: transcript,
              isFinal: true,
              timestamp: new Date(),
            });
          }
        } else {
          interimTrans += transcript;
        }
      }

      setInterimTranscript(interimTrans);

      if (interimTrans && onTranscriptCallback.current) {
        onTranscriptCallback.current({
          text: interimTrans,
          isFinal: false,
          timestamp: new Date(),
        });
      }
    };

    recognition.onerror = (event: BrowserSpeechRecognitionErrorEvent) => {
      setError(`Erro: ${event.error}`);
      console.error('Speech recognition error:', event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Initialize isSupported based on window
  const [isSupported] = useState(() => {
    if (typeof window !== 'undefined') {
      return !!((window as any).webkitSpeechRecognition || (window as any).SpeechRecognition);
    }
    return false;
  });



  const startListening = useCallback(() => {
    if (recognitionRef.current && isSupported) {
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      recognitionRef.current.start();
    }
  }, [isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  const onTranscript = useCallback((callback: (result: TranscriptionResult) => void) => {
    onTranscriptCallback.current = callback;
  }, []);

  const getFullTranscript = useCallback(() => {
    return (transcript + ' ' + interimTranscript).trim();
  }, [transcript, interimTranscript]);

  return {
    isListening,
    transcript: transcript.trim(),
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    onTranscript,
    getFullTranscript,
  };
};
