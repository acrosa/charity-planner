import { useCallback, useRef, useState } from "react";

// Hands-free voice for the interview (DESIGN.md §11). speak() plays the agent's
// question (ElevenLabs TTS); listen() auto-records and ends the turn on silence
// (VAD), then transcribes (Scribe). Manual "send now" + full cancel. Everything
// degrades to silent/typed mode if the mic is denied or voice isn't configured.

export type VoiceState = "idle" | "speaking" | "listening" | "transcribing";

interface Controller {
  cancelled: boolean;
  stopRequested: boolean;
}

const SILENCE_MS = 1400; // end turn after this much trailing silence
const NO_SPEECH_MS = 8000; // give up if nothing is said
const MAX_MS = 22_000; // hard cap on a single answer
const SPEECH_RMS = 0.035; // volume threshold that counts as speech

export function useVoice() {
  const [state, setState] = useState<VoiceState>("idle");
  const ctrlRef = useRef<Controller>({ cancelled: false, stopRequested: false });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cancel = useCallback(() => {
    ctrlRef.current.cancelled = true;
    ctrlRef.current.stopRequested = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
    setState("idle");
  }, []);

  const sendNow = useCallback(() => {
    ctrlRef.current.stopRequested = true;
  }, []);

  const speak = useCallback(async (text: string): Promise<void> => {
    if (ctrlRef.current.cancelled) return;
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return; // degrade: stay silent
      const blob = await res.blob();
      if (ctrlRef.current.cancelled) return;
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      setState("speaking");
      await audio.play().catch(() => {});
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        if (ctrlRef.current.cancelled) resolve();
      });
      URL.revokeObjectURL(url);
      audioRef.current = null;
    } catch {
      /* degrade silently */
    }
  }, []);

  /** Record until silence/tap, transcribe, return text (empty if nothing said). */
  const listen = useCallback(async (): Promise<string> => {
    if (ctrlRef.current.cancelled) return "";
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return ""; // mic denied → caller falls back to typed
    }
    streamRef.current = stream;
    ctrlRef.current.stopRequested = false;

    const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
    const recorder = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);

    const AC: typeof AudioContext =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    const srcNode = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    srcNode.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);

    recorder.start();
    setState("listening");

    let speechStarted = false;
    const start = performance.now();
    let silenceStart = 0;

    await new Promise<void>((resolve) => {
      let raf = 0;
      const finish = () => {
        cancelAnimationFrame(raf);
        resolve();
      };
      const tick = () => {
        if (ctrlRef.current.cancelled) return finish();
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          const x = (buf[i] - 128) / 128;
          sum += x * x;
        }
        const rms = Math.sqrt(sum / buf.length);
        const now = performance.now();
        const elapsed = now - start;

        if (rms > SPEECH_RMS) {
          speechStarted = true;
          silenceStart = 0;
        } else if (speechStarted) {
          if (!silenceStart) silenceStart = now;
          else if (now - silenceStart > SILENCE_MS) return finish();
        }
        if (ctrlRef.current.stopRequested && (speechStarted || elapsed > 400)) return finish();
        if (!speechStarted && elapsed > NO_SPEECH_MS) return finish();
        if (elapsed > MAX_MS) return finish();
        raf = requestAnimationFrame(tick);
      };
      tick();
    });

    recorder.stop();
    await new Promise<void>((r) => {
      recorder.onstop = () => r();
    });
    stream.getTracks().forEach((t) => {
      t.stop();
    });
    streamRef.current = null;
    await ctx.close().catch(() => {});

    if (!speechStarted || ctrlRef.current.cancelled) {
      setState("idle");
      return "";
    }

    setState("transcribing");
    try {
      const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
      const res = await fetch("/api/stt", {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });
      setState("idle");
      if (!res.ok) return "";
      const { text } = (await res.json()) as { text: string };
      return text ?? "";
    } catch {
      setState("idle");
      return "";
    }
  }, []);

  const reset = useCallback(() => {
    ctrlRef.current = { cancelled: false, stopRequested: false };
  }, []);

  return { state, speak, listen, sendNow, cancel, reset };
}
