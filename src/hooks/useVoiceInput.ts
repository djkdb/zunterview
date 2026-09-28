import { useCallback, useEffect, useRef, useState } from "react";
import { createRecognizer, isSpeechRecognitionSupported, type Recognizer } from "../services/speech/speechRecognition";

const ERROR_COPY: Record<string, string> = {
  "not-allowed": "Microphone permission was denied. You can keep answering by typing.",
  "service-not-allowed": "Speech recognition is blocked in this browser. Text mode is still available.",
  "audio-capture": "No microphone was found. Text mode is still available.",
  network: "Speech recognition needs a network connection. Try typing instead.",
  "start-failed": "Couldn't start recording. Try again or type your answer.",
};

/**
 * Speech-to-text for answers. Recording starts only on an explicit user action
 * and stops automatically when the component unmounts.
 */
export function useVoiceInput(lang: string, onFinal: (text: string) => void) {
  const supported = isSpeechRecognitionSupported();
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<Recognizer | null>(null);
  const onFinalRef = useRef(onFinal);
  useEffect(() => {
    onFinalRef.current = onFinal;
  }, [onFinal]);

  const stop = useCallback(() => {
    recRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (!supported) return;
    setError(null);
    recRef.current?.stop();
    recRef.current = createRecognizer(lang, {
      onFinal: (t) => t && onFinalRef.current(t),
      onInterim: setInterim,
      onError: (code) => setError(ERROR_COPY[code] ?? `Speech recognition error (${code}).`),
      onStop: () => setRecording(false),
    });
    recRef.current?.start();
    setRecording(true);
  }, [lang, supported]);

  useEffect(() => () => recRef.current?.stop(), []);

  return { supported, recording, interim, error, start, stop };
}
