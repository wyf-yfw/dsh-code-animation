/**
 * Shared catalog helpers for both halves of the bundle.
 *
 * The 341 style entries ship beside this module as `styles.json`; the 193 reference
 * stills live under `stills/`. Both the Host bundle (routes) and the creation-mode
 * tools (search) import from here so there is one source of truth.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const HERE = new URL('./', import.meta.url);

export const STYLES_FILE = fileURLToPath(new URL('./styles.json', HERE));
export const STILLS_DIR = fileURLToPath(new URL('./stills/', HERE));
/** Where generated animations are written, one HTML file per creation. */
export const OUTPUT_DIR = fileURLToPath(new URL('./created/', HERE));
/** Subdirectory an export is written into, under the session directory. */
export const EXPORT_DIR_NAME = 'code-animation';

/**
 * Build marker surfaced by the health route.
 *
 * Bump it whenever tool names or their result shape change: a preset mounts this
 * module once at process start, so a running host can still serve an older revision
 * than the one on disk, and this is how that shows up.
 */
export const BUILD_REV = 4;

/** Tool names this revision registers, in the order they are declared. */
export const TOOL_NAMES = ['list_styles', 'show_stills', 'get_style', 'save_storyboard', 'save_animation'];

let cached;

/** Load the style catalog once and report it in the shape the tools consume. */
export function catalog() {
  if (cached) return cached;
  const raw = JSON.parse(readFileSync(STYLES_FILE, 'utf8'));
  cached = { series: raw.series, styles: raw.styles };
  return cached;
}

/** Case-insensitive match over id, name, series, category, description, fit and tags. */
export function matches(style, query) {
  if (!query) return true;
  const hay = [
    style.id,
    style.name,
    style.en,
    style.series,
    style.seriesName,
    style.category,
    style.desc,
    style.fit,
  ]
    .concat(style.tags || [])
    .join(' ')
    .toLowerCase();
  return hay.includes(String(query).toLowerCase());
}

/**
 * Rank styles against one query: an exact id wins, then id prefix, then a name hit,
 * then any remaining field. Ties keep catalog order so results are stable.
 */
export function searchStyles(query, options = {}) {
  const { styles } = catalog();
  const limit = Math.max(1, Math.min(Number(options.limit) || 12, 50));
  const series = options.series ? String(options.series).toUpperCase() : '';
  const q = String(query || '').trim();
  const scored = [];
  styles.forEach((style, index) => {
    if (series && String(style.series).toUpperCase() !== series) return;
    if (!matches(style, q)) return;
    let score = 3;
    if (q) {
      const lower = q.toLowerCase();
      if (style.id.toLowerCase() === lower) score = 0;
      else if (style.id.toLowerCase().startsWith(lower)) score = 1;
      else if (String(style.name).toLowerCase().includes(lower)) score = 2;
    }
    scored.push({ style, score, index });
  });
  scored.sort((a, b) => (a.score - b.score) || (a.index - b.index));
  return scored.slice(0, limit).map((entry) => entry.style);
}

/** Look one style up by its exact catalog id, ignoring case. */
export function styleById(id) {
  const { styles } = catalog();
  const key = String(id || '').trim().toUpperCase();
  return styles.find((style) => style.id === key);
}

/** Project a catalog entry onto what a caller actually needs to see. */
export function describe(style) {
  return {
    id: style.id,
    name: style.name,
    series: style.series,
    seriesName: style.seriesName,
    category: style.category,
    description: style.desc,
    fit: style.fit,
    tags: style.tags || [],
    hasStill: Boolean(style.still),
    // Empty string rather than null: the tool schema dialect has no nullable union.
    stillUrl: style.still ? `/code-animation-api/still/${style.id}` : '',
    prompt: style.prompt,
    promptChars: (style.prompt || '').length,
    music: defaultMusicFor(style),
  };
}

/**
 * Score presets, mirroring the client's `MUSIC_PRESETS`.
 * Kept here so the Host can suggest one before the browser ever renders.
 */
export const MUSIC_PRESETS = ['none', 'ambient', 'pulse', 'bright', 'epic', 'lofi', 'guofeng', 'synth'];

/**
 * Pick a score for a style.
 *
 * The series carries most of the signal (a Chinese-ink piece and a cyberpunk piece
 * should not get the same bed), with tags refined on top: 3D leans cinematic, and a
 * monochrome plate wants something sparser.
 */
export function defaultMusicFor(style) {
  const series = String(style?.series || '').toUpperCase();
  const tags = (style?.tags || []).join(' ');
  const text = `${style?.name || ''} ${style?.desc || ''} ${style?.fit || ''}`;

  if (series === 'Z') return 'guofeng';
  if (/中国风|水墨|敦煌|京剧|皮影|剪纸|年画|青花|书法/.test(text)) return 'guofeng';
  if (/赛博|霓虹|cyber|朋克|末日|故障|合成波|CRT|glitch/i.test(text)) return 'synth';
  if (/B&W|黑白/.test(tags) || /默片|银版|黑白/.test(text)) return 'ambient';
  if (series === 'O' || series === 'L') return 'epic';
  if (/\b3D\b/.test(tags)) return 'epic';
  if (series === 'K' || series === 'M') return 'bright';
  if (series === 'R') return 'synth';
  return 'pulse';
}
