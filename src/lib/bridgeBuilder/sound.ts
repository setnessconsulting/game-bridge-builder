export type BridgeSoundCue = "pickup" | "place" | "overhang" | "solve" | "finish";

type AudioContextRef = { current: AudioContext | null };
type AudioWindow = Window & { webkitAudioContext?: typeof AudioContext };

const CUE_NOTES: Record<BridgeSoundCue, readonly number[]> = {
  pickup: [330],
  place: [196],
  overhang: [147, 123],
  solve: [523.25, 659.25, 783.99],
  finish: [523.25, 659.25, 783.99, 1046.5],
};

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
  if (!Ctor) return null;
  try {
    return new Ctor();
  } catch {
    return null;
  }
}

export function playBridgeCue(contextRef: AudioContextRef, cue: BridgeSoundCue): void {
  const context = contextRef.current ?? getContext();
  if (!context) return;
  contextRef.current = context;
  try {
    const notes = CUE_NOTES[cue];
    const start = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.07;
      const noteEnd = noteStart + 0.14;

      oscillator.type = cue === "solve" || cue === "finish" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.04, noteStart + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd);
    });
    void context.resume().catch(() => undefined);
  } catch {
    return;
  }
}

export function closeBridgeSoundContext(contextRef: AudioContextRef): void {
  const context = contextRef.current;
  contextRef.current = null;
  if (context) void context.close().catch(() => undefined);
}
