/**
 * Host half of the Code Animation Studio bundle.
 *
 * The bundle is used twice, on purpose, with different configs:
 *   - once at the profile root (`tools: false`) to serve catalog assets and the
 *     animations the Agent wrote;
 *   - once inside the 创作模式 preset (`tools: true`) to mount the creation tools
 *     in the sessions created under that mode.
 *
 * Routes are profile-wide, so only the root row registers them; the preset row is
 * mounted per preset and would otherwise collide on the same prefix.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { BUILD_REV, EXPORT_DIR_NAME, OUTPUT_DIR, STILLS_DIR, TOOL_NAMES, catalog } from './data.js';
import { registerFlowSection } from './flow.js';
import { registerCreationTools } from './tools.js';

const PREFIX = '/code-animation-api';
const LOG_FILE = fileURLToPath(new URL('./api.log', import.meta.url));
/** Rendered clips reach the host as one body; 8s of 1080p is tens of megabytes. */
const EXPORT_MAX_BYTES = 512 * 1024 * 1024;

function trace(line) {
  try {
    appendFileSync(LOG_FILE, `${new Date().toISOString()} ${line}\n`);
  } catch {
    /* diagnostics must never break a request */
  }
}

function send(res, status, body, type) {
  res.writeHead(status, {
    'content-type': type || 'text/plain; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
  });
  res.end(body);
}

/** One exact id, no traversal: the id grammar is the allowlist. */
function safeId(raw) {
  const id = String(raw || '').split('?')[0];
  return /^[A-Za-z0-9_-]{1,80}$/.test(id) ? id : '';
}

/** Keep a client-supplied name to a single safe path segment. */
function safeFileName(raw, fallback) {
  const base = String(raw || '').split(/[\\/]/).pop() || '';
  const cleaned = base.replace(/[^\w.\-\u4e00-\u9fa5]+/g, '_').replace(/^[._]+/, '').slice(0, 120);
  return cleaned || fallback;
}

/**
 * Resolve where an export lands.
 *
 * The session directory is used when the caller supplies one, so the clip appears
 * beside the user's other files rather than inside the plugin package. A supplied
 * path is accepted only when it is absolute, already a directory, and the final
 * target stays inside it.
 */
function resolveExportDir(requested, fallbackRoot) {
  const candidates = [requested, fallbackRoot].filter((v) => typeof v === 'string' && v.trim());
  for (const candidate of candidates) {
    const root = resolve(candidate);
    if (!isAbsolute(root) || !existsSync(root)) continue;
    try {
      if (!statSync(root).isDirectory()) continue;
    } catch {
      continue;
    }
    const target = join(root, EXPORT_DIR_NAME);
    if (relative(root, target).startsWith('..')) continue;
    return target;
  }
  return join(OUTPUT_DIR, 'exports');
}

function readBody(req, limit) {
  return new Promise((resolvePromise, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limit) {
        reject(new Error(`请求体超过上限 ${Math.round(limit / 1048576)} MB`));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolvePromise(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/**
 * No `inject` declaration: the same module is mounted twice with different configs,
 * and each placement only owns one half. Declaring either service would leave the
 * other placement waiting forever, so both are read lazily and each half no-ops
 * when its service is absent.
 */
export function apply(ctx, config = {}) {
  const withTools = config.tools !== false;
  const withRoutes = config.routes !== false;

  if (withTools) {
    ctx.effect(() => registerCreationTools({
      tools: ctx.get('tools'),
      attachments: ctx.get('attachments'),
    }), 'code-animation-studio:tools');

    // The staged flow is a policy, so it lives in the prompt rather than in a tool.
    ctx.effect(() => registerFlowSection(ctx.get('systemPrompt')), 'code-animation-studio:flow');
  }

  if (withRoutes) {
    ctx.effect(() => {
      const webServer = ctx.get('webServer');
      if (!webServer) return undefined;

      const handler = async (req, res) => {
        const url = req.url || '';
        try {
          if (url.startsWith(`${PREFIX}/health`) && req.method === 'GET') {
            return send(res, 200, JSON.stringify({
              ok: true,
              rev: BUILD_REV,
              tools: TOOL_NAMES,
              styles: catalog().styles.length,
              stills: catalog().styles.filter((s) => s.still).length,
            }), 'application/json; charset=utf-8');
          }

          // Rendered clips land where the user can find them, and the absolute path
          // is echoed back so the card can show exactly where the file went.
          if (url.startsWith(`${PREFIX}/export`) && req.method === 'POST') {
            const query = new URL(url, 'http://localhost').searchParams;
            const body = await readBody(req, EXPORT_MAX_BYTES);
            if (!body.length) {
              return send(res, 400, JSON.stringify({ error: '空文件' }), 'application/json; charset=utf-8');
            }

            const fallbackRoot = ctx.get('workingDirectory')?.defaultDirectory;
            const dir = resolveExportDir(query.get('dir'), fallbackRoot);
            const name = safeFileName(query.get('name'), `animation-${Date.now()}.mp4`);
            mkdirSync(dir, { recursive: true });
            const file = join(dir, name);
            writeFileSync(file, body);
            trace(`export ${name} ${body.length}B -> ${file}`);
            return send(res, 200, JSON.stringify({
              path: file,
              dir,
              bytes: body.length,
            }), 'application/json; charset=utf-8');
          }

          if (url.startsWith(`${PREFIX}/export-dir`) && req.method === 'GET') {
            const query = new URL(url, 'http://localhost').searchParams;
            const fallbackRoot = ctx.get('workingDirectory')?.defaultDirectory;
            return send(res, 200, JSON.stringify({
              dir: resolveExportDir(query.get('dir'), fallbackRoot),
            }), 'application/json; charset=utf-8');
          }

          if (url.startsWith(`${PREFIX}/still/`)) {
            const id = safeId(url.slice(`${PREFIX}/still/`.length));
            const file = id ? join(STILLS_DIR, `${id}.jpg`) : '';
            if (!file || !existsSync(file)) return send(res, 404, 'not found');
            const buf = readFileSync(file);
            res.writeHead(200, {
              'content-type': 'image/jpeg',
              'content-length': buf.length,
              'cache-control': 'public, max-age=86400, immutable',
            });
            return res.end(buf);
          }

          if (url.startsWith(`${PREFIX}/animation/`)) {
            const id = safeId(url.slice(`${PREFIX}/animation/`.length));
            const file = id ? join(OUTPUT_DIR, `${id}.html`) : '';
            if (!file || !existsSync(file)) return send(res, 404, 'not found');
            const html = readFileSync(file, 'utf8');
            res.writeHead(200, {
              'content-type': 'text/html; charset=utf-8',
              'content-length': Buffer.byteLength(html),
              'cache-control': 'no-store',
            });
            return res.end(html);
          }

          return send(res, 404, 'not found');
        } catch (error) {
          trace(`error ${req.method} ${url} :: ${error?.message || error}`);
          if (!res.headersSent) send(res, 500, error?.message || 'internal error');
          else res.end();
        }
      };

      return webServer.register({ kind: 'prefix', path: PREFIX, handler });
    }, 'code-animation-studio:routes');
  }
}
