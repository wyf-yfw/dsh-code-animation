#!/usr/bin/env node
/**
 * Render docs/cover.html to docs/cover.png at 1280×640 with a 2× device scale.
 *
 *   node docs/shoot-cover.cjs
 *   CHROME="/path/to/chrome" node docs/shoot-cover.cjs
 *
 * Uses the Chrome DevTools Protocol over a headless browser, so the only
 * requirement is a Chrome/Edge/Chromium binary. No npm dependencies.
 */
const { spawn } = require('node:child_process');
const { existsSync, mkdirSync, statSync, writeFileSync } = require('node:fs');
const http = require('node:http');
const { dirname, join, resolve } = require('node:path');

const WIDTH = 1280;
const HEIGHT = 640;
const SCALE = 2;
const PORT = 9411;

const HERE = __dirname;
const SOURCE = join(HERE, 'cover.html');
const TARGET = join(HERE, 'cover.png');

const CANDIDATES = [
  process.env.CHROME,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/microsoft-edge',
].filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const getJson = (path) => new Promise((res, rej) => {
  http.get({ host: '127.0.0.1', port: PORT, path }, (r) => {
    let b = '';
    r.on('data', (c) => (b += c));
    r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } });
  }).on('error', rej);
});

(async () => {
  const browser = CANDIDATES.find((p) => existsSync(p));
  if (!browser) {
    console.error('No Chrome/Edge/Chromium found. Set CHROME=<path> and retry.');
    process.exit(1);
  }
  if (!existsSync(SOURCE)) {
    console.error('Missing', SOURCE);
    process.exit(1);
  }
  mkdirSync(dirname(TARGET), { recursive: true });
  console.log('browser:', browser);

  const proc = spawn(browser, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    `--user-data-dir=${join(process.env.TEMP || '/tmp', `cover-${Date.now()}`)}`,
    'about:blank',
  ], { stdio: 'ignore' });

  try {
    let target;
    for (let i = 0; i < 50; i++) {
      await sleep(300);
      try {
        target = (await getJson('/json/list')).find((t) => t.type === 'page');
        if (target) break;
      } catch { /* not listening yet */ }
    }
    if (!target) throw new Error('DevTools endpoint never came up');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

    let id = 0;
    const pending = new Map();
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
    };
    const send = (method, params = {}) => new Promise((res, rej) => {
      const mid = ++id;
      pending.set(mid, (m) => (m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result)));
      ws.send(JSON.stringify({ id: mid, method, params }));
    });

    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', {
      width: WIDTH, height: HEIGHT, deviceScaleFactor: SCALE, mobile: false,
    });
    await send('Page.navigate', { url: `file:///${resolve(SOURCE).replace(/\\/g, '/')}` });
    await sleep(2200); // let the tile grid paint

    const shot = await send('Page.captureScreenshot', { format: 'png' });
    writeFileSync(TARGET, Buffer.from(shot.data, 'base64'));
    console.log(`wrote ${TARGET} (${WIDTH * SCALE}×${HEIGHT * SCALE}, ${statSync(TARGET).size} bytes)`);
    ws.close();
  } finally {
    proc.kill();
  }
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
