// Synthesized sound effects with WebAudio. No audio files.
let ctx = null, master = null, noiseBuf = null;
let muted = localStorage.getItem('mib_muted') === '1';

export function isMuted() { return muted; }
export function setMuted(m) {
  muted = m;
  localStorage.setItem('mib_muted', m ? '1' : '0');
  if (master) master.gain.value = m ? 0 : 0.8;
}

// Must be called from a user gesture (iOS requirement).
export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp); comp.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') ctx.resume();
}

function ok() { return ctx && !muted && ctx.state === 'running'; }

function noise(dur, { type = 'lowpass', freq = 2000, q = 1, gain = 1, attack = 0.002, endFreq = null, when = 0 } = {}) {
  const t = ctx.currentTime + when;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (endFreq) f.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function tone(freq, dur, { type = 'sine', gain = 0.3, endFreq = null, when = 0, attack = 0.005 } = {}) {
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

export const sfx = {
  shot(weapon) {
    if (!ok()) return;
    switch (weapon) {
      case 'shotgun':
        noise(0.45, { freq: 1800, endFreq: 200, gain: 1.0 });
        tone(90, 0.25, { type: 'square', gain: 0.35, endFreq: 40 });
        break;
      case 'rifle':
        noise(0.35, { freq: 4000, endFreq: 300, gain: 0.9 });
        tone(160, 0.12, { type: 'square', gain: 0.25, endFreq: 60 });
        break;
      case 'smg':
        noise(0.09, { freq: 3500, endFreq: 800, gain: 0.55 });
        tone(220, 0.05, { type: 'square', gain: 0.12, endFreq: 100 });
        break;
      default: // pistol
        noise(0.18, { freq: 3000, endFreq: 500, gain: 0.7 });
        tone(180, 0.08, { type: 'square', gain: 0.18, endFreq: 70 });
    }
  },
  survivorShot() { if (ok()) noise(0.12, { freq: 2200, endFreq: 500, gain: 0.3 }); },
  empty() { if (ok()) tone(1400, 0.04, { type: 'square', gain: 0.1 }); },
  reload() {
    if (!ok()) return;
    tone(600, 0.05, { type: 'square', gain: 0.12 });
    noise(0.06, { type: 'bandpass', freq: 2500, q: 4, gain: 0.4, when: 0.25 });
    tone(900, 0.04, { type: 'square', gain: 0.12, when: 0.45 });
  },
  hit() { if (ok()) noise(0.1, { type: 'bandpass', freq: 400, q: 1.5, gain: 0.5 }); },
  groan(pitch = 1) {
    if (!ok()) return;
    const t = ctx.currentTime, dur = 0.9 + Math.random() * 0.7;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    const base = (70 + Math.random() * 40) * pitch;
    o.frequency.setValueAtTime(base, t);
    o.frequency.linearRampToValueAtTime(base * 0.75, t + dur);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 5 + Math.random() * 4;
    const lg = ctx.createGain(); lg.gain.value = base * 0.08;
    lfo.connect(lg); lg.connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 300; f.Q.value = 3;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f); f.connect(g); g.connect(master);
    o.start(t); lfo.start(t); o.stop(t + dur + 0.1); lfo.stop(t + dur + 0.1);
  },
  zombieDie() { if (ok()) { noise(0.3, { freq: 600, endFreq: 100, gain: 0.5 }); tone(120, 0.35, { type: 'sawtooth', gain: 0.12, endFreq: 50 }); } },
  barricadeHit() { if (ok()) { noise(0.15, { type: 'bandpass', freq: 250, q: 2, gain: 0.7 }); tone(70, 0.12, { gain: 0.3 }); } },
  playerHurt() { if (ok()) { tone(300, 0.2, { type: 'triangle', gain: 0.3, endFreq: 150 }); noise(0.15, { freq: 800, gain: 0.4 }); } },
  click() { if (ok()) tone(800, 0.05, { type: 'triangle', gain: 0.15 }); },
  pickup() { if (ok()) { tone(660, 0.1, { type: 'triangle', gain: 0.2 }); tone(990, 0.15, { type: 'triangle', gain: 0.2, when: 0.1 }); } },
  waveStart() { if (ok()) { tone(110, 1.2, { type: 'sawtooth', gain: 0.15, endFreq: 82 }); tone(55, 1.4, { type: 'sine', gain: 0.3 }); } },
  waveClear() { if (ok()) [523, 659, 784].forEach((f, i) => tone(f, 0.25, { type: 'triangle', gain: 0.2, when: i * 0.12 })); },
  gameOver() { if (ok()) [300, 220, 160, 110].forEach((f, i) => tone(f, 0.5, { type: 'sawtooth', gain: 0.15, when: i * 0.25 })); },
};
