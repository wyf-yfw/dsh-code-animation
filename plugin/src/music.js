/**
 * Real-time, cue-accurate score synthesis.
 *
 * Two problems have to be solved together for a cut to feel like a 卡点:
 *
 *   1. The cut must sit on a strong musical position. That is a tempo-and-phase
 *      problem: pick the beat period that puts every cut on a bar line, not merely
 *      "near a beat". (This is the same thing `web-audio-beat-detector` solves when it
 *      jointly estimates tempo and first-beat offset — here it is inverted, because the
 *      cut times are known up front and the music is composed to them.)
 *
 *   2. The bar has to be an actual groove. A drone with occasional booms does not read
 *      as an accent, because there is no pulse for the accent to break. So every bar
 *      carries kick, snare, hats and bass, and the cut lands where the ear expects the
 *      downbeat.
 *
 * On top of that, the arrangement sidechains under each cue so the impact lands in a
 * gap rather than on top of an equally loud bed.
 *
 * Everything is synthesised with Web Audio through `OfflineAudioContext`, so there are
 * no bundled assets and no network.
 */

const MUSIC_PRESETS = [
  { id: 'auto', label: '智能匹配分镜卡点' },
  { id: 'guofeng', label: '国风水墨韵律' },
  { id: 'epic', label: '史诗宏大震撼' },
  { id: 'synth', label: '赛博未来科技' },
  { id: 'pulse', label: '快节奏动感脉冲' },
  { id: 'bright', label: '活泼轻快灵动' },
  { id: 'chiptune', label: '8-bit 芯片音乐' },
  { id: 'ambient', label: '沉浸深邃氛围' },
  { id: 'none', label: '无配乐' },
];

const SCALES = {
  pentatonic: [0, 2, 4, 7, 9],
  minorPent: [0, 3, 5, 7, 10],
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
};

/**
 * Bar patterns, sixteen steps each: one character per sixteenth note.
 *
 * `K`/`k` kick (accent/soft), `X` kick and snare together, `S` snare,
 * `H`/`h` hat (accent/soft), `o` open hat, `.` silence.
 *
 * `four` is four-on-the-floor (a kick on every beat), `backbeat` is kick on 1 and 3
 * with the snare on 2 and 4, `sparse` leaves air for an arrival. Each family holds
 * several variants because repeating one bar verbatim is what made every score read
 * as the same loop; consecutive bars rotate through them.
 */
const GROOVE_PATTERNS = {
  four: [
    'K.h.X.h.K.h.X.h.',
    'K.hhX.hhK.hhX.hh',
    'K.h.X.h.K.h.X.oH',
    'K.h.X.hhK.h.X.hh',
  ],
  backbeat: [
    'K.h.S.h.K.h.S.h.',
    'K..hS..hK..hS..h',
    'K.hhS.hhK.hhS.hh',
    'K.h.S.h.K.h.S.oH',
  ],
  sparse: [
    'K.......o.......',
    'K.....k.o.......',
    'K.......h...S...',
    'K...k...o...S...',
  ],
};

/**
 * One instrument set per mood.
 *
 * Every preset used to share a single electronic kit — the same sine kick, the same
 * noise snare, the same saw pluck — so changing mood moved only the scale, tempo and
 * reverb and every score still sounded like the same track. These sets change the
 * instrument families themselves: a taiko and a plucked zither for 国风, an orchestra
 * for 史诗, an 808/909 machine for 赛博, a marimba for 轻快, an FM bell for 氛围.
 *
 * Voice parameters are read by the primitives below; `null` drops the voice entirely.
 */
/**
 * Instruments, each built by a different synthesis method.
 *
 * A parameter sweep over one oscillator cannot make a zither, a flute and a piano —
 * they differ in *how* they make sound, not in cutoff and decay. Each entry here names
 * the method its voice uses:
 *
 *   pluck  filtered oscillator stack, exponential decay, optional pitch bend
 *   struck additive partials with hammer noise; higher partials decay faster (piano)
 *   fm     carrier ring-modulated by a ratio (marimba, bell, e-piano)
 *   bowed  detuned saw with bow noise, vibrato and a formant peak (violin, cello, brass)
 *   wind   sine/triangle with breath noise and vibrato (笛子)
 *   chip   unfiltered pulse wave by duty cycle (NES/8-bit)
 */
const INSTRUMENTS = {
  // ---- 中国乐器 ----
  zheng: {
    synth: 'pluck', wave: 'triangle', attack: 0.0015, c0: 3600, c1: 520, bend: -0.5, decayScale: 0.9,
    // 古筝的泛音列比钢琴更亮、更不谐和
    partials: [{ wave: 'sine', octave: 12, gain: 0.40 }, { wave: 'sine', octave: 19, gain: 0.16 }, { wave: 'triangle', octave: 24, gain: 0.08 }],
  },
  dizi: {
    synth: 'wind', wave: 'sine', attack: 0.05, decayScale: 1.7, sustain: true,
    breath: 0.20, breathF: 2600, air: 0.05, vibrato: 5.6, vibratoDepth: 0.013, c0: 2600, c1: 2000, level: 0.85,
  },
  // ---- 西洋乐器 ----
  piano: {
    synth: 'struck', attack: 0.003, decayScale: 1.5, hammer: 0.09, hammerF: 3200,
    // 非谐泛音 + 高次泛音衰减更快：这是钢琴与拨弦最大的区别
    partials: [
      { octave: 0, gain: 1 }, { octave: 12, gain: 0.34 }, { octave: 19, gain: 0.20 },
      { octave: 24, gain: 0.10 }, { octave: 28, gain: 0.05 },
    ],
    c0: 2800, c1: 700,
  },
  violin: {
    synth: 'bowed', wave: 'sawtooth', attack: 0.075, decayScale: 1.8, sustain: true,
    bow: 0.09, bowF: 3000, vibrato: 5.8, vibratoDepth: 0.010, formant: 900, c0: 3200, c1: 2400, level: 0.9,
  },
  cello: {
    synth: 'bowed', wave: 'sawtooth', attack: 0.11, decayScale: 2.0, sustain: true,
    bow: 0.07, bowF: 1800, vibrato: 4.6, vibratoDepth: 0.008, formant: 520, c0: 1700, c1: 1300, level: 1.0,
  },
  brass: {
    synth: 'bowed', wave: 'sawtooth', attack: 0.055, decayScale: 1.9, sustain: false,
    bow: 0.02, bowF: 1500, vibrato: 5.2, vibratoDepth: 0.005, formant: 1200, c0: 2200, c1: 900, level: 1.4,
  },
  guitar: {
    synth: 'pluck', wave: 'triangle', attack: 0.004, c0: 2600, c1: 700, decayScale: 1.0,
    partials: [{ wave: 'sine', octave: 12, gain: 0.30 }, { wave: 'sine', octave: 19, gain: 0.12 }],
  },
  // ---- 打击与键盘 ----
  marimba: { synth: 'fm', ratio: 4, index: 1.6, attack: 0.003, decayScale: 0.8, level: 1.25 },
  bell: { synth: 'fm', ratio: 3.5, index: 1.4, attack: 0.006, decayScale: 2.6, level: 1.25 },
  ePiano: { synth: 'fm', ratio: 2, index: 1.1, attack: 0.004, decayScale: 1.6, level: 1.2 },
  // ---- 电子与 8-bit ----
  acid: { synth: 'pluck', wave: 'square', attack: 0.002, c0: 4200, c1: 900, decayScale: 0.6, q: 7 },
  stab: { synth: 'pluck', wave: 'sawtooth', attack: 0.001, c0: 5200, c1: 1400, decayScale: 0.35 },
  padSynth: { synth: 'pluck', wave: 'sawtooth', attack: 0.01, c0: 2000, c1: 800, decayScale: 1.2 },
  chipPulse: { synth: 'chip', duty: 0.25, attack: 0.001, decayScale: 0.55 },
  chipSquare: { synth: 'chip', duty: 0.5, attack: 0.001, decayScale: 0.65 },
  chipTri: { synth: 'chipTri', attack: 0.002, decayScale: 0.8 },
};

/**
 * One kit per mood: which instruments play, plus the drum design.
 *
 * `lead` is the melody line; `answer` is an optional second instrument that takes
 * every other melodic step, which is what turns a single line into an exchange
 * (古筝 问答 笛子) instead of the same timbre repeating.
 */
const KITS = {
  guofeng: {
    trim: 1.997, // 响度校准
    // 太鼓：鼓皮噪声为主
    kick: { f0: 96, f1: 52, sweep: 0.12, dur: 0.55, peak: 0.34, tone: 0.55, thump: 0.36, thumpDur: 0.10, thumpF0: 1400, thumpF1: 160, thumpType: 'bandpass', thumpQ: 0.8 },
    // 梆子：极短高 Q 木质
    snare: { kind: 'wood', type: 'bandpass', f0: 1700, q: 4.5, dur: 0.075, peak: 0.20, attack: 0.0008, body: 430, bodyLevel: 0.10, bodyDur: 0.07 },
    hat: { type: 'highpass', f0: 4600, dur: 0.05, peak: 0.07, attack: 0.004 },
    lead: 'zheng',
    answer: 'dizi',
    bass: { wave: 'sine', attack: 0.03, sustain: true, release: 0.16, level: 0.30, cutoff: 320 },
    pad: { voices: [{ wave: 'sine', detune: -5 }, { wave: 'triangle', detune: 5 }], attack: 0.65, sustain: true, release: 0.3, cutoff: 700, level: 0.18 },
    riser: { type: 'bandpass', f0: 500, f1: 5200, q: 2, peak: 0.24 },
    impact: { sub0: 92, sub1: 34, subDur: 0.9, crash: 2600, crashQ: 0.6, stab: 'triangle', stabPeak: 0.13 },
  },
  epic: {
    trim: 0.611, // 响度校准
    kick: { f0: 88, f1: 40, sweep: 0.20, dur: 0.80, peak: 0.44, tone: 0.85, thump: 0.26, thumpDur: 0.12, thumpF0: 1100, thumpF1: 120 },
    snare: { kind: 'noise', type: 'bandpass', f0: 2100, q: 1.1, dur: 0.19, peak: 0.26, attack: 0.001, body: 185, bodyWave: 'sine', bodyLevel: 0.20, bodyDur: 0.16 },
    hat: { type: 'highpass', f0: 6600, dur: 0.045, peak: 0.055, attack: 0.004 },
    // 弦乐群：小提琴 + 大提琴分解，而不是铜管主奏
    lead: 'violin',
    answer: 'cello',
    bass: { voices: [{ wave: 'sawtooth', detune: -7 }, { wave: 'sawtooth', detune: 0 }, { wave: 'sawtooth', detune: 7 }], attack: 0.09, sustain: true, release: 0.2, level: 0.26, cutoff: 900 },
    pad: { voices: [{ wave: 'sawtooth', detune: -10 }, { wave: 'sawtooth', detune: -3 }, { wave: 'sawtooth', detune: 3 }, { wave: 'sawtooth', detune: 10 }], attack: 0.4, sustain: true, release: 0.3, cutoff: 2100, level: 0.14 },
    riser: { type: 'bandpass', f0: 300, f1: 4500, q: 1.4, peak: 0.34 },
    impact: { sub0: 76, sub1: 30, subDur: 1.1, crash: 3000, crashQ: 0.5, stab: 'sawtooth', stabPeak: 0.17 },
  },
  synth: {
    trim: 4.377, // 响度校准
    kick: { f0: 182, f1: 42, sweep: 0.055, dur: 0.55, peak: 0.60, tone: 1, thump: 0.05, thumpDur: 0.02, thumpF0: 800, thumpF1: 90 },
    snare: { kind: 'noise', type: 'highpass', f0: 1500, q: 0.8, dur: 0.12, peak: 0.26, attack: 0.0008, body: 225, bodyLevel: 0.14, bodyDur: 0.08 },
    hat: { type: 'highpass', f0: 9200, dur: 0.03, peak: 0.10, attack: 0.0006 },
    lead: 'acid',
    bass: { wave: 'sawtooth', attack: 0.004, sustain: true, release: 0.08, level: 0.30, c0: 260, c1: 420, q: 9, resonant: true },
    pad: { voices: [{ wave: 'sawtooth', detune: -14 }, { wave: 'sawtooth', detune: 14 }], attack: 0.22, sustain: true, release: 0.25, cutoff: 1150, level: 0.13 },
    riser: { type: 'bandpass', f0: 600, f1: 7000, q: 4, peak: 0.30 },
    impact: { sub0: 84, sub1: 26, subDur: 0.95, crash: 4200, crashQ: 0.9, stab: 'square', stabPeak: 0.14 },
  },
  chiptune: {
    trim: 14.917, // 响度校准
    // NES 没有真正的底鼓：三角波快速下扫当鼓，是芯片音乐的标志手法
    kick: { f0: 220, f1: 48, sweep: 0.04, dur: 0.16, peak: 0.55, tone: 1, thump: 0.12, thumpDur: 0.015, thumpF0: 1200, thumpF1: 200, thumpType: 'highpass', wave: 'triangle' },
    // 噪声通道：短促、不做滤波塑形
    snare: { kind: 'noise', type: 'highpass', f0: 2400, q: 0.6, dur: 0.10, peak: 0.24, attack: 0.0004 },
    hat: { type: 'highpass', f0: 7000, dur: 0.025, peak: 0.11, attack: 0.0004 },
    lead: 'chipPulse',
    answer: 'chipSquare',
    arpeggio: true,
    // 三角波贝斯：NES 三个音源之一
    bass: { wave: 'triangle', attack: 0.002, sustain: true, release: 0.04, level: 0.34, cutoff: 2400 },
    pad: null,
    riser: { type: 'highpass', f0: 2000, f1: 8000, q: 1, peak: 0.22 },
    impact: { sub0: 120, sub1: 40, subDur: 0.4, crash: 5200, crashQ: 1.1, stab: 'square', stabPeak: 0.16 },
  },
  pulse: {
    trim: 6.709, // 响度校准
    kick: { f0: 205, f1: 52, sweep: 0.05, dur: 0.26, peak: 0.62, tone: 1, thump: 0.09, thumpDur: 0.02, thumpF0: 900, thumpF1: 100 },
    snare: { kind: 'clap', type: 'bandpass', f0: 1800, q: 1.5, peak: 0.24 },
    hat: { type: 'highpass', f0: 8600, dur: 0.028, peak: 0.10, attack: 0.0006 },
    lead: 'stab',
    answer: 'padSynth',
    bass: { wave: 'square', attack: 0.004, sustain: true, release: 0.06, level: 0.30, cutoff: 760 },
    pad: { voices: [{ wave: 'square', detune: -8 }, { wave: 'sawtooth', detune: 8 }], attack: 0.18, sustain: true, release: 0.2, cutoff: 2600, level: 0.09 },
    riser: { type: 'bandpass', f0: 700, f1: 6500, q: 3, peak: 0.30 },
    impact: { sub0: 88, sub1: 28, subDur: 0.8, crash: 3800, crashQ: 0.8, stab: 'sawtooth', stabPeak: 0.15 },
  },
  bright: {
    trim: 8.116, // 响度校准
    kick: { f0: 150, f1: 72, sweep: 0.04, dur: 0.17, peak: 0.26, tone: 0.5, thump: 0.30, thumpDur: 0.04, thumpF0: 1800, thumpF1: 300, thumpType: 'bandpass', thumpQ: 0.9 },
    snare: { kind: 'wood', type: 'bandpass', f0: 2500, q: 4, dur: 0.055, peak: 0.20, attack: 0.0006, body: 620, bodyLevel: 0.09, bodyDur: 0.05 },
    hat: { type: 'highpass', f0: 6200, dur: 0.06, peak: 0.085, attack: 0.006 },
    // 马林巴主奏，钢琴应答
    lead: 'marimba',
    answer: 'piano',
    bass: { wave: 'sine', attack: 0.008, sustain: true, release: 0.08, level: 0.28, cutoff: 500 },
    pad: { voices: [{ wave: 'triangle', detune: -7 }, { wave: 'sine', detune: 7 }], attack: 0.28, sustain: true, release: 0.2, cutoff: 3200, level: 0.12 },
    riser: { type: 'bandpass', f0: 900, f1: 6000, q: 2.5, peak: 0.22 },
    impact: { sub0: 96, sub1: 40, subDur: 0.6, crash: 4600, crashQ: 0.9, stab: 'sine', stabPeak: 0.12 },
  },
  ambient: {
    trim: 1.742, // 响度校准
    // 完全不敲鼓
    kick: null,
    snare: null,
    hat: null,
    lead: 'bell',
    answer: 'ePiano',
    bass: { wave: 'sine', attack: 0.5, sustain: true, release: 0.5, level: 0.26, cutoff: 240 },
    pad: { voices: [{ wave: 'sine', detune: -12 }, { wave: 'triangle', detune: -2 }, { wave: 'triangle', detune: 2 }, { wave: 'sine', detune: 12 }], attack: 0.9, sustain: true, release: 0.5, cutoff: 560, level: 0.18 },
    riser: { type: 'bandpass', f0: 200, f1: 3000, q: 1.2, peak: 0.18 },
    impact: { sub0: 64, sub1: 26, subDur: 1.6, crash: 1800, crashQ: 0.4, stab: 'sine', stabPeak: 0.10 },
  },
  cinematic: {
    trim: 1.994, // 响度校准
    kick: { f0: 122, f1: 45, sweep: 0.14, dur: 0.55, peak: 0.42, tone: 0.9, thump: 0.18, thumpDur: 0.07, thumpF0: 1000, thumpF1: 120 },
    snare: { kind: 'noise', type: 'bandpass', f0: 2000, q: 1.0, dur: 0.15, peak: 0.24, attack: 0.001, body: 200, bodyWave: 'triangle', bodyLevel: 0.15, bodyDur: 0.1 },
    hat: { type: 'highpass', f0: 6800, dur: 0.04, peak: 0.07, attack: 0.003 },
    // 钢琴主奏，小提琴应答
    lead: 'piano',
    answer: 'violin',
    bass: { voices: [{ wave: 'triangle', detune: -4 }, { wave: 'sine', detune: 4 }], attack: 0.02, sustain: true, release: 0.12, level: 0.30, cutoff: 600 },
    pad: { voices: [{ wave: 'sawtooth', detune: -8 }, { wave: 'sawtooth', detune: 0 }, { wave: 'sawtooth', detune: 8 }], attack: 0.5, sustain: true, release: 0.3, cutoff: 1350, level: 0.14 },
    riser: { type: 'bandpass', f0: 400, f1: 5000, q: 2, peak: 0.28 },
    impact: { sub0: 80, sub1: 28, subDur: 0.95, crash: 3400, crashQ: 0.7, stab: 'triangle', stabPeak: 0.14 },
  },
};

/** Unknown ids (including `auto` and the retired `lofi`) keep a distinct default. */
function kitFor(mood) {
  return KITS[mood] || KITS.cinematic;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function midiToHz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function createNoiseBuffer(ctx, seconds, rng) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = rng() * 2 - 1;
  return buf;
}

function createReverbBuffer(ctx, seconds, decay, rng) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = (rng() * 2 - 1) * (1 - i / len) ** decay;
  }
  return buf;
}

/**
 * Turn the free-form music description into synthesis parameters.
 *
 * Both Chinese and English words are matched, because the description is whatever the
 * Agent wrote for this clip rather than a fixed preset id.
 */
function analyzePrompt(promptOrId) {
  const text = String(promptOrId || '').toLowerCase();
  const has = (...words) => words.some((w) => text.includes(w));

  if (has('国风', '水墨', '中国风', '古', '山水', '禅', 'guofeng', 'chinese', 'ink')) {
    return {
      mood: 'guofeng', scale: SCALES.pentatonic, root: 52, bpm: 88,
      chords: [0, 3, 4, 1, 0, 4], wave: 'triangle', pluckDecay: 0.9,
      groove: 'sparse', reverbWet: 0.42, cutoff: 2400, impact: 0.85,
    };
  }
  if (has('史诗', '宏大', '震撼', '大片', '战争', '英雄', 'epic', 'cinematic', 'trailer')) {
    return {
      mood: 'epic', scale: SCALES.minor, root: 41, bpm: 80,
      chords: [0, 5, 3, 4], wave: 'sawtooth', pluckDecay: 0.45,
      groove: 'backbeat', reverbWet: 0.38, cutoff: 1600, impact: 1.0,
    };
  }
  if (has('赛博', '科技', '未来', 'crt', '故障', 'synth', 'cyber', 'electronic', 'techno')) {
    return {
      mood: 'synth', scale: SCALES.minor, root: 43, bpm: 124,
      chords: [0, 3, 5, 2], wave: 'sawtooth', pluckDecay: 0.3,
      groove: 'four', reverbWet: 0.24, cutoff: 2800, impact: 0.92,
    };
  }
  if (has('轻快', '活泼', '卡通', '趣味', '明快', 'bright', 'playful', 'happy')) {
    return {
      mood: 'bright', scale: SCALES.major, root: 48, bpm: 116,
      chords: [0, 4, 5, 3], wave: 'sine', pluckDecay: 0.35,
      groove: 'backbeat', reverbWet: 0.2, cutoff: 3200, impact: 0.7,
    };
  }
  if (has('快', '脉冲', '燃', '节奏', '紧张', 'pulse', 'drive', 'energy', 'fast')) {
    return {
      mood: 'pulse', scale: SCALES.dorian, root: 45, bpm: 128,
      chords: [0, 2, 3, 0], wave: 'sawtooth', pluckDecay: 0.25,
      groove: 'four', reverbWet: 0.18, cutoff: 2200, impact: 0.9,
    };
  }
  if (has('8bit', '8-bit', '芯片', '红白机', 'fc', 'nes', 'chiptune', '像素游戏', 'gameboy', 'gb')) {
    return {
      mood: 'chiptune', scale: SCALES.major, root: 60, bpm: 150,
      chords: [0, 4, 5, 3], wave: 'square', pluckDecay: 0.16,
      groove: 'backbeat', reverbWet: 0.12, cutoff: 6000, impact: 0.7,
    };
  }
  if (has('氛围', '静谧', '空灵', '孤独', 'ambient', 'calm', 'drone', 'space')) {
    return {
      mood: 'ambient', scale: SCALES.minorPent, root: 45, bpm: 72,
      chords: [0, 5, 3, 4], wave: 'sine', pluckDecay: 0.8,
      groove: 'sparse', reverbWet: 0.5, cutoff: 1200, impact: 0.6,
    };
  }
  return {
    mood: 'cinematic', scale: SCALES.minorPent, root: 45, bpm: 96,
    chords: [0, 3, 4, 2], wave: 'triangle', pluckDecay: 0.45,
    groove: 'backbeat', reverbWet: 0.34, cutoff: 2000, impact: 0.88,
  };
}

/**
 * Choose the beat period whose bar lines land on the clip's cuts.
 *
 * Every cut is a musical arrival, so it should fall on a downbeat. Candidate tempos are
 * scored by the mean distance between each cut and the nearest bar line, with a small
 * preference for the mood's intended tempo when two candidates fit equally well.
 *
 * @param cuts - cut times in seconds.
 * @param duration - clip length.
 * @param hintedBpm - the mood's tempo, used to break ties and when there are no cuts.
 * @returns `{ beat, bar, bpm, fit }` where `fit` is 1 for a perfect alignment.
 */
function fitGroove(cuts, duration, hintedBpm) {
  const target = Number(hintedBpm) || 96;
  const usable = (Array.isArray(cuts) ? cuts : [])
    .map(Number)
    .filter((t) => Number.isFinite(t) && t > 0.15 && t < duration - 0.1);

  if (!usable.length) {
    const beat = 60 / target;
    return { beat, bar: beat * 4, bpm: target, fit: 0 };
  }

  let best = null;
  for (let bpm = 60; bpm <= 190; bpm += 1) {
    const beat = 60 / bpm;
    const bar = beat * 4;
    // A bar shorter than ~0.35s has no room for a groove; longer than 3s drags.
    if (bar < 0.35 || bar > 3) continue;

    let err = 0;
    for (const t of usable) {
      const k = t / bar;
      err += Math.abs(k - Math.round(k));
    }
    err /= usable.length;

    // Ties go to the tempo the mood asked for, so a well-fitting clip keeps its feel.
    const comfort = Math.abs(bpm - target) / (target * 8);
    const score = err * 6 + comfort;
    if (!best || score < best.score) best = { beat, bar, bpm, err, score };
  }

  if (!best) {
    const beat = 60 / target;
    return { beat, bar: beat * 4, bpm: target, fit: 0 };
  }
  return { beat: best.beat, bar: best.bar, bpm: best.bpm, fit: Math.max(0, 1 - best.err * 4) };
}

/**
 * Synthesise a score tailored to one clip.
 *
 * @param musicPromptOrPreset - free-form description (or a legacy preset id).
 * @param options - `{ duration, cuts, cues, seed, sampleRate }`. `cuts` are storyboard
 *   edits; `cues` are in-shot visual peaks. Both get a hit, sample-accurately.
 */
async function renderMusic(musicPromptOrPreset, options = {}) {
  const duration = Math.max(0.5, Number(options.duration) || 8);
  const sampleRate = Number(options.sampleRate) || 44100;
  const seed = Number(options.seed) || 20261103;
  const rng = mulberry32(seed);
  const spec = analyzePrompt(musicPromptOrPreset);
  // The instrument set for this mood; every voice below reads from it.
  const K = kitFor(spec.mood);

  // Collect every moment the picture needs an accent on.
  const rawCuts = Array.isArray(options.cuts) ? options.cuts : [];
  const rawCues = Array.isArray(options.cues) ? options.cues : [];
  const allCues = [];

  for (const c of rawCuts) {
    const t = Number(c);
    if (Number.isFinite(t) && t > 0.05 && t < duration - 0.05) {
      allCues.push({ time: t, type: 'cut', power: 1 });
    }
  }
  for (const cue of rawCues) {
    const t = typeof cue === 'number' ? cue : Number(cue.time ?? cue.t);
    if (Number.isFinite(t) && t > 0.05 && t < duration - 0.05) {
      allCues.push({
        time: t,
        type: (cue && cue.type) || 'hit',
        power: (cue && Number(cue.power)) || 0.75,
      });
    }
  }

  allCues.sort((a, b) => a.time - b.time);
  const cues = [];
  for (const c of allCues) {
    if (!cues.some((prev) => Math.abs(prev.time - c.time) < 0.07)) cues.push(c);
  }

  const totalFrames = Math.ceil(duration * sampleRate);
  const ctx = new OfflineAudioContext(2, totalFrames, sampleRate);

  // ---- master chain: headroom, glue, then a hard ceiling so impacts never clip ----
  const master = ctx.createGain();
  master.gain.value = 0.6;

  const glue = ctx.createDynamicsCompressor();
  glue.threshold.value = -16;
  glue.knee.value = 8;
  glue.ratio.value = 4;
  glue.attack.value = 0.004;
  glue.release.value = 0.18;

  const ceiling = ctx.createDynamicsCompressor();
  ceiling.threshold.value = -3;
  ceiling.knee.value = 0;
  ceiling.ratio.value = 20;
  ceiling.attack.value = 0.001;
  ceiling.release.value = 0.08;

  // A soft ceiling of last resort. The two compressors above shape the mix, but they
  // are dynamics processors, not limiters: a bright 8-bit arpeggio at full level can
  // still overshoot. tanh keeps that from clipping on the way out.
  const softClip = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i += 1) {
    const x = (i / (curve.length - 1)) * 2 - 1;
    curve[i] = Math.tanh(x * 1.35);
  }
  softClip.curve = curve;

  master.connect(glue);
  glue.connect(ceiling);
  ceiling.connect(softClip);
  softClip.connect(ctx.destination);

  const verb = ctx.createConvolver();
  verb.buffer = createReverbBuffer(ctx, Math.min(2.4, duration * 0.8), 2.2, rng);
  const wet = ctx.createGain();
  wet.gain.value = spec.reverbWet;
  verb.connect(wet);
  // `wet` joins the kit bus below, not `master`: routing the reverb past the trim let
  // a wet preset (氛围 uses 0.5) ignore its own loudness calibration.

  const fade = ctx.createGain();
  fade.gain.setValueAtTime(0.0001, 0);
  fade.gain.linearRampToValueAtTime(1, Math.min(0.15, duration * 0.04));
  // This only removes the tail click. The ending itself is a cadence written by the
  // arrangement below, so the last chord rings instead of being faded out mid-loop.
  fade.gain.setValueAtTime(1, Math.max(0.15, duration - 0.06));
  fade.gain.linearRampToValueAtTime(0.0001, duration);
  fade.connect(master);

  const { beat, bar, bpm, fit } = fitGroove(rawCuts, duration, spec.bpm);

  /**
   * The bed bus carries the groove. Cue impacts connect past it to `kitBus`, so when
   * the bed ducks the hit is exposed rather than masked.
   *
   * `kitBus` is the per-kit trim: instruments differ in loudness by more than 20 dB
   * (a bowed string ensemble against a bare pulse wave), so each kit carries one
   * calibration gain instead of every voice guessing its own level.
   */
  const kitBus = ctx.createGain();
  kitBus.gain.value = K.trim ?? 1;
  kitBus.connect(fade);
  wet.connect(kitBus);

  const bed = ctx.createGain();
  bed.gain.value = 1;
  bed.connect(kitBus);

  const scale = SCALES[spec.scale] || SCALES.minorPent;

  const noiseBuf = createNoiseBuffer(ctx, 1.5, rng);
  const hatsBuf = createNoiseBuffer(ctx, 0.2, rng);

  // ---- voices ----------------------------------------------------------------
  //
  // Each voice is a thin wrapper over a primitive, and the primitive reads its
  // parameters from the mood's kit. The call signatures stay as they were, so the
  // arrangement and ending code above is unchanged.

  /** Filtered noise burst: snare, clap, hat, shaker, woodblock, cymbal. */
  const noiseBurst = (t, power, dest, k, overrides) => {
    const cfg = overrides ? { ...k, ...overrides } : k;
    const src = ctx.createBufferSource();
    src.buffer = hatsBuf;
    const f = ctx.createBiquadFilter();
    f.type = cfg.type || 'bandpass';
    f.frequency.setValueAtTime(cfg.f0, t);
    if (cfg.f1) f.frequency.exponentialRampToValueAtTime(cfg.f1, t + cfg.dur);
    f.Q.value = cfg.q ?? 1;
    const g = ctx.createGain();
    const attack = cfg.attack ?? 0.001;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(cfg.peak * power, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + cfg.dur);
    src.connect(f);
    f.connect(g);
    g.connect(dest);
    if (cfg.verb) g.connect(verb);
    src.start(t);
    src.stop(t + cfg.dur + 0.03);
  };

  /**
   * Drum: 808/909 kick, taiko, timpani, tom, or a soft brush thump.
   *
   * `tone` and `thump` set the balance between the pitched body and the skin noise.
   * Every kit used to be a bare sine sweep, which is the single most "electronic"
   * thing in the score; a frame drum is mostly noise over a short low tone, while an
   * 808 is almost pure tone.
   */
  const playKick = (t, power, dest) => {
    const k = K.kick;
    if (!k) return;
    if (k.tone !== 0) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(k.f0, t);
      osc.frequency.exponentialRampToValueAtTime(k.f1, t + k.sweep);
      const g = ctx.createGain();
      g.gain.setValueAtTime(k.peak * (k.tone ?? 1) * power, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + k.dur);
      osc.connect(g);
      g.connect(dest);
      osc.start(t);
      osc.stop(t + k.dur + 0.02);
    }
    // The skin: noise the pitched body alone cannot give.
    if (k.thump > 0) {
      noiseBurst(t, k.thump * power, dest, {
        type: k.thumpType || 'lowpass',
        f0: k.thumpF0 ?? 900, f1: k.thumpF1 ?? 110,
        dur: k.thumpDur || 0.05, q: k.thumpQ ?? 0.7, peak: 1, attack: 0.0005,
      });
    }
  };

  const playSnare = (t, power, dest) => {
    const k = K.snare;
    if (!k) return;
    if (k.kind === 'clap') {
      // A clap is three very short bursts, not one long noise hit.
      for (let i = 0; i < 3; i++) {
        noiseBurst(t + i * 0.011, power * (1 - i * 0.16), dest, k, { dur: 0.05 + i * 0.02, attack: 0.0005 });
      }
      return;
    }
    noiseBurst(t, power, dest, k);
    if (k.body) {
      // A body tone under the noise so the hit reads on small speakers too.
      const body = ctx.createOscillator();
      body.type = k.bodyWave || 'triangle';
      body.frequency.setValueAtTime(k.body, t);
      body.frequency.exponentialRampToValueAtTime(k.body * 0.72, t + 0.07);
      const bg = ctx.createGain();
      bg.gain.setValueAtTime(k.bodyLevel * power, t);
      bg.gain.exponentialRampToValueAtTime(0.0001, t + (k.bodyDur ?? 0.1));
      body.connect(bg);
      bg.connect(dest);
      body.start(t);
      body.stop(t + (k.bodyDur ?? 0.1) + 0.03);
    }
  };

  const playHat = (t, power, dest, open = false) => {
    const k = K.hat;
    if (!k) return;
    noiseBurst(t, power, dest, k, open ? { dur: Math.max(k.dur, 0.16) } : undefined);
  };

  /**
   * General tonal voice: bass, pad, strings, brass.
   *
   * One oscillator per entry in `voices`, so a preset can stack detuned layers for a
   * string ensemble instead of the single sine every preset used to get.
   */
  const tonal = (midi, t, length, level, dest, k) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    if (k.c1) {
      lp.frequency.setValueAtTime(k.c0 ?? k.cutoff ?? 2000, t);
      lp.frequency.exponentialRampToValueAtTime(k.c1, t + Math.min(length, 0.5));
    } else {
      lp.frequency.value = k.cutoff ?? 2000;
    }
    if (k.q) lp.Q.value = k.q;

    const g = ctx.createGain();
    const attack = k.attack ?? 0.01;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    if (k.sustain) {
      const release = k.release ?? 0.12;
      g.gain.setValueAtTime(level, Math.max(t + attack, t + length - release));
      g.gain.linearRampToValueAtTime(0.0001, t + length);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    }

    for (const v of (k.voices || [{ wave: k.wave || 'sine', detune: 0 }])) {
      const osc = ctx.createOscillator();
      osc.type = v.wave;
      osc.detune.value = v.detune || 0;
      osc.frequency.setValueAtTime(midiToHz(midi), t);
      if (k.vibrato) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = k.vibrato;
        const lg = ctx.createGain();
        lg.gain.value = midiToHz(midi) * 0.008;
        lfo.connect(lg);
        lg.connect(osc.frequency);
        lfo.start(t);
        lfo.stop(t + length + 0.05);
      }
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + length + 0.04);
    }
    lp.connect(g);
    g.connect(dest);
    if (k.verb !== false) g.connect(verb);
  };

  /** FM voice: marimba, bell. Two oscillators give a struck, inharmonic attack. */
  const fmVoice = (midi, t, dur, level, dest, k) => {
    const hz = midiToHz(midi);
    const car = ctx.createOscillator();
    car.type = 'sine';
    car.frequency.value = hz;
    const mod = ctx.createOscillator();
    mod.type = 'sine';
    mod.frequency.value = hz * (k.ratio ?? 2);
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(hz * (k.index ?? 1.5), t);
    mg.gain.exponentialRampToValueAtTime(hz * 0.02, t + dur * 0.6);
    mod.connect(mg);
    mg.connect(car.frequency);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + (k.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    car.connect(g);
    g.connect(dest);
    if (k.verb !== false) g.connect(verb);
    car.start(t);
    car.stop(t + dur + 0.03);
    mod.start(t);
    mod.stop(t + dur + 0.03);
  };

  const playBass = (midi, t, length, power) => {
    tonal(midi, t, length, (K.bass.level ?? 0.32) * power, bed, K.bass);
  };

  /** NES-style pulse wave; `duty` sets the harmonic content (0.125/0.25/0.5). */
  const pulseWave = (duty) => {
    const size = 32;
    const real = new Float32Array(size);
    const imag = new Float32Array(size);
    for (let k = 1; k < size; k += 1) imag[k] = (2 / (k * Math.PI)) * Math.sin(Math.PI * k * duty);
    return ctx.createPeriodicWave(real, imag);
  };
  const pulseCache = new Map();

  /** Filtered noise used as a breath, bow or hammer transient. */
  const transient = (t, dur, level, kind, freq, q = 1) => {
    const src = ctx.createBufferSource();
    src.buffer = hatsBuf;
    const f = ctx.createBiquadFilter();
    f.type = kind;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + Math.min(0.006, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bed);
    src.start(t);
    src.stop(t + dur + 0.02);
  };

  /** Vibrato on one oscillator, in cents relative to its own pitch. */
  const applyVibrato = (osc, t, dur, rate, depth) => {
    if (!rate) return;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const g = ctx.createGain();
    g.gain.value = midiToHz(60) * depth * 12;
    lfo.connect(g);
    g.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);
  };

  /** Additive stack with faster decay on higher partials — a struck string. */
  const struckVoice = (midi, t, dur, level, k) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(k.c0 ?? 2800, t);
    lp.frequency.exponentialRampToValueAtTime(k.c1 ?? 700, t + dur);
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, t);
    out.gain.linearRampToValueAtTime(level, t + (k.attack ?? 0.003));
    out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    for (const part of (k.partials || [{ octave: 0, gain: 1 }])) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(midiToHz(midi + part.octave), t);
      // Upper partials die first; that two-stage decay is what reads as "piano".
      const pg = ctx.createGain();
      const partialDur = part.octave === 0 ? dur : dur * Math.max(0.25, 1 - part.octave / 40);
      pg.gain.setValueAtTime(0.0001, t);
      pg.gain.linearRampToValueAtTime(part.gain, t + (k.attack ?? 0.003));
      pg.gain.exponentialRampToValueAtTime(0.0001, t + partialDur);
      osc.connect(pg);
      pg.connect(lp);
      osc.start(t);
      osc.stop(t + partialDur + 0.03);
    }
    if (k.hammer) transient(t, 0.03, k.hammer * level, 'highpass', k.hammerF ?? 3200);
    lp.connect(out);
    out.connect(bed);
    out.connect(verb);
  };

  /** Bowed string: saw with bow noise, vibrato and a formant peak. */
  const bowedVoice = (midi, t, dur, level, k) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(k.c0 ?? 3000, t);
    if (k.sustain) lp.frequency.linearRampToValueAtTime(k.c1 ?? 2000, t + Math.min(0.3, dur));
    else lp.frequency.exponentialRampToValueAtTime(k.c1 ?? 900, t + dur);
    const peak = ctx.createBiquadFilter();
    peak.type = 'peaking';
    peak.frequency.value = k.formant ?? 900;
    peak.Q.value = 1.1;
    peak.gain.value = 7;
    const g = ctx.createGain();
    const attack = k.attack ?? 0.07;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    if (k.sustain) {
      g.gain.setValueAtTime(level, Math.max(t + attack, t + dur - 0.12));
      g.gain.linearRampToValueAtTime(0.0001, t + dur);
    } else {
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    }
    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = k.wave || 'sawtooth';
      osc.detune.value = detune;
      osc.frequency.setValueAtTime(midiToHz(midi), t);
      applyVibrato(osc, t, dur, k.vibrato, k.vibratoDepth ?? 0.008);
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + dur + 0.04);
    }
    if (k.bow) transient(t, 0.05, k.bow * level, 'bandpass', k.bowF ?? 2600, 0.8);
    lp.connect(peak);
    peak.connect(g);
    g.connect(bed);
    g.connect(verb);
  };

  /** 笛子: a hollow tone plus breath noise, with vibrato on the held part. */
  const windVoice = (midi, t, dur, level, k) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(k.c0 ?? 2400, t);
    if (k.sustain) lp.frequency.linearRampToValueAtTime(k.c1 ?? 1800, t + Math.min(0.4, dur));
    const g = ctx.createGain();
    const attack = k.attack ?? 0.05;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, Math.max(t + attack, t + dur - 0.1));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    // A flute is nearly a sine; its character lives in the breath and the vibrato.
    const osc = ctx.createOscillator();
    osc.type = k.wave || 'sine';
    osc.frequency.setValueAtTime(midiToHz(midi), t);
    applyVibrato(osc, t, dur, k.vibrato, k.vibratoDepth ?? 0.012);
    const wobble = ctx.createOscillator();
    wobble.type = 'triangle';
    wobble.frequency.setValueAtTime(midiToHz(midi + 12), t);
    const wg = ctx.createGain();
    wg.gain.value = 0.18;
    wobble.connect(wg);
    wg.connect(lp);
    osc.connect(lp);
    osc.start(t);
    osc.stop(t + dur + 0.04);
    wobble.start(t);
    wobble.stop(t + dur + 0.04);
    if (k.breath) transient(t, 0.09, k.breath * level, 'bandpass', k.breathF ?? 2600, 0.7);
    if (k.air) transient(t + 0.06, Math.max(0.1, dur - 0.06), k.air * level, 'highpass', 3600);
    lp.connect(g);
    g.connect(bed);
    g.connect(verb);
  };

  /** Unfiltered pulse/triangle: the 8-bit voice. Nothing shapes it but its envelope. */
  const chipVoice = (midi, t, dur, level, k) => {
    const osc = ctx.createOscillator();
    if (k.synth === 'chipTri') {
      osc.type = 'triangle';
    } else {
      const duty = k.duty ?? 0.5;
      if (!pulseCache.has(duty)) pulseCache.set(duty, pulseWave(duty));
      osc.setPeriodicWave(pulseCache.get(duty));
    }
    osc.frequency.setValueAtTime(midiToHz(midi), t);
    const g = ctx.createGain();
    const attack = k.attack ?? 0.001;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(level, t + attack);
    g.gain.setValueAtTime(level, Math.max(t + attack, t + dur - 0.02));
    g.gain.linearRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    // A touch of the room keeps it from sounding like a bare test tone.
    g.connect(bed);
    g.connect(verb);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  };

  /** Dispatch one melodic note to whichever instrument the kit names. */
  const playInstrument = (name, midi, t, vol, decay) => {
    const k = INSTRUMENTS[name] || INSTRUMENTS.piano;
    const dur = Math.max(0.08, decay * (k.decayScale ?? 1));
    const level = vol * (k.level ?? 1);
    switch (k.synth) {
      case 'fm': fmVoice(midi, t, dur, level, bed, k); break;
      case 'struck': struckVoice(midi, t, dur, level, k); break;
      case 'bowed': bowedVoice(midi, t, dur, level, k); break;
      case 'wind': windVoice(midi, t, dur, level, k); break;
      case 'chip':
      case 'chipTri': chipVoice(midi, t, dur, level, k); break;
      default: {
        // Struck/plucked string: fast attack, exponential decay, filter sweep, and a
        // stack of partials; `q` gives a synth stab its resonant onset.
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(k.c0 ?? spec.cutoff, t);
        lp.frequency.exponentialRampToValueAtTime(k.c1 ?? 420, t + dur);
        if (k.q) lp.Q.value = k.q;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.linearRampToValueAtTime(level, t + (k.attack ?? 0.005));
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        const layers = [{ wave: k.wave || spec.wave, gain: 1 }];
        for (const part of (k.partials || [])) layers.push(part);
        for (const layer of layers) {
          const osc = ctx.createOscillator();
          osc.type = layer.wave;
          osc.frequency.setValueAtTime(midiToHz(midi + (layer.octave || 0)), t);
          if (k.bend) osc.frequency.exponentialRampToValueAtTime(midiToHz(midi + (layer.octave || 0) + k.bend), t + Math.min(0.25, dur));
          const lg = ctx.createGain();
          lg.gain.value = layer.gain;
          osc.connect(lg);
          lg.connect(lp);
          osc.start(t);
          osc.stop(t + dur + 0.04);
        }
        lp.connect(g);
        g.connect(bed);
        g.connect(verb);
      }
    }
  };

  /** The kit's melody line; `answer` alternates with it for a call-and-response. */
  const playPluck = (midi, t, vol, decay, useAnswer) => {
    const name = useAnswer && K.answer ? K.answer : K.lead;
    playInstrument(name, midi, t, vol, decay);
  };

  const playPad = (midi, t, length, vol) => {
    const k = K.pad;
    if (!k) return;
    const attack = Math.min(k.attack ?? 0.35, length * 0.4);
    tonal(midi, t, length, vol * (k.level ?? 1), bed, { ...k, attack });
  };

  const playRiser = (targetT, power) => {
    const k = K.riser || { type: 'bandpass', f0: 400, f1: 6000, q: 3, peak: 0.3 };
    const lead = Math.min(0.4, targetT);
    if (lead < 0.12) return;
    const startT = targetT - lead;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = k.type;
    bp.Q.value = k.q;
    bp.frequency.setValueAtTime(k.f0, startT);
    bp.frequency.exponentialRampToValueAtTime(k.f1, targetT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, startT);
    g.gain.linearRampToValueAtTime(k.peak * power, targetT - 0.02);
    g.gain.linearRampToValueAtTime(0.0001, targetT);
    src.connect(bp);
    bp.connect(g);
    g.connect(bed);
    src.start(startT);
    src.stop(targetT + 0.03);
  };

  /** The cut accent: sub boom + noise crash + an in-key chord stab. */
  const playImpact = (t, power, rootMidi) => {
    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(72, t);
    sub.frequency.exponentialRampToValueAtTime(28, t + 0.6);
    const sg = ctx.createGain();
    sg.gain.setValueAtTime(0.42 * power, t);
    sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
    sub.connect(sg);
    sg.connect(kitBus);
    sub.start(t);
    sub.stop(t + 0.8);

    playKick(t, 1.1 * power, kitBus);

    // The crash bright and length come from the kit too: a gong for 国风, a bright
    // metal crash for 赛博, a soft wash for 氛围.
    const crash = ctx.createBufferSource();
    crash.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = K.impact.crash;
    bp.Q.value = K.impact.crashQ;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.3 * power, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    crash.connect(bp);
    bp.connect(cg);
    cg.connect(kitBus);
    cg.connect(verb);
    crash.start(t);
    crash.stop(t + 1);

    // A stab makes the hit harmonic instead of a bare boom.
    const stabNotes = [0, 7, 12];
    for (const off of stabNotes) {
      const osc = ctx.createOscillator();
      osc.type = K.impact.stab;
      osc.frequency.value = midiToHz(rootMidi + off);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(K.impact.stabPeak * power, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g);
      g.connect(kitBus);
      g.connect(verb);
      osc.start(t);
      osc.stop(t + 0.55);
    }
  };

  // ---- sidechain: the bed ducks under every cue ----
  bed.gain.setValueAtTime(1, 0);
  for (const cue of cues) {
    const from = Math.max(0, cue.time - 0.1);
    const depth = 0.2 + (1 - Math.min(1, cue.power)) * 0.28;
    bed.gain.setValueAtTime(1, from);
    bed.gain.linearRampToValueAtTime(depth, cue.time);
    bed.gain.setValueAtTime(depth, cue.time + 0.045);
    bed.gain.linearRampToValueAtTime(1, Math.min(duration, cue.time + 0.2));
  }

  // ---- arrangement: bars of real groove, with a lead-in and a written ending ----
  //
  // The clip is not "N copies of one bar". A three-part shape is imposed instead:
  // the first bar thins out as a lead-in, the middle bars rotate through the pattern
  // variants so no two consecutive bars are identical, and the last bar stops the
  // groove and resolves on the tonic. Previously every bar repeated one hardcoded
  // pattern and the piece simply faded, which read as the same loop cut off.
  const totalBars = Math.max(1, Math.ceil(duration / bar));
  const cueTimes = new Set(cues.map((c) => c.time.toFixed(2)));
  const isCueAt = (t) => cueTimes.has(t.toFixed(2));

  const variants = GROOVE_PATTERNS[spec.groove] || GROOVE_PATTERNS.backbeat;
  const endingBar = totalBars - 1;
  const endingT = endingBar * bar;
  // Only spend a bar on a lead-in when the clip is long enough to afford one.
  const hasIntro = totalBars >= 3;
  const tonic = spec.root + (scale[spec.chords[0] % scale.length] || 0);

  for (let b = 0; b < totalBars; b++) {
    const barT = b * bar;
    if (barT >= duration) break;
    const isEnding = b === endingBar;
    const isIntro = hasIntro && b === 0;
    const barLen = Math.min(bar, duration - barT);
    const stepDur = bar / 16;
    const chordIdx = spec.chords[b % spec.chords.length];
    const rootNote = spec.root + (scale[chordIdx % scale.length] || 0);

    if (isEnding) {
      // Hold the tonic under the cadence for as long as the clip still has room.
      const ring = Math.max(0.4, duration - barT);
      playPad(tonic, barT, ring, 0.2);
      playBass(tonic - 12, barT, ring, 0.95);
    } else {
      // A final bar usually gets cut short; only start a pad the bar can hold.
      if (barLen > beat * 1.2) playPad(rootNote, barT, barLen, isIntro ? 0.12 : 0.16);
      playBass(rootNote - 12, barT, Math.min(beat * 1.8, barLen), isIntro ? 0.7 : 0.9);
    }

    const pattern = variants[b % variants.length];
    for (let s = 0; s < 16; s++) {
      const t = barT + s * stepDur;
      if (t >= duration - 0.02) break;
      if (isCueAt(t)) continue; // the impact covers this step

      if (isEnding) {
        // One downbeat, then silence so the resolution is heard rather than filled.
        if (s === 0) playKick(t, 1, bed);
        continue;
      }
      if (isIntro) {
        // Thin lead-in: a soft pulse and one open hat, no full groove yet.
        if (s === 0) playKick(t, 0.55, bed);
        if (s === 8) playHat(t, 0.3, bed, true);
        continue;
      }

      const mark = pattern[s] || '.';
      if (mark === 'K') playKick(t, 1, bed);
      else if (mark === 'k') playKick(t, 0.7, bed);
      else if (mark === 'X') { playKick(t, 1, bed); playSnare(t, 0.8, bed); }
      else if (mark === 'S') playSnare(t, 0.88, bed);
      else if (mark === 'H') playHat(t, 0.7, bed, false);
      else if (mark === 'h') playHat(t, 0.45, bed, false);
      else if (mark === 'o') playHat(t, 0.6, bed, true);
    }

    // Melodic movement, rotated per bar so the phrase does not repeat verbatim.
    if (!isEnding) {
      const steps = isIntro ? [0] : [0, 6 + (b % 2) * 2, 10];
      steps.forEach((s, stepIndex) => {
        const t = barT + s * stepDur;
        if (t >= duration - 0.05) return;
        if (isCueAt(t)) return;
        const degree = scale[Math.floor(rng() * scale.length)];
        const octave = rng() > 0.45 ? 12 : 0;
        const midi = rootNote + degree + octave;
        const vol = 0.13 + rng() * 0.05;
        // The second instrument answers on alternating steps, so a phrase is a交换
        // between two timbres rather than one colour repeating.
        const answer = stepIndex % 2 === 1 && K.answer;
        if (K.arpeggio) {
          // 8-bit lead writing: cycle the chord quickly instead of holding one note.
          const arp = [midi, midi + 4, midi + 7, midi + 12];
          const gap = Math.min(0.055, stepDur / 4);
          arp.forEach((note, i) => playPluck(note, t + i * gap, vol * 0.85, gap * 3.2, i % 2 === 1));
        } else {
          playPluck(midi, t, vol, spec.pluckDecay, answer);
        }
      });
    }

    // Fill into the next cut when one lands on this bar's end.
    const nextCut = isEnding ? undefined
      : cues.find((c) => c.time > barT + bar * 0.6 && c.time < barT + bar + 0.02);
    if (nextCut && beat > 0.12) {
      const fillStart = nextCut.time - beat * 0.5;
      for (let k = 0; k < 3; k++) {
        const t = fillStart + k * (beat * 0.5) / 3;
        if (t > barT && t < duration - 0.02 && !isCueAt(t)) playSnare(t, 0.35 + k * 0.18, bed);
      }
    }
  }

  // ---- the cuts themselves: riser then impact, sample-accurate ----
  for (const cue of cues) {
    playRiser(cue.time, cue.power);
    const chordIdx = Math.max(0, Math.floor(cue.time / bar)) % spec.chords.length;
    const rootNote = spec.root + (scale[spec.chords[chordIdx] % scale.length] || 0);
    playImpact(cue.time, cue.power * spec.impact, rootNote);
  }

  // ---- the ending: a real cadence on the tonic, not a cut ----
  //
  // A tonic triad that rings to the last sample, plus one impact as the final button.
  // This is what makes a five-second clip feel finished instead of looped-and-stopped.
  if (endingT < duration - 0.05) {
    const ring = duration - endingT;
    // Keep the cadence out of any sidechain dip that lands on the same downbeat.
    bed.gain.setValueAtTime(1, endingT);
    for (const degree of [0, 2, 4]) {
      const tone = tonic + (scale[degree % scale.length] || 0);
      playPluck(tone + 12, endingT, 0.1, Math.min(ring, 1.5));
      playPluck(tone, endingT + 0.012, 0.08, Math.min(ring, 1.5));
    }
    playPluck(tonic + 24, endingT, 0.07, Math.min(ring, 1.2));
    if (!isCueAt(endingT)) playImpact(endingT, 0.7 * spec.impact, tonic);
  }

  const buffer = await ctx.startRendering();
  // Report the tempo actually used, so a caller can log why the cuts fit.
  buffer.__groove = {
    bpm, bar, fit: Number(fit.toFixed(3)), cues: cues.length,
    bars: totalBars, groove: spec.groove, variants: variants.length,
  };
  return buffer;
}

/** Audition a score through the speakers. */
function previewMusic(promptOrPreset, duration, options = {}) {
  const ctx = new AudioContext();
  let stopped = false;
  let source = null;

  const pending = renderMusic(promptOrPreset, { ...options, duration, sampleRate: ctx.sampleRate })
    .then((buffer) => {
      if (stopped) { void ctx.close(); return; }
      source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => { void ctx.close(); };
      source.start(0);
    })
    .catch(() => { void ctx.close(); });

  return {
    stop() {
      stopped = true;
      try { if (source) source.stop(); } catch { /* already ended */ }
      void pending;
      void ctx.close();
    },
  };
}

/** Decode a user-supplied file and fit it to the clip length. */
async function audioFileToBuffer(file, duration, sampleRate) {
  const bytes = await file.arrayBuffer();
  const ctx = new OfflineAudioContext(2, Math.ceil(duration * (sampleRate || 44100)), sampleRate || 44100);
  const decoded = await ctx.decodeAudioData(bytes);
  const targetLength = Math.ceil(duration * decoded.sampleRate);
  const out = ctx.createBuffer(2, targetLength, decoded.sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const from = decoded.getChannelData(Math.min(ch, decoded.numberOfChannels - 1));
    const to = out.getChannelData(ch);
    const take = Math.min(targetLength, from.length);
    to.set(from.subarray(0, take));
    if (take < targetLength && from.length > 0) {
      let offset = take;
      while (offset < targetLength) {
        const chunk = Math.min(from.length, targetLength - offset);
        to.set(from.subarray(0, chunk), offset);
        offset += chunk;
      }
    }
  }

  const fadeLen = Math.min(Math.floor(out.sampleRate * 0.4), targetLength);
  for (let ch = 0; ch < 2; ch++) {
    const data = out.getChannelData(ch);
    for (let i = 0; i < fadeLen; i++) data[targetLength - 1 - i] *= i / fadeLen;
  }
  return out;
}

/* __MUSIC_EXPORTS__ */
