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
import { appendFileSync, existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { OUTPUT_DIR, STILLS_DIR, catalog } from './data.js';
import { registerFlowSection } from './flow.js';
import { registerCreationTools } from './tools.js';

const PREFIX = '/code-animation-api';
const LOG_FILE = fileURLToPath(new URL('./api.log', import.meta.url));

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
      return webServer.register({
      kind: 'prefix',
      path: PREFIX,
      handler: (req, res) => {
        const url = req.url || '';
        try {
          if (url.startsWith(`${PREFIX}/health`)) {
            return send(res, 200, JSON.stringify({
              ok: true,
              styles: catalog().styles.length,
              stills: catalog().styles.filter((s) => s.still).length,
            }), 'application/json; charset=utf-8');
          }

          if (url.startsWith(`${PREFIX}/still/`)) {
            const id = safeId(url.slice(`${PREFIX}/still/`.length));
            const file = id ? `${STILLS_DIR}${id}.jpg` : '';
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
            const file = id ? `${OUTPUT_DIR}${id}.html` : '';
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
          trace(`error ${url} :: ${error?.message || error}`);
          if (!res.headersSent) send(res, 500, error?.message || 'internal error');
          else res.end();
        }
      },
      });
    }, 'code-animation-studio:routes');
  }
}
