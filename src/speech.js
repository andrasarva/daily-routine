// Felolvasás: saját hangfájl, ha van; különben magyar gépi hang (Web Speech API).

let voice = null;
let rate = 0.9;
let current = null;

function pickVoice() {
  const voices = window.speechSynthesis?.getVoices?.() || [];
  voice =
    voices.find((v) => v.lang?.toLowerCase().startsWith('hu') && /google/i.test(v.name)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('hu')) ||
    null;
}
if ('speechSynthesis' in window) {
  pickVoice();
  window.speechSynthesis.onvoiceschanged = pickVoice;
}

export function setSpeechRate(r) {
  rate = r;
}

export function hasHungarianVoice() {
  return !!voice;
}

export function stopSpeaking() {
  try {
    window.speechSynthesis?.cancel();
  } catch { /* noop */ }
  if (current) {
    current.pause();
    current = null;
  }
}

export function speak(text, audioSrc = '') {
  stopSpeaking();
  if (audioSrc) {
    const a = new Audio(audioSrc);
    current = a;
    a.play().catch(() => speakTts(text)); // ha nem tölthető be, jön a gépi hang
    return;
  }
  speakTts(text);
}

function speakTts(text) {
  if (!text || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'hu-HU';
  if (voice) u.voice = voice;
  u.rate = rate;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}
