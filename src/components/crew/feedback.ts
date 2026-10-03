// Sons originais (sintetizados com WebAudio, nada de arquivos) e vibração.

const SOUND_KEY = "quad-crew:sound";

let ctx: AudioContext | null = null;
let enabled = true;
const listeners = new Set<() => void>();

try {
  if (typeof window !== "undefined") enabled = window.localStorage.getItem(SOUND_KEY) !== "off";
} catch {
  // sem storage
}

export function soundEnabled() {
  return enabled;
}
export function serverSoundEnabled() {
  return true;
}
export function subscribeSound(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function setSoundEnabled(value: boolean) {
  enabled = value;
  try {
    window.localStorage.setItem(SOUND_KEY, value ? "on" : "off");
  } catch {
    // sem storage
  }
  listeners.forEach((l) => l());
  if (value) unlockAudio();
}

/** Precisa ser chamado num gesto do usuário (iOS). */
export function unlockAudio() {
  if (!enabled) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    ctx = null;
  }
}

type Note = { f: number; t: number; d: number; type?: OscillatorType; v?: number; slide?: number };

function play(notes: Note[]) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.18;
  master.connect(ctx.destination);
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.setValueAtTime(n.f, now + n.t);
    if (n.slide) osc.frequency.exponentialRampToValueAtTime(n.slide, now + n.t + n.d);
    const v = n.v ?? 1;
    gain.gain.setValueAtTime(0.0001, now + n.t);
    gain.gain.exponentialRampToValueAtTime(v, now + n.t + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);
    osc.connect(gain).connect(master);
    osc.start(now + n.t);
    osc.stop(now + n.t + n.d + 0.02);
  }
}

function noise(duration: number, from = 1800, to = 200, volume = 0.5) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * duration), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (Math.random() < 0.3 ? 1 : 0.3);
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(from, now);
  filter.frequency.exponentialRampToValueAtTime(to, now + duration);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  src.connect(filter).connect(gain).connect(ctx.destination);
  src.start(now);
}

/** "Iiic!" do Júlio: dois guinchos agudos e curtos, subindo de tom. */
function squeakSound(volume: number) {
  if (!enabled || !ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.value = 0.12 * volume;
  master.connect(ctx.destination);
  for (const [t, f1, f2, d] of [
    [0, 1900, 2600, 0.09],
    [0.13, 2100, 3100, 0.12],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(f1, now + t);
    osc.frequency.exponentialRampToValueAtTime(f2, now + t + d * 0.6);
    osc.frequency.exponentialRampToValueAtTime(f1 * 0.9, now + t + d);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(1, now + t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);
    osc.connect(gain).connect(master);
    osc.start(now + t);
    osc.stop(now + t + d + 0.02);
  }
}

export const sfx = {
  squeak: (volume = 1) => squeakSound(volume),
  ballHit: (power: number, volume = 1) => {
    noise(0.07, 2400, 600, 0.35 * volume);
    play([{ f: 140 + power * 90, t: 0, d: 0.09, type: "triangle", v: 0.6 * volume, slide: 80 }]);
  },
  goal: () => {
    noise(0.6, 4000, 1200, 0.35);
    play([{ f: 523, t: 0, d: 0.15 }, { f: 659, t: 0.12, d: 0.15 }, { f: 784, t: 0.24, d: 0.15 }, { f: 1047, t: 0.36, d: 0.45 }]);
  },
  ready: (on: boolean) => play(on ? [{ f: 660, t: 0, d: 0.1 }, { f: 990, t: 0.08, d: 0.18 }] : [{ f: 520, t: 0, d: 0.12 }]),
  mode: () => play([{ f: 392, t: 0, d: 0.12, type: "triangle" }, { f: 587, t: 0.1, d: 0.2, type: "triangle" }]),
  mission: () => play([{ f: 784, t: 0, d: 0.1 }, { f: 1047, t: 0.09, d: 0.1 }, { f: 1319, t: 0.18, d: 0.25 }]),
  cancel: () => play([{ f: 440, t: 0, d: 0.15, type: "triangle" }, { f: 330, t: 0.13, d: 0.25, type: "triangle" }]),
  whack: () => {
    noise(0.08, 1800, 300, 0.45);
    play([{ f: 220, t: 0, d: 0.08, type: "square", v: 0.35, slide: 110 }]);
  },
  emote: () => play([{ f: 880, t: 0, d: 0.06, v: 0.5 }]),
  join: () => play([{ f: 660, t: 0, d: 0.12 }, { f: 990, t: 0.08, d: 0.16 }]),
  leave: () => play([{ f: 660, t: 0, d: 0.12 }, { f: 440, t: 0.08, d: 0.16 }]),
  tap: () => play([{ f: 1200, t: 0, d: 0.05, v: 0.4 }]),
  countdown: () => play([{ f: 520, t: 0, d: 0.14, type: "triangle" }]),
  start: () => play([{ f: 392, t: 0, d: 0.18, type: "triangle" }, { f: 523, t: 0.12, d: 0.18, type: "triangle" }, { f: 784, t: 0.24, d: 0.4, type: "triangle" }]),
  reveal: () => play([{ f: 196, t: 0, d: 0.9, type: "sawtooth", v: 0.25, slide: 392 }]),
  task: () => play([{ f: 880, t: 0, d: 0.12 }, { f: 1320, t: 0.09, d: 0.22 }]),
  kill: () => {
    noise(0.35, 3000, 120, 0.9);
    play([{ f: 140, t: 0, d: 0.35, type: "square", v: 0.3, slide: 50 }]);
  },
  report: () => play([{ f: 880, t: 0, d: 0.16, type: "square", v: 0.35 }, { f: 660, t: 0.18, d: 0.16, type: "square", v: 0.35 }, { f: 880, t: 0.36, d: 0.22, type: "square", v: 0.35 }]),
  meeting: () => play([{ f: 523, t: 0, d: 0.5, type: "triangle" }, { f: 659, t: 0, d: 0.5, type: "triangle", v: 0.6 }]),
  vote: () => play([{ f: 740, t: 0, d: 0.08, v: 0.6 }]),
  eject: () => play([{ f: 600, t: 0, d: 1.2, slide: 120, v: 0.5 }]),
  sabotage: () => play([{ f: 420, t: 0, d: 0.22, type: "sawtooth", v: 0.3 }, { f: 420, t: 0.3, d: 0.22, type: "sawtooth", v: 0.3 }]),
  fixed: () => play([{ f: 660, t: 0, d: 0.1 }, { f: 880, t: 0.08, d: 0.1 }, { f: 1320, t: 0.16, d: 0.2 }]),
  win: () => play([{ f: 523, t: 0, d: 0.2 }, { f: 659, t: 0.15, d: 0.2 }, { f: 784, t: 0.3, d: 0.2 }, { f: 1047, t: 0.45, d: 0.6 }]),
  lose: () => play([{ f: 392, t: 0, d: 0.3, type: "triangle" }, { f: 330, t: 0.25, d: 0.3, type: "triangle" }, { f: 262, t: 0.5, d: 0.7, type: "triangle" }]),
  error: () => play([{ f: 200, t: 0, d: 0.12, type: "square", v: 0.25 }]),
};

export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") navigator.vibrate(pattern);
  } catch {
    // opcional
  }
}
