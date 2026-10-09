// Hangeffektek WebAudio-val előállítva – nincs szükség hangfájlokra.

let ctx = null;
function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone({ freq = 440, type = 'sine', start = 0, dur = 0.2, vol = 0.25, slideTo = null }) {
  const c = ac();
  const t0 = c.currentTime + start;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

const SFX = {
  pop() {
    tone({ freq: 500, slideTo: 900, dur: 0.12, type: 'triangle', vol: 0.3 });
  },
  ding() {
    tone({ freq: 880, dur: 0.25, type: 'sine', vol: 0.3 });
    tone({ freq: 1320, start: 0.1, dur: 0.35, type: 'sine', vol: 0.25 });
  },
  siren() {
    // Tű-tű-tű: váltakozó két hang
    for (let i = 0; i < 4; i++) {
      tone({ freq: i % 2 ? 660 : 880, start: i * 0.28, dur: 0.26, type: 'square', vol: 0.12 });
    }
  },
  roar() {
    const c = ac();
    const t0 = c.currentTime;
    const dur = 1.1;
    // Zaj + mély fűrészfog, sávszűrővel és remegéssel
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = c.createBufferSource();
    noise.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(500, t0);
    bp.frequency.exponentialRampToValueAtTime(180, t0 + dur);
    bp.Q.value = 1.5;
    const saw = c.createOscillator();
    saw.type = 'sawtooth';
    saw.frequency.setValueAtTime(150, t0);
    saw.frequency.exponentialRampToValueAtTime(70, t0 + dur);
    const lfo = c.createOscillator();
    lfo.frequency.value = 22;
    const lfoGain = c.createGain();
    lfoGain.gain.value = 0.25;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.5, t0 + 0.12);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    lfo.connect(lfoGain).connect(g.gain);
    noise.connect(bp).connect(g);
    const sg = c.createGain();
    sg.gain.value = 0.35;
    saw.connect(sg).connect(g);
    g.connect(c.destination);
    [noise, saw, lfo].forEach((n) => { n.start(t0); n.stop(t0 + dur + 0.05); });
  },
  fanfare() {
    const notes = [523, 659, 784, 1047, 784, 1047];
    const times = [0, 0.15, 0.3, 0.45, 0.7, 0.85];
    notes.forEach((f, i) => tone({ freq: f, start: times[i], dur: i === notes.length - 1 ? 0.6 : 0.2, type: 'triangle', vol: 0.28 }));
  },
  whoosh() {
    tone({ freq: 300, slideTo: 1200, dur: 0.3, type: 'sine', vol: 0.15 });
  },
};

let enabled = true;
export function setSfxEnabled(v) {
  enabled = v;
}

export function sfx(name) {
  if (!enabled) return;
  try {
    SFX[name]?.();
  } catch {
    /* hang nem elérhető */
  }
}

/** Az első érintéskor "feloldjuk" a hangot (böngésző szabály). */
export function unlockAudio() {
  try {
    ac();
  } catch {
    /* noop */
  }
}
