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

  master.connect(glue);
  glue.connect(ceiling);
  ceiling.connect(ctx.destination);

  const verb = ctx.createConvolver();
  verb.buffer = createReverbBuffer(ctx, Math.min(2.4, duration * 0.8), 2.2, rng);
  const wet = ctx.createGain();
  wet.gain.value = spec.reverbWet;
  verb.connect(wet);
  wet.connect(master);

  const fade = ctx.createGain();
  fade.gain.setValueAtTime(0.0001, 0);
  fade.gain.linearRampToValueAtTime(1, Math.min(0.15, duration * 0.04));
  fade.gain.setValueAtTime(1, Math.max(0.15, duration - 0.45));
  fade.gain.linearRampToValueAtTime(0.0001, duration);
  fade.connect(master);

  /**
   * The bed bus carries the groove. Cue impacts connect past it to `fade`, so when the
   * bed ducks the hit is exposed rather than masked.
   */
  const bed = ctx.createGain();
  bed.gain.value = 1;
  bed.connect(fade);

  const { beat, bar, bpm, fit } = fitGroove(rawCuts, duration, spec.bpm);
  const scale = SCALES[spec.scale] || SCALES.minorPent;

  const noiseBuf = createNoiseBuffer(ctx, 1.5, rng);
  const hatsBuf = createNoiseBuffer(ctx, 0.2, rng);

  // ---- voices ----------------------------------------------------------------

  const playKick = (t, power, dest) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(165, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.11);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.5 * power, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
    osc.connect(g);
    g.connect(dest);
    osc.start(t);
    osc.stop(t + 0.3);
  };

  const playSnare = (t, power, dest) => {
    const src = ctx.createBufferSource();
    src.buffer = hatsBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1900;
    bp.Q.value = 0.9;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.3 * power, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    src.connect(bp);
    bp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + 0.16);

    // A body tone under the noise so the snare reads on small speakers too.
    const body = ctx.createOscillator();
    body.type = 'triangle';
    body.frequency.setValueAtTime(210, t);
    body.frequency.exponentialRampToValueAtTime(150, t + 0.07);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.16 * power, t);
    bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    body.connect(bg);
    bg.connect(dest);
    body.start(t);
    body.stop(t + 0.12);
  };

  const playHat = (t, power, dest, open = false) => {
    const src = ctx.createBufferSource();
    src.buffer = hatsBuf;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7800;
    const g = ctx.createGain();
    const len = open ? 0.16 : 0.045;
    g.gain.setValueAtTime(0.16 * power, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(hp);
    hp.connect(g);
    g.connect(dest);
    src.start(t);
    src.stop(t + len + 0.02);
  };

  const playBass = (midi, t, length, power) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = midiToHz(midi);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.34 * power, t + 0.02);
    g.gain.setValueAtTime(0.34 * power, Math.max(t + 0.02, t + length - 0.05));
    g.gain.linearRampToValueAtTime(0.0001, t + length);
    osc.connect(g);
    g.connect(bed);
    osc.start(t);
    osc.stop(t + length + 0.03);
  };

  const playPluck = (midi, t, vol, decay) => {
    const osc = ctx.createOscillator();
    osc.type = spec.wave;
    osc.frequency.value = midiToHz(midi);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(spec.cutoff, t);
    lp.frequency.exponentialRampToValueAtTime(420, t + decay);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(lp);
    lp.connect(g);
    g.connect(bed);
    g.connect(verb);
    osc.start(t);
    osc.stop(t + decay + 0.04);
  };

  const playPad = (midi, t, length, vol) => {
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = spec.cutoff * 0.7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.35, length * 0.3));
    g.gain.setValueAtTime(vol, Math.max(t + 0.35, t + length - 0.25));
    g.gain.linearRampToValueAtTime(0.0001, t + length);
    for (const detune of [-6, 6]) {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.value = midiToHz(midi);
      osc.detune.value = detune;
      osc.connect(lp);
      osc.start(t);
      osc.stop(t + length + 0.05);
    }
    lp.connect(g);
    g.connect(bed);
    g.connect(verb);
  };

  const playRiser = (targetT, power) => {
    const lead = Math.min(0.4, targetT);
    if (lead < 0.12) return;
    const startT = targetT - lead;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(400, startT);
    bp.frequency.exponentialRampToValueAtTime(6000, targetT);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, startT);
    g.gain.linearRampToValueAtTime(0.3 * power, targetT - 0.02);
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
    sg.connect(fade);
    sub.start(t);
    sub.stop(t + 0.8);

    playKick(t, 1.1 * power, fade);

    const crash = ctx.createBufferSource();
    crash.buffer = noiseBuf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 3400;
    bp.Q.value = 0.7;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.3 * power, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    crash.connect(bp);
    bp.connect(cg);
    cg.connect(fade);
    cg.connect(verb);
    crash.start(t);
    crash.stop(t + 1);

    // A stab makes the hit harmonic instead of a bare boom.
    const stabNotes = [0, 7, 12];
    for (const off of stabNotes) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = midiToHz(rootMidi + off);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.14 * power, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc.connect(g);
      g.connect(fade);
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

  // ---- arrangement: bars of real groove ----
  const totalBars = Math.ceil(duration / bar);
  const cueTimes = new Set(cues.map((c) => c.time.toFixed(2)));
  const isCueAt = (t) => cueTimes.has(t.toFixed(2));

  for (let b = 0; b < totalBars; b++) {
    const barT = b * bar;
    if (barT >= duration) break;
    const chordIdx = spec.chords[b % spec.chords.length];
    const rootNote = spec.root + (scale[chordIdx % scale.length] || 0);
    const barLen = Math.min(bar, duration - barT);
    const stepDur = bar / 16;

    // A final bar usually gets cut short; only start a pad the bar can hold.
    if (barLen > beat * 1.2) playPad(rootNote, barT, barLen, 0.16);
    playBass(rootNote - 12, barT, Math.min(beat * 1.8, barLen), 0.9);

    for (let s = 0; s < 16; s++) {
      const t = barT + s * stepDur;
      if (t >= duration - 0.02) break;
      if (isCueAt(t)) continue; // the impact covers this step

      const isDownbeat = s === 0;
      const onBeat = s % 4 === 0;

      if (spec.groove === 'four') {
        if (onBeat) playKick(t, isDownbeat ? 1 : 0.8, bed);
        if (s === 4 || s === 12) playSnare(t, 0.85, bed);
        if (s % 2 === 0) playHat(t, s % 4 === 2 ? 0.9 : 0.55, bed, s === 14);
      } else if (spec.groove === 'backbeat') {
        if (s === 0 || s === 6 || s === 10) playKick(t, isDownbeat ? 1 : 0.75, bed);
        if (s === 4 || s === 12) playSnare(t, 0.9, bed);
        if (s % 2 === 0) playHat(t, s % 4 === 2 ? 0.85 : 0.5, bed, s === 14);
      } else {
        // sparse: leave air around the arrival
        if (s === 0 || s === 8) playKick(t, 0.7, bed);
        if (s === 8) playHat(t, 0.4, bed, true);
      }

      // Melodic movement, thinned out so it does not fight the groove.
      if (s === 0 || s === 6 || s === 10) {
        const degree = scale[Math.floor(rng() * scale.length)];
        const octave = rng() > 0.45 ? 12 : 0;
        playPluck(rootNote + degree + octave, t, 0.13 + rng() * 0.05, spec.pluckDecay);
      }
    }

    // Fill into the next cut when one lands on this bar's end.
    const nextCut = cues.find((c) => c.time > barT + bar * 0.6 && c.time < barT + bar + 0.02);
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

  const buffer = await ctx.startRendering();
  // Report the tempo actually used, so a caller can log why the cuts fit.
  buffer.__groove = { bpm, bar, fit: Number(fit.toFixed(3)), cues: cues.length };
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
