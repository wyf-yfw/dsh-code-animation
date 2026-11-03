/**
 * Procedural score for the exported clip.
 *
 * There are no bundled audio assets and no network: every track is synthesised with
 * Web Audio. A track is rendered through `OfflineAudioContext` at the exact clip
 * length, so the exported audio and video are frame-aligned and reproducible from a
 * seed rather than differing on every export.
 */

const MUSIC_PRESETS = [
  { id: 'none', label: '无配乐' },
  { id: 'ambient', label: '氛围' },
  { id: 'pulse', label: '脉冲' },
  { id: 'bright', label: '轻快' },
  { id: 'epic', label: '史诗' },
  { id: 'lofi', label: 'Lo-fi' },
  { id: 'guofeng', label: '国风' },
  { id: 'synth', label: '合成波' },
];

const SCALES = {
  minorPent: [0, 3, 5, 7, 10],
  majorPent: [0, 2, 4, 7, 9],
  minor: [0, 2, 3, 5, 7, 8, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
};

const SPECS = {
  ambient: {
    root: 45, scale: 'minorPent', bpm: 60, wet: 0.55,
    pad: 0.30, sub: 0.22, pluck: 0.10, kick: 0, hat: 0, vinyl: 0,
    cutoff: 900, arp: false, chords: [0, 5, 3, 4], accent: 0.35, riser: 0,
  },
  pulse: {
    root: 41, scale: 'minor', bpm: 112, wet: 0.22,
    pad: 0.16, sub: 0.26, pluck: 0.14, kick: 0.62, hat: 0.16, vinyl: 0,
    cutoff: 1400, arp: true, chords: [0, 0, 3, 4], accent: 0.72, riser: 0.20,
  },
  bright: {
    root: 48, scale: 'major', bpm: 104, wet: 0.24,
    pad: 0.14, sub: 0.16, pluck: 0.22, kick: 0.34, hat: 0.20, vinyl: 0,
    cutoff: 2200, arp: true, chords: [0, 4, 5, 3], accent: 0.55, riser: 0.24,
  },
  epic: {
    root: 38, scale: 'minor', bpm: 72, wet: 0.42,
    pad: 0.30, sub: 0.30, pluck: 0.10, kick: 0.55, hat: 0.08, vinyl: 0,
    cutoff: 1100, arp: false, chords: [0, 5, 3, 4], accent: 0.85, riser: 0.40,
  },
  lofi: {
    root: 43, scale: 'dorian', bpm: 76, wet: 0.34,
    pad: 0.18, sub: 0.20, pluck: 0.16, kick: 0.40, hat: 0.12, vinyl: 0.10,
    cutoff: 1200, arp: true, chords: [0, 3, 5, 4], accent: 0.42, riser: 0.14,
  },
  guofeng: {
    root: 50, scale: 'majorPent', bpm: 84, wet: 0.48,
    pad: 0.16, sub: 0.14, pluck: 0.26, kick: 0.20, hat: 0.06, vinyl: 0,
    cutoff: 1800, arp: true, chords: [0, 3, 4, 2], accent: 0.48, riser: 0.22,
  },
  synth: {
    root: 40, scale: 'minor', bpm: 120, wet: 0.20,
    pad: 0.20, sub: 0.30, pluck: 0.18, kick: 0.66, hat: 0.18, vinyl: 0,
    cutoff: 1600, arp: true, chords: [0, 5, 0, 3], accent: 0.78, riser: 0.34,
  },
};

/** Mulberry32: the same seed always yields the same score. */
function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semitone offset to Hz, relative to A4 = 440. */
function hz(midi) {
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * Choose a beat period that puts the clip's cut points on the grid.
 *
 * This is what makes the score land on the edits instead of merely playing beside
 * them. Every candidate period is scored by how far the cuts fall from the nearest
 * beat, plus a nudge toward a musically useful beat count, and the best one wins.
 *
 * @param cuts - cut times in seconds, excluding 0.
 * @param fallbackBpm - tempo to fall back on when there are no cuts to fit.
 * @param duration - clip length in seconds.
 * @returns the beat period in seconds.
 */
function fitBeatPeriod(cuts, fallbackBpm, duration) {
  const fallback = 60 / (Number(fallbackBpm) || 100);
  const times = (Array.isArray(cuts) ? cuts : [])
    .map(Number)
    .filter((t) => Number.isFinite(t) && t > 0.08 && t < duration - 0.08);
  if (!times.length) return fallback;

  let best = null;
  // 60–180 BPM in whole steps: a musically plausible range with enough density.
  for (let bpm = 60; bpm <= 180; bpm += 1) {
    const period = 60 / bpm;
    const totalBeats = duration / period;
    if (totalBeats < 6 || totalBeats > 96) continue;

    let error = 0;
    for (const t of times) {
      const k = t / period;
      const off = Math.abs(k - Math.round(k));
      // A cut sitting on a bar line is worth more than one on a weak beat.
      const onBar = Math.abs(k / 4 - Math.round(k / 4));
      error += off + onBar * 0.35;
    }
    error /= times.length;

    // Prefer tempos near 100 BPM when the fit is close, so choices do not drift extreme.
    const comfort = Math.abs(bpm - 100) / 400;
    const score = error + comfort;
    if (!best || score < best.score) best = { period, score, error, bpm };
  }

  return best ? best.period : fallback;
}

/** Expose the chosen tempo alongside the period, for tests and diagnostics. */
function fitTempo(cuts, fallbackBpm, duration) {
  const period = fitBeatPeriod(cuts, fallbackBpm, duration);
  return { period, bpm: Math.round(60 / period) };
}

function noiseBuffer(ctx, seconds, rng) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = rng() * 2 - 1;
  return buffer;
}

/** Exponentially decaying noise: a cheap, convincing room. */
function impulseBuffer(ctx, seconds, decay, rng) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * seconds));
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (rng() * 2 - 1) * (1 - i / length) ** decay;
    }
  }
  return buffer;
}

/**
 * Synthesise one preset into an AudioBuffer of exactly `duration` seconds.
 * @param preset - one of MUSIC_PRESETS ids; an unknown id falls back to `ambient`.
 * @param options - `{ duration, sampleRate, seed, cuts }`. `cuts` are the clip's cut
 *   times in seconds; when present the tempo is fitted to them and every cut gets an
 *   accent, so the score lands on the edits.
 * @returns the rendered stereo buffer.
 */
async function renderMusic(preset, options) {
  const opts = options || {};
  const duration = Math.max(0.5, Number(opts.duration) || 8);
  const sampleRate = Number(opts.sampleRate) || 44100;
  const spec = SPECS[preset] || SPECS.ambient;
  const seed = Number(opts.seed) || 20261103;
  const rng = makeRng(seed);

  const ctx = new OfflineAudioContext(2, Math.ceil(duration * sampleRate), sampleRate);

  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 3;
  comp.attack.value = 0.006;
  comp.release.value = 0.22;
  master.connect(comp);
  comp.connect(ctx.destination);

  const verb = ctx.createConvolver();
  verb.buffer = impulseBuffer(ctx, Math.min(3.2, duration * 0.9), 2.6, rng);
  const wet = ctx.createGain();
  wet.gain.value = spec.wet;
  verb.connect(wet);
  wet.connect(master);

  // A gentle fade keeps the clip from starting or ending on a click.
  const fade = ctx.createGain();
  const inEnd = Math.min(0.35, duration * 0.12);
  const outStart = Math.max(inEnd, duration - Math.min(0.7, duration * 0.18));
  fade.gain.setValueAtTime(0.0001, 0);
  fade.gain.linearRampToValueAtTime(1, inEnd);
  fade.gain.setValueAtTime(1, outStart);
  fade.gain.linearRampToValueAtTime(0.0001, duration);
  fade.connect(master);

  const scale = SCALES[spec.scale] || SCALES.minorPent;
  const { period: beat, bpm } = fitTempo(opts.cuts, spec.bpm, duration);
  const bar = beat * 4;
  const bars = Math.max(1, Math.ceil(duration / bar));

  // Quantise every cut onto the beat grid and keep the distinct hits: these are the
  // moments the score has to land on.
  const accents = [];
  for (const raw of Array.isArray(opts.cuts) ? opts.cuts : []) {
    const t = Number(raw);
    if (!Number.isFinite(t) || t <= 0.08 || t >= duration - 0.08) continue;
    const snapped = Math.round(t / beat) * beat;
    if (snapped <= 0.02 || snapped >= duration - 0.02) continue;
    if (accents.some((a) => Math.abs(a - snapped) < beat * 0.25)) continue;
    accents.push(snapped);
  }
  const accentSet = new Set(accents.map((t) => t.toFixed(3)));

  /** One sustained voice: detuned pair through a moving lowpass. */
  const pad = (midi, at, length, level) => {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + Math.min(0.8, length * 0.35));
    gain.gain.setValueAtTime(level, Math.max(at + 0.8, at + length - 0.6));
    gain.gain.linearRampToValueAtTime(0.0001, at + length);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(spec.cutoff * 0.6, at);
    filter.frequency.linearRampToValueAtTime(spec.cutoff, at + length * 0.6);
    filter.Q.value = 0.8;

    for (const detune of [-7, 7]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = hz(midi);
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start(at);
      osc.stop(at + length + 0.05);
    }
    filter.connect(gain);
    gain.connect(fade);
    gain.connect(verb);
  };

  const sub = (midi, at, length, level) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = hz(midi);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + length);
    osc.connect(gain);
    gain.connect(fade);
    osc.start(at);
    osc.stop(at + length + 0.05);
  };

  /** Short plucked tone: triangle through a fast decay. */
  const pluck = (midi, at, level) => {
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = hz(midi);
    const gain = ctx.createGain();
    const len = Math.min(0.5, beat * 1.4);
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
    osc.connect(gain);
    gain.connect(fade);
    gain.connect(verb);
    osc.start(at);
    osc.stop(at + len + 0.03);
  };

  const kick = (at, level) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, at);
    osc.frequency.exponentialRampToValueAtTime(48, at + 0.13);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.34);
    osc.connect(gain);
    gain.connect(fade);
    osc.start(at);
    osc.stop(at + 0.36);
  };

  const hat = (at, level, source) => {
    const src = ctx.createBufferSource();
    src.buffer = source;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 7200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.06);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(fade);
    src.start(at);
    src.stop(at + 0.09);
  };

  const hats = noiseBuffer(ctx, 0.12, rng);
  const crashes = noiseBuffer(ctx, 1.4, rng);
  const vinyl = spec.vinyl > 0 ? noiseBuffer(ctx, duration, rng) : null;

  /** A cut accent: crash plus a sub thump, so the edit is audible. */
  const accent = (at, level) => {
    const src = ctx.createBufferSource();
    src.buffer = crashes;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 3200;
    filter.Q.value = 0.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.9);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(fade);
    gain.connect(verb);
    src.start(at);
    src.stop(at + 1.0);

    kick(at, Math.min(0.95, level * 1.15));
  };

  /** A short riser into a cut, which is what makes the hit feel earned. */
  const riser = (cutAt, level) => {
    const length = Math.min(0.6, beat * 1.5, cutAt);
    if (length < 0.12) return;
    const at = cutAt - length;
    const src = ctx.createBufferSource();
    src.buffer = crashes;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.2;
    filter.frequency.setValueAtTime(500, at);
    filter.frequency.exponentialRampToValueAtTime(5200, cutAt);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.linearRampToValueAtTime(level, cutAt - 0.02);
    gain.gain.linearRampToValueAtTime(0.0001, cutAt);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(fade);
    src.start(at);
    src.stop(cutAt + 0.02);
  };

  if (vinyl) {
    const src = ctx.createBufferSource();
    src.buffer = vinyl;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    filter.Q.value = 0.6;
    const gain = ctx.createGain();
    gain.gain.value = spec.vinyl;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(fade);
    src.start(0);
  }

  for (let b = 0; b < bars; b++) {
    const barAt = b * bar;
    if (barAt >= duration) break;
    const degree = spec.chords[b % spec.chords.length];
    const chordRoot = spec.root + scale[degree % scale.length] + 12 * Math.floor(degree / scale.length);
    const length = Math.min(bar, duration - barAt);

    if (spec.pad > 0) {
      pad(chordRoot, barAt, length, spec.pad);
      pad(chordRoot + scale[(degree + 2) % scale.length] - (degree + 2 >= scale.length ? 12 : 0), barAt, length, spec.pad * 0.7);
      pad(chordRoot + 12, barAt, length, spec.pad * 0.45);
    }
    if (spec.sub > 0) sub(chordRoot - 12, barAt, length * 0.95, spec.sub);

    // drums
    for (let beatIndex = 0; beatIndex < 4; beatIndex++) {
      const at = barAt + beatIndex * beat;
      if (at >= duration) break;
      // A beat that carries a cut accent keeps only the accent, so the edit reads clearly.
      if (accentSet.has(at.toFixed(3))) continue;
      if (spec.kick > 0 && (beatIndex === 0 || beatIndex === 2)) kick(at, spec.kick);
      if (spec.hat > 0) hat(at + beat / 2, spec.hat, hats);
    }

    // arpeggio / plucks on sixteenths
    if (spec.pluck > 0) {
      const steps = spec.arp ? 8 : 3;
      for (let i = 0; i < steps; i++) {
        const at = barAt + (i * bar) / steps;
        if (at >= duration) break;
        if (accentSet.has(at.toFixed(3))) continue;
        if (!spec.arp && rng() < 0.45) continue;
        const step = scale[Math.floor(rng() * scale.length)];
        const octave = rng() < 0.35 ? 12 : 0;
        const note = chordRoot + step + octave;
        if (note > 96) continue;
        pluck(note, at, spec.pluck * (0.7 + rng() * 0.5));
      }
    }
  }

  // Every cut gets its hit; the riser leading into it is what makes it land.
  for (const at of accents) {
    if (spec.riser > 0) riser(at, spec.riser);
    accent(at, spec.accent);
  }

  const buffer = await ctx.startRendering();
  return buffer;
}

/** Play one preset through the speakers, for auditioning before export. */
function previewMusic(preset, duration) {
  if (!preset || preset === 'none') return null;
  const ctx = new AudioContext();
  let stopped = false;
  let source;

  const started = renderMusic(preset, { duration, sampleRate: ctx.sampleRate }).then((buffer) => {
    if (stopped) { void ctx.close(); return; }
    source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.onended = () => { void ctx.close(); };
    source.start(0);
  }).catch(() => { void ctx.close(); });

  return {
    stop() {
      stopped = true;
      try { if (source) source.stop(); } catch { /* already stopped */ }
      void started;
      void ctx.close();
    },
  };
}

/** Decode a user-supplied audio file and fit it to the clip length. */
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
    // repeat a short file so it covers the clip instead of cutting off
    if (take < targetLength && from.length > 0) {
      let offset = take;
      while (offset < targetLength) {
        const chunk = Math.min(from.length, targetLength - offset);
        to.set(from.subarray(0, chunk), offset);
        offset += chunk;
      }
    }
  }

  // A last-half-second fade avoids an abrupt cut on a looped file.
  const fadeLen = Math.min(Math.floor(out.sampleRate * 0.5), targetLength);
  for (let ch = 0; ch < 2; ch++) {
    const data = out.getChannelData(ch);
    for (let i = 0; i < fadeLen; i++) {
      data[targetLength - 1 - i] *= i / fadeLen;
    }
  }
  return out;
}

/* __MUSIC_EXPORTS__ */