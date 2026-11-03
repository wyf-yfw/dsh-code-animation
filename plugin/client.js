window.__ModuleLoader__.load({
  id: '@local/dsh-code-animation',
  factory(require) {
    const React = require('react');
    const h = React.createElement;
    const { useState, useEffect, useMemo, useRef, useCallback } = React;

    const API = '/code-animation-api';
    /** Conversation event kind that carries one Turn's creation artifacts. */
    const KIND = 'code-animation';

    const CSS = `
.cas-tail{margin:8px 0 2px;display:flex;flex-direction:column;gap:8px}
.cas-card{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-1);font:13px/1.5 system-ui,"PingFang SC","Microsoft YaHei",sans-serif;
  color:var(--dsw-alias-label-primary)}
.cas-card-head{display:flex;align-items:center;gap:8px;padding:9px 11px;border-bottom:1px solid var(--dsw-alias-border-l1)}
.cas-dot{width:7px;height:7px;border-radius:2px;background:linear-gradient(135deg,#ff8a3d,#e0457b);flex:none}
.cas-card-title{font-weight:600;font-size:12.5px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cas-card-meta{font-size:11px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-grow{flex:1}
.cas-btn{height:27px;padding:0 11px;border-radius:7px;font:600 11.5px/1 inherit;cursor:pointer;white-space:nowrap;
  border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.cas-btn:hover{border-color:var(--dsw-alias-border-l2)}
.cas-btn:disabled{opacity:.5;cursor:not-allowed}
.cas-btn-primary{background:var(--dsw-alias-label-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.cas-btn-primary:hover{filter:brightness(.92)}

/* stills gallery */
.cas-stills{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px;padding:10px}
.cas-still{border:1px solid var(--dsw-alias-border-l1);border-radius:8px;overflow:hidden;
  background:var(--dsw-alias-bg-layer-2);cursor:zoom-in;padding:0;text-align:left;font:inherit;color:inherit}
.cas-still img{width:100%;display:block;aspect-ratio:16/9;object-fit:cover}
.cas-still-cap{padding:6px 8px}
.cas-still-id{font-size:10px;font-weight:600;color:var(--dsw-alias-label-secondary);letter-spacing:.4px}
.cas-still-name{margin-left:6px;font-size:12.5px}
.cas-still-desc{display:block;margin-top:2px;font-size:11px;color:var(--dsw-alias-label-secondary);
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cas-nostill{padding:8px 10px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}

/* storyboard */
.cas-sb-track{display:flex;height:26px;gap:2px;padding:8px 10px 0}
.cas-sb-seg{display:flex;align-items:center;justify-content:center;border-radius:4px;min-width:14px;flex-basis:0;
  color:#0b0c10;font-size:10px;font-weight:700}
.cas-sb-list{max-height:280px;overflow:auto;padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px}
.cas-sb-shot{display:grid;grid-template-columns:20px 78px minmax(0,1fr);gap:8px;align-items:start}
.cas-sb-idx{width:20px;height:20px;border-radius:5px;display:flex;align-items:center;justify-content:center;
  color:#0b0c10;font-size:10.5px;font-weight:700;margin-top:1px}
.cas-sb-t{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  color:var(--dsw-alias-label-secondary);padding-top:2px}
.cas-sb-body{min-width:0}
.cas-sb-scene{display:block;font-size:12.5px}
.cas-sb-text,.cas-sb-cam{display:block;margin-top:2px;font-size:11px;color:var(--dsw-alias-label-secondary)}
.cas-sb-foot{padding:8px 11px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11.5px;
  color:var(--dsw-alias-label-secondary);background:var(--dsw-alias-bg-layer-2)}

/* animation player */
.cas-stage{position:relative;background:#05070b;display:flex;align-items:center;justify-content:center}
.cas-stage[data-aspect="16:9"]{aspect-ratio:16/9;max-height:560px}
.cas-stage[data-aspect="9:16"]{height:520px}
.cas-stage[data-aspect="1:1"]{aspect-ratio:1/1;max-height:520px}
.cas-frame{display:block;width:100%;height:100%;border:0;background:#05070b}
.cas-bar{display:flex;align-items:center;gap:9px;padding:8px 11px;border-top:1px solid var(--dsw-alias-border-l1)}
.cas-play-btn{width:28px;height:28px;border-radius:6px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);display:inline-flex;
  align-items:center;justify-content:center;cursor:pointer;font-size:12px;padding:0;flex-shrink:0;user-select:none}
.cas-play-btn:hover{background:var(--dsw-alias-bg-layer-3);border-color:var(--dsw-alias-border-l2)}
.cas-play-btn:active{transform:scale(0.96)}
.cas-scrub{flex:1;accent-color:var(--dsw-alias-label-secondary);min-width:0}
.cas-t{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;
  color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-warn{padding:7px 11px;font-size:11.5px;color:var(--dsw-alias-state-warn-primary);
  border-top:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
.cas-note{padding:8px 11px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.cas-score{display:flex;align-items:center;gap:9px;padding:8px 11px;border-top:1px solid var(--dsw-alias-border-l1);
  flex-wrap:wrap}
.cas-score-label{font-size:11.5px;font-weight:600;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.cas-select{height:27px;border-radius:7px;border:1px solid var(--dsw-alias-border-l1);
  background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:11.5px;
  padding:0 6px;outline:none;max-width:190px}
.cas-select:focus{border-color:var(--dsw-alias-border-l2)}
.cas-score-hint{font-size:11px;color:var(--dsw-alias-state-idle-primary);white-space:nowrap}
.cas-score-prompt{font-size:11.5px;color:var(--dsw-alias-label-primary);overflow:hidden;text-overflow:ellipsis;
  white-space:nowrap;max-width:340px;font-weight:500}
.cas-path{padding:7px 11px;border-top:1px solid var(--dsw-alias-border-l1);font-size:11px;
  font-family:ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--dsw-alias-state-idle-primary);
  word-break:break-all;background:var(--dsw-alias-bg-layer-2)}
.cas-path-ok{color:var(--dsw-alias-state-success-primary)}
.cas-lightbox{position:fixed;inset:0;z-index:9100;background:rgba(4,5,8,.88);display:flex;align-items:center;
  justify-content:center;padding:32px;cursor:zoom-out}
.cas-lightbox img{max-width:100%;max-height:100%;border-radius:10px;box-shadow:0 20px 60px rgba(0,0,0,.6)}
`;

    const PALETTE = ['#ff8a3d', '#e0457b', '#7b5bff', '#3fd7c0', '#4d6bfe', '#ffc04d'];

    /** Parse one tool call's raw argument text; malformed input degrades to {}. */
    function parseArgs(raw) {
      if (typeof raw !== 'string' || raw === '') return {};
      try {
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
      } catch {
        return {};
      }
    }

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




    /**
     * Container preference, best first.
     *
     * Chromium records genuine H.264/AAC MP4 through MediaRecorder, so MP4 is the
     * default; the WebM entries are the fallback for browsers without it.
     */
    const CONTAINERS = [
      { id: 'mp4', label: 'MP4', ext: 'mp4', mimes: ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1.4D401F,mp4a.40.2', 'video/mp4'] },
      { id: 'webm', label: 'WebM', ext: 'webm', mimes: ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'] },
    ];

    /** Which container this browser can actually record, MP4 first. */
    function pickContainer(preferred) {
      const order = preferred === 'webm' ? ['webm', 'mp4'] : ['mp4', 'webm'];
      for (const id of order) {
        const container = CONTAINERS.find((c) => c.id === id);
        const mime = container.mimes.find((m) => (
          typeof MediaRecorder !== 'undefined'
          && MediaRecorder.isTypeSupported
          && MediaRecorder.isTypeSupported(m)
        ));
        if (mime) return { ...container, mime };
      }
      return null;
    }

    function download(blob, name) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }

    /**
     * Drive a detached document frame frame by frame and record it through MediaRecorder.
     * @param opts.music - a preset id, or an AudioBuffer for a user-supplied track.
     *   Any audio is mixed at render time, so video and score start together.
     * @param opts.cuts - cut times in seconds; the score is fitted and accented to them.
     */
    /**
     * Find the canvas an export should record.
     *
     * The frame is loaded asynchronously and a page may create its canvas from script,
     * so this waits for the document and retries instead of failing on a first miss.
     * When several canvases exist the largest is used: decorative or helper canvases
     * are typically small.
     */
    async function resolveCanvas(iframe, timeoutMs = 2000) {
      const started = performance.now();
      let doc;
      let seen = '';

      while (performance.now() - started < timeoutMs) {
        doc = iframe && iframe.contentDocument;
        if (doc && doc.readyState !== 'loading') {
          const canvases = Array.from(doc.querySelectorAll('canvas'));
          if (canvases.length) {
            canvases.sort((a, b) => (b.width * b.height) - (a.width * a.height));
            return canvases[0];
          }
          // Remember what the page does contain, for an actionable failure message.
          const counts = ['div', 'svg', 'video', 'img']
            .map((tag) => [tag, doc.querySelectorAll(tag).length])
            .filter(([, n]) => n > 0)
            .map(([tag, n]) => `${n} 个 <${tag}>`);
          seen = counts.join('、');
        }
        await new Promise((r) => setTimeout(r, 80));
      }

      const win = iframe && iframe.contentWindow;
      const hasRenderAt = win && typeof win.renderAt === 'function';
      throw new Error([
        '画面里没有可录制的 <canvas>',
        seen ? `（页面里找到 ${seen}）` : '',
        hasRenderAt ? '' : '，且没有 window.renderAt',
        '。这个动画是 DOM/CSS 绘制的，无法逐帧录制；需要让 Agent 改为渲染到 <canvas> 的实现。',
      ].filter(Boolean).join(''));
    }

    async function recordAnimation(iframe, opts) {
      const win = iframe && iframe.contentWindow;
      if (!win) throw new Error('预览还没准备好');
      const canvas = await resolveCanvas(iframe);
      if (typeof canvas.captureStream !== 'function') throw new Error('当前浏览器不支持 canvas.captureStream');
      const container = pickContainer(opts.container);
      if (!container) throw new Error('当前浏览器不支持 MediaRecorder 录制');
      const mime = container.mime;

      const stream = canvas.captureStream(0);
      const videoTrack = stream.getVideoTracks()[0];
      const tracks = [videoTrack];

      // Audio, when requested, is mixed into the same recording session so the two
      // tracks share one clock.
      let audioCtx;
      let source;
      let audioBuffer;
      let analyser;
      const wantsMusic = opts.music && opts.music !== 'none';
      if (wantsMusic || opts.musicBuffer) {
        if (opts.musicBuffer) {
          audioBuffer = opts.musicBuffer;
        } else if (opts.scoreBuffer) {
          // Reuse the buffer already rendered for auditioning: same audio as the preview.
          audioBuffer = opts.scoreBuffer;
        } else {
          if (opts.onStage) opts.onStage('正在合成配乐…');
          audioBuffer = await renderMusic(opts.music, {
            duration: opts.duration,
            seed: opts.musicSeed,
            cuts: opts.cuts,
            cues: opts.cues,
          });
        }
        audioCtx = new AudioContext();
        const destination = audioCtx.createMediaStreamDestination();
        source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(destination);
        // Tap the same signal so the export can prove audio actually flowed.
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 2048;
        source.connect(analyser);
        tracks.push(...destination.stream.getAudioTracks());
      }

      const recorder = new MediaRecorder(new MediaStream(tracks), { mimeType: mime, videoBitsPerSecond: 16000000 });
      const parts = [];
      recorder.ondataavailable = (e) => { if (e.data && e.data.size) parts.push(e.data); };
      const finished = new Promise((resolve) => {
        recorder.onstop = () => resolve(new Blob(parts, { type: 'video/webm' }));
      });
      recorder.start();

      const fps = Math.max(1, Number(opts.fps) || 30);
      const total = Math.max(1, Math.round(opts.duration * fps));
      const hasRenderAt = typeof win.renderAt === 'function';
      const t0 = performance.now();
      let audioPeak = 0;

      if (source) {
        // A suspended context yields no audio, and without an output device resume()
        // can hang forever — wait briefly, then record anyway rather than stall.
        if (audioCtx.state === 'suspended') {
          await Promise.race([
            audioCtx.resume().catch(() => {}),
            new Promise((r) => setTimeout(r, 400)),
          ]);
        }
        if (audioCtx.state !== 'running' && opts.onStage) opts.onStage('音频未启动，本段可能是无声的');
        source.start(0);
      }

      try {
        for (let i = 0; i < total; i++) {
          if (opts.signal && opts.signal.aborted) break;
          if (hasRenderAt) await win.renderAt(i / fps);
          videoTrack.requestFrame();
          // Sample the score periodically; a peak of zero means the browser never
          // started audio, which would otherwise export as silent video.
          if (analyser && i % 5 === 0) {
            const probe = new Float32Array(analyser.fftSize);
            analyser.getFloatTimeDomainData(probe);
            for (let k = 0; k < probe.length; k++) {
              const v = Math.abs(probe[k]);
              if (v > audioPeak) audioPeak = v;
            }
          }
          if (opts.onProgress) opts.onProgress((i + 1) / total);
          const target = ((i + 1) * 1000) / fps;
          const wait = target - (performance.now() - t0);
          if (wait > 1) await new Promise((r) => setTimeout(r, wait));
        }
      } finally {
        recorder.stop();
      }

      const blob = await finished;
      try { if (source) source.stop(); } catch { /* already ended */ }
      if (audioCtx) void audioCtx.close();
      return { blob, container, hasAudio: tracks.length > 1, audioPeak };
    }

    /** Reference stills the Agent showed for the user to pick a style from. */
    function StillGallery({ stills, note, missing }) {
      const [lightbox, setLightbox] = useState('');
      return h('div', { className: 'cas-card' },
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, '风格候选'),
          h('span', { className: 'cas-card-meta' }, `${stills.length} 条参考静帧`),
        ),
        note ? h('div', { className: 'cas-note' }, note) : null,
        h('div', { className: 'cas-stills' },
          stills.map((s) => h('button', {
            key: s.id,
            className: 'cas-still',
            onClick: () => setLightbox(`${API}/still/${s.id}`),
            title: '点击放大',
          },
            h('img', { src: `${API}/still/${s.id}`, alt: s.name || s.id, loading: 'lazy' }),
            h('span', { className: 'cas-still-cap' },
              h('span', { className: 'cas-still-id' }, s.id),
              h('span', { className: 'cas-still-name' }, s.name || ''),
              h('span', { className: 'cas-still-desc' }, s.desc || ''),
            ),
          )),
        ),
        (missing && missing.length)
          ? h('div', { className: 'cas-nostill' }, `没有参考静帧：${missing.join('、')}`)
          : null,
        lightbox
          ? h('div', { className: 'cas-lightbox', onClick: () => setLightbox('') },
              h('img', { src: lightbox, alt: '参考静帧' }))
          : null,
      );
    }

    /** The storyboard draft, as a proportional timeline plus a per-shot list. */
    function StoryboardCard({ board }) {
      const shots = board.shots || [];
      const shots2 = shots.length ? shots : [];
      return h('div', { className: 'cas-card' },
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, `分镜 · ${board.title || ''}`),
          h('span', { className: 'cas-card-meta' },
            [
              board.styleId ? `${board.styleId} ${board.styleName || ''}`.trim() : '',
              `${shots2.length} 场`,
              `${board.duration}s`,
              board.aspect || '',
            ].filter(Boolean).join(' · ')),
        ),
        h('div', { className: 'cas-sb-track' },
          shots2.map((shot, i) => h('span', {
            key: i,
            className: 'cas-sb-seg',
            title: `${shot.start}–${shot.end}s｜${shot.scene}`,
            style: {
              flexGrow: String(Math.max(0.05, Number(shot.end) - Number(shot.start))),
              background: PALETTE[i % PALETTE.length],
            },
          }, h('b', null, String(i + 1))))),
        h('div', { className: 'cas-sb-list' },
          shots2.map((shot, i) => h('div', { key: i, className: 'cas-sb-shot' },
            h('span', { className: 'cas-sb-idx', style: { background: PALETTE[i % PALETTE.length] } }, String(i + 1)),
            h('span', { className: 'cas-sb-t' }, `${Number(shot.start).toFixed(2)}–${Number(shot.end).toFixed(2)}s`),
            h('span', { className: 'cas-sb-body' },
              h('span', { className: 'cas-sb-scene' }, shot.scene || ''),
              shot.text ? h('span', { className: 'cas-sb-text' }, `字幕「${shot.text}」`) : null,
              shot.camera ? h('span', { className: 'cas-sb-cam' }, shot.camera) : null,
            ),
          ))),
        (board.warnings && board.warnings.length)
          ? h('div', { className: 'cas-warn' }, `需要留意：${board.warnings.join('；')}`)
          : null,
        h('div', { className: 'cas-sb-foot' }, '这份分镜只是草稿。确认之后再让 Agent 开始写动画；要改就直接说加场、删场、调时长或改文案。'),
      );
    }

    /**
     * The finished animation: pick a score and a container, scrub any moment, export.
     *
     * Exports are written to the session directory through the Host so the file lands
     * somewhere the user can find; the card shows that absolute path before and after
     * the export, and keeps a browser download as a secondary action.
     */
    function AnimationCard({ anim, cwd, uiWorkspace }) {
      const [scrub, setScrub] = useState(0);
      const [busy, setBusy] = useState('');
      const [progress, setProgress] = useState(0);
      const [note, setNote] = useState('');
      const [savedPath, setSavedPath] = useState('');
      const [targetDir, setTargetDir] = useState('');
      const [customDir, setCustomDir] = useState('');
      const [aspect, setAspect] = useState('16:9');
      const [playing, setPlaying] = useState(false);
      const animFrameRef = useRef(null);
      const scrubRef = useRef(0);
      scrubRef.current = scrub;
      const [music, setMusic] = useState(anim.music || 'none');
      const [custom, setCustom] = useState(null);
      const [customName, setCustomName] = useState('');
      const [stage, setStage] = useState('');
      const [format, setFormat] = useState(null);
      const previewRef = useRef(null);
      const audioCtxRef = useRef(null);
      const audioSourceRef = useRef(null);
      const scoreRef = useRef(null);
      const fileRef = useRef(null);
      const frameRef = useRef(null);

      // Only offer containers this browser can actually record.
      const available = useMemo(
        () => CONTAINERS.filter((c) => c.mimes.some((m) => (
          typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)
        ))),
        [],
      );
      const defaultFormat = available.some((c) => c.id === 'mp4') ? 'mp4' : (available[0] && available[0].id) || 'webm';
      const activeFormat = format || defaultFormat;

      const duration = Number(anim.duration) || 8;
      const fps = Number(anim.fps) || 30;
      // Cut points come from the storyboard, so the score lands on the edits.
      const cuts = useMemo(
        () => (Array.isArray(anim.cuts) ? anim.cuts.map(Number).filter((t) => Number.isFinite(t) && t > 0) : []),
        [anim.cuts],
      );
      // In-shot visual peaks the score must hit as well as the cuts.
      const cues = useMemo(() => (Array.isArray(anim.cues) ? anim.cues : []), [anim.cues]);

      useEffect(() => () => { if (previewRef.current) previewRef.current.stop(); }, []);

      // Resolve the destination up front so the card can state it before exporting.
      useEffect(() => {
        let cancelled = false;
        const query = cwd ? `?dir=${encodeURIComponent(cwd)}` : '';
        fetch(`${API}/export-dir${query}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => { if (!cancelled && data && data.dir) setTargetDir(data.dir); })
          .catch(() => {});
        return () => { cancelled = true; };
      }, [cwd]);

      const applyScrub = useCallback((value) => {
        setScrub(value);
        const win = frameRef.current && frameRef.current.contentWindow;
        if (win && typeof win.renderAt === 'function') {
          try { win.renderAt(Number(value)); } catch { /* one bad frame must not break the card */ }
        }
      }, []);

      /** Stop the auditioning source without touching the video clock. */
      const stopAudio = useCallback(() => {
        if (audioSourceRef.current) {
          try { audioSourceRef.current.stop(); } catch { /* already ended */ }
          audioSourceRef.current = null;
        }
        if (audioCtxRef.current) {
          void audioCtxRef.current.close().catch(() => {});
          audioCtxRef.current = null;
        }
      }, []);

      const stopPlayback = useCallback(() => {
        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
          animFrameRef.current = null;
        }
        stopAudio();
        setPlaying(false);
      }, [stopAudio]);

      /**
       * Start the score at an offset so picture and sound share one clock.
       * The buffer is rendered ahead of time, so pressing play is instant.
       */
      const startAudioAt = useCallback(async (offset) => {
        const buffer = custom || (music && music !== 'none' ? scoreRef.current : null);
        if (!buffer) return;
        const ctx = new AudioContext();
        audioCtxRef.current = ctx;
        if (ctx.state === 'suspended') {
          await Promise.race([ctx.resume().catch(() => {}), new Promise((r) => setTimeout(r, 400))]);
        }
        if (audioCtxRef.current !== ctx) { void ctx.close(); return; }
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0, Math.max(0, Math.min(offset, buffer.duration - 0.01)));
        audioSourceRef.current = source;
      }, [music, custom]);

      const togglePlay = useCallback(() => {
        if (playing) {
          stopPlayback();
          return;
        }
        let startT = Number(scrubRef.current);
        if (startT >= duration - 0.05) {
          startT = 0;
          applyScrub(0);
        }
        setPlaying(true);
        void startAudioAt(startT);
        const startWallTime = performance.now() - startT * 1000;
        const step = (now) => {
          const curT = (now - startWallTime) / 1000;
          if (curT >= duration) {
            applyScrub(duration);
            stopAudio();
            setPlaying(false);
            animFrameRef.current = null;
          } else {
            applyScrub(curT);
            animFrameRef.current = requestAnimationFrame(step);
          }
        };
        animFrameRef.current = requestAnimationFrame(step);
      }, [playing, duration, applyScrub, stopPlayback, startAudioAt, stopAudio]);

      useEffect(() => () => {
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        stopAudio();
      }, [stopAudio]);

      // Render the score once so auditioning is instant and export reuses the buffer.
      useEffect(() => {
        if (custom) { scoreRef.current = custom; return undefined; }
        if (!music || music === 'none') { scoreRef.current = null; return undefined; }
        let cancelled = false;
        scoreRef.current = null;
        renderMusic(music, { duration, cuts, cues }).then((buffer) => {
          if (!cancelled) scoreRef.current = buffer;
        }).catch(() => {});
        return () => { cancelled = true; };
      }, [music, custom, duration, cuts, cues]);

      const onPickFile = useCallback(async (event) => {
        const file = event.target.files && event.target.files[0];
        if (!file) return;
        try {
          const buffer = await audioFileToBuffer(file, duration);
          setCustom(buffer);
          setCustomName(file.name);
          setNote(`已载入 ${file.name}，导出时会混入`);
        } catch (error) {
          setNote(`音频读取失败：${error.message}`);
        }
      }, [duration]);

      const onPickDirectory = useCallback(async () => {
        if (uiWorkspace && typeof uiWorkspace.pickDirectory === 'function') {
          try {
            const chosen = await uiWorkspace.pickDirectory();
            if (chosen) {
              setCustomDir(chosen);
              setTargetDir(chosen);
              return;
            }
          } catch (e) {
            console.warn('uiWorkspace.pickDirectory error:', e);
          }
        }
        const val = window.prompt('请输入保存视频的目标文件夹路径（绝对路径）：', customDir || targetDir || cwd || '');
        if (val && val.trim()) {
          setCustomDir(val.trim());
          setTargetDir(val.trim());
        }
      }, [uiWorkspace, customDir, targetDir, cwd]);

      const onExport = useCallback(async () => {
        if (busy) return;
        setBusy('export');
        setProgress(0);
        setNote('');
        setSavedPath('');
        setStage('');
        try {
          const { blob, container, hasAudio, audioPeak } = await recordAnimation(frameRef.current, {
            duration,
            fps,
            cuts,
            container: activeFormat,
            music: custom ? 'none' : music,
            musicBuffer: custom || undefined,
            scoreBuffer: scoreRef.current || undefined,
            onStage: setStage,
            onProgress: setProgress,
          });
          if (!blob || !blob.size) throw new Error('录制结果为空');

          const wanted = custom || music !== 'none';
          // A zero peak means the browser never started audio: say so instead of
          // handing over a silent file as if it were scored.
          const audioNote = !wanted
            ? '无声'
            : (hasAudio && audioPeak > 1e-4)
              ? '含配乐'
              : '⚠ 配乐未进入录制，这段是无声的';

          const fileName = `${anim.title || anim.id || 'animation'}.${container.ext}`;

          // One click does both: download to the browser, and also write into the
          // chosen directory, so the file is never hidden in only one place.
          download(blob, fileName);

          setStage('正在写入目录…');
          try {
            const query = new URLSearchParams({ name: fileName });
            const exportDir = customDir || cwd;
            if (exportDir) query.set('dir', exportDir);
            const res = await fetch(`${API}/export?${query}`, {
              method: 'POST',
              headers: { 'content-type': blob.type || 'application/octet-stream' },
              body: blob,
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
            setSavedPath(data.path);
            setNote(`已下载并保存到 ${data.path}（${(blob.size / 1048576).toFixed(1)} MB · ${container.label} · ${audioNote}）`);
          } catch (error) {
            // The download already happened, so the render is never lost.
            setNote(`已下载 ${fileName} · ${container.label} · ${audioNote}（未写入目录：${error.message}）`);
          }
        } catch (error) {
          setNote(`导出失败：${error.message}`);
        } finally {
          setBusy('');
          setStage('');
        }
      }, [busy, duration, fps, music, custom, cuts, cues, anim, activeFormat, customDir, cwd]);

      return h('div', { className: 'cas-card' },
        h('div', { className: 'cas-card-head' },
          h('span', { className: 'cas-dot' }),
          h('span', { className: 'cas-card-title' }, anim.title || '动画'),
          h('span', { className: 'cas-card-meta' },
            [
              anim.styleId ? `${anim.styleId} ${anim.styleName || ''}`.trim() : '',
              `${duration}s`,
              `${fps}fps`,
              cuts.length ? `卡点 ${cuts.length} 处` : '',
            ].filter(Boolean).join(' · ')),
          h('span', { className: 'cas-grow' }),
          h('button', {
            className: 'cas-btn cas-btn-primary',
            onClick: onExport,
            disabled: !!busy,
          }, busy === 'export' ? (stage || `录制中 ${Math.round(progress * 100)}%`) : '导出视频'),
        ),
        h('div', { className: 'cas-stage', 'data-aspect': aspect },
          h('iframe', {
            ref: frameRef,
            className: 'cas-frame',
            title: anim.title || '动画',
            src: `${API}/animation/${anim.id}`,
            sandbox: 'allow-scripts allow-same-origin',
            onLoad: () => {
              const frame = frameRef.current;
              const doc = frame && frame.contentDocument;
              const win = frame && frame.contentWindow;
              const canvas = doc && doc.querySelector('canvas');
              if (canvas && canvas.width && canvas.height) {
                const ratio = canvas.width / canvas.height;
                setAspect(ratio > 1.2 ? '16:9' : ratio < 0.85 ? '9:16' : '1:1');
              }
              if (win && typeof win.renderAt === 'function') {
                try { win.renderAt(0); } catch { /* ignore */ }
              }
            },
          }),
        ),
        h('div', { className: 'cas-bar' },
          h('button', {
            className: 'cas-play-btn',
            title: playing ? '暂停' : '播放',
            onClick: togglePlay,
          }, playing ? '⏸' : '▶'),
          h('input', {
            className: 'cas-scrub', type: 'range', min: 0, max: duration, step: 0.05,
            value: scrub,
            onChange: (e) => {
              stopPlayback();
              applyScrub(e.target.value);
            },
          }),
          h('span', { className: 'cas-t' }, `${Number(scrub).toFixed(2)}s / ${duration}s`),
          h('button', {
            className: 'cas-play-btn',
            style: { width: '24px', height: '24px', fontSize: '11px' },
            title: '从头播放',
            onClick: () => {
              stopPlayback();
              applyScrub(0);
            },
          }, '↺'),
        ),
        h('div', { className: 'cas-score' },
          h('span', { className: 'cas-score-label' }, '配乐'),
          custom || (music && music !== 'none')
            ? h('span', { className: 'cas-score-prompt', title: customName || music },
                customName ? `自定义：${customName}` : music)
            : h('span', { className: 'cas-score-hint' }, '无配乐'),
          h('span', { className: 'cas-score-hint' },
            custom ? '已载入自定义音频'
              : `${cuts.length} 个切点${cues.length ? ` + ${cues.length} 个画面重点` : ''} 已卡点`),
          h('span', { className: 'cas-grow' }),
          h('button', {
            className: 'cas-btn',
            onClick: () => {
              stopPlayback();
              if (custom || music === 'none') { setCustom(null); setCustomName(''); setMusic(anim.music || ''); return; }
              setMusic('none');
            },
            disabled: !!busy,
          }, custom || music === 'none' ? '恢复配乐' : '静音'),
          h('button', {
            className: 'cas-btn',
            onClick: () => { if (fileRef.current) fileRef.current.click(); },
            disabled: !!busy,
          }, '换音频…'),
          h('input', {
            ref: fileRef, type: 'file', accept: 'audio/*',
            style: { display: 'none' }, onChange: onPickFile,
          }),
        ),
        h('div', { className: 'cas-score' },
          h('span', { className: 'cas-score-label' }, '格式'),
          available.length > 1
            ? h('select', {
                className: 'cas-select',
                value: activeFormat,
                onChange: (e) => setFormat(e.target.value),
              }, available.map((c) => h('option', { key: c.id, value: c.id }, c.label)))
            : h('span', { className: 'cas-score-hint' }, available[0] ? available[0].label : '无可用容器'),
          h('span', { className: 'cas-score-hint' },
            available.some((c) => c.id === 'mp4')
              ? 'MP4 为 H.264 + AAC，可直接发微信、剪映、Premiere'
              : '当前浏览器不支持 MP4 录制，可用 ffmpeg 转码'),
        ),
        // State the destination before the export so the file is never a mystery.
        h('div', { className: 'cas-path' },
          h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' } },
            h('span', null, savedPath
              ? h('span', { className: 'cas-path-ok' }, `已保存到 ${savedPath}`)
              : (customDir || targetDir
                  ? `导出目录：${customDir || targetDir}`
                  : '导出目录：会话工作目录下的 code-animation/')),
            h('button', {
              className: 'cas-btn',
              style: { fontSize: '11px', padding: '2px 8px', height: '22px' },
              onClick: onPickDirectory,
              disabled: !!busy,
            }, '📂 选择文件夹…'),
          ),
        ),
        (anim.warnings && anim.warnings.length)
          ? h('div', { className: 'cas-warn' }, `建议检查：${anim.warnings.join('；')}`)
          : null,
        note ? h('div', { className: 'cas-note' }, note) : null,
      );
    }

    /**
     * The Turn-level creation workspace.
     *
     * It renders beneath the closing prose and outside the collapsible Tool group,
     * so the reference stills, the storyboard draft and the finished animation stay
     * visible without expanding the process log.
     */
    function CreationTail(props) {
      const data = props.turn && props.turn.data ? props.turn.data.get(KIND) : undefined;
      const useSessions = props.useSessions;
      const sessionId = props.sessionId;
      // The session's working directory decides where exports land.
      const cwd = useSessions && sessionId
        ? useSessions((state) => state.byId[sessionId]?.cwd)
        : undefined;
      if (!data) return null;

      const hasAnything = (data.stills && data.stills.items.length)
        || data.storyboards.length
        || data.animations.length;
      if (!hasAnything) return null;

      const latestBoard = data.storyboards[data.storyboards.length - 1];
      const latestAnim = data.animations[data.animations.length - 1];

      return h('div', { className: 'cas-tail' },
        h('style', null, CSS),
        data.stills && data.stills.items.length
          ? h(StillGallery, { stills: data.stills.items, note: data.stills.note, missing: data.stills.missing })
          : null,
        latestBoard ? h(StoryboardCard, { board: latestBoard }) : null,
        latestAnim ? h(AnimationCard, { anim: latestAnim, cwd, uiWorkspace: props.uiWorkspace }) : null,
      );
    }

    /**
     * Fold one Turn's creation artifacts out of the session log.
     *
     * Everything is narrowed from the persisted call arguments and result text, so a
     * replayed Session reproduces the same cards with no Host change and no reliance
     * on live plugin memory.
     */
    const creationTurnDefinition = {
      kind: KIND,
      match: (event) => {
        if (event.type === 'turn/start') return { id: String(event.data.turn), role: 'start' };
        if (event.type === 'tool/call') return { id: String(event.data.turn), role: 'update' };
        // Replacement copies stay model-only; only appended results are transcript material.
        if (event.type === 'tool/result' && event.surfaceOp === 'append') {
          return { id: String(event.data.turn), role: 'update' };
        }
        return null;
      },
      start: (_context, match) => ({
        turn: match.event.data.turn,
        calls: new Map(),
        stills: null,
        storyboards: [],
        animations: [],
      }),
      update: (context, match) => {
        const state = context.state;

        if (match.event.type === 'tool/call') {
          const calls = new Map(state.calls);
          calls.set(String(match.event.data.callId), {
            name: match.event.data.name,
            argsRaw: match.event.data.arguments,
          });
          return { ...state, calls };
        }
        if (match.event.type !== 'tool/result') return state;

        const message = match.event.data.message;
        if (message.isError === true) return state;
        const call = state.calls.get(String(message.source.callId));
        if (!call) return state;

        const args = parseArgs(call.argsRaw);
        const text = (message.content || [])
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

        if (call.name === 'show_stills') {
          const items = (Array.isArray(args.ids) ? args.ids : []).map((id) => {
            const key = String(id).toUpperCase();
            const match2 = new RegExp(`${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([^｜\\n]+)`).exec(text);
            return {
              id: key,
              name: match2 ? match2[1].trim() : '',
              desc: (new RegExp(`${key}\\s+[^｜\\n]+｜([^\\n]+)`).exec(text) || [])[1] || '',
            };
          });
          const missing = (new RegExp('没有参考静帧：([^\\n（]+)').exec(text) || [])[1];
          return {
            ...state,
            stills: {
              items,
              note: typeof args.note === 'string' ? args.note : '',
              missing: missing ? missing.split('、').map((s) => s.trim()).filter(Boolean) : [],
            },
          };
        }

        if (call.name === 'save_storyboard') {
          const shots = Array.isArray(args.shots) ? args.shots : [];
          // Shot starts after 0 are the cut points the score will be fitted to.
          const cuts = shots
            .map((s) => Number(s.start))
            .filter((t) => Number.isFinite(t) && t > 0.05)
            .sort((a, b) => a - b);
          return {
            ...state,
            storyboards: [...state.storyboards, {
              title: String(args.title || ''),
              styleId: String(args.style_id || ''),
              styleName: '',
              duration: Number(args.duration) || 0,
              aspect: String(args.aspect || ''),
              music: String(args.music || ''),
              cuts,
              shots: shots.map((s, i) => ({
                index: i + 1,
                start: Number(s.start) || 0,
                end: Number(s.end) || 0,
                scene: String(s.scene || ''),
                text: String(s.text || ''),
                camera: String(s.camera || ''),
              })),
              warnings: (new RegExp('需要留意：([^\\n]+)').exec(text) || [])[1]
                ? (new RegExp('需要留意：([^\\n]+)').exec(text))[1].split('；').map((s) => s.trim()).filter(Boolean)
                : [],
            }],
          };
        }

        if (call.name === 'save_animation') {
          const id = (new RegExp(`${API}/animation/([A-Za-z0-9_-]+)`).exec(text) || [])[1]
            || String(args.storyboard_id || '').replace(/^sb-/, 'anim-');
          if (!id) return state;
          const warn = (new RegExp('^(?:注意|建议检查)：(.+)$', 'm').exec(text) || [])[1];
          // The linked storyboard supplies the cut points, so the score can be fitted
          // to the real edits rather than to a fixed tempo.
          const board = state.storyboards.find((b) => b.id === args.storyboard_id)
            || state.storyboards[state.storyboards.length - 1];
          return {
            ...state,
            animations: [...state.animations, {
              id,
              title: String(args.title || ''),
              styleId: String(args.style_id || ''),
              styleName: '',
              duration: Number(args.duration) || 8,
              fps: Number(args.fps) || 30,
              music: String(args.music || (board && board.music) || ''),
              cuts: board ? board.cuts || [] : [],
              warnings: warn ? warn.split('；').map((s) => s.trim()).filter(Boolean) : [],
            }],
          };
        }

        return state;
      },
      buildLocationData: (context, scope, previous) => {
        if (scope !== 'turn' || context.state === undefined) return null;
        const state = context.state;
        // Reuse the previous value when nothing changed, so the snapshot does not republish.
        if (
          previous && previous.kind === 'turn' && previous.turn === state.turn && previous.key === KIND
          && previous.value.stills === state.stills
          && previous.value.storyboards === state.storyboards
          && previous.value.animations === state.animations
        ) return previous;
        return {
          kind: 'turn',
          turn: state.turn,
          key: KIND,
          value: {
            stills: state.stills,
            storyboards: state.storyboards,
            animations: state.animations,
          },
        };
      },
    };

    return {
      inject: ['slots', 'uiConversation'],
      apply(ctx) {
        ctx.effect(() => ctx.uiConversation.events.register(creationTurnDefinition), 'code-animation-studio:turn-data');

        ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
          name: 'conversation.chat.turnTail',
          id: 'code-animation-studio',
          order: 30,
          label: '代码动画',
        }, (props) => h(CreationTail, { ...props, uiWorkspace: ctx.get('uiWorkspace') })));
      },
    };
  },
});
