export type Voice = { enabled: boolean };

function synth(): SpeechSynthesis | null {
  if (typeof window === "undefined") return null;
  return window.speechSynthesis ?? null;
}

/** Speak one short line through the OS voice when narration is enabled. */
export function speakLine(voice: Voice, text: string): void {
  if (!voice.enabled) return;
  const s = synth();
  if (!s || !text) return;
  try {
    s.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.volume = 0.9;
    s.speak(utterance);
  } catch {
    return;
  }
}

export function cancelSpeech(): void {
  try {
    synth()?.cancel();
  } catch {
    return;
  }
}
