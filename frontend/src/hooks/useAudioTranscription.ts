import { useState, useCallback, useRef, useEffect } from 'react';

interface TranscriptionResult {
  text: string;
  isFinal: boolean;
  timestamp: Date;
}

export const useAudioTranscription = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);
  const onTranscriptCallback = useRef<((result: TranscriptionResult) => void) | null>(null);

  useEffect(() => {
    // Check support on mount but do not setState directly if possible?
    // Actually, setting state on mount is fine usually, but React warns about "cascading renders".
    // It's mostly a performance warning.
    // However, since it is inside useEffect[], it runs once.
    // The warning says: "Calling setState synchronously within an effect can trigger cascading renders".
    // This happens because we call setIsSupported(false) immediately.
    // We can wrap it in a setTimeout or just ignore if we accept the re-render.
    // But to fix, we can check support outside useEffect or use a ref for support and only state if needed?
    // Better: Check support in initial state or a separate effect that is not sync?
    // Or just initialize state based on window presence.

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      // We'll handle this by initial state if possible, or just accept the update.
      // But to fix the lint error specifically:
      // We can use a ref for the recognition instance.
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

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (event: any) => {
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
  useEffect(() => {
     const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
     if (!SpeechRecognition) {
         setIsSupported(false);
         setError('Reconhecimento de fala não suportado neste navegador');
     }
  }, []);

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
