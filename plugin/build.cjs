// Generate client.js from src/ui.js, inlining the procedural score from src/music.js.
// The client module system can only `require('react')`, so anything else the browser
// half needs must live in this one file.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = __dirname;
const MARKER = '/* __MUSIC_ENGINE__ */';

let ui = fs.readFileSync(path.join(dir, 'src/ui.js'), 'utf8');
const music = fs.readFileSync(path.join(dir, 'src/music.js'), 'utf8');

if (!ui.includes(MARKER)) throw new Error(`src/ui.js is missing the ${MARKER} marker`);
ui = ui.replace(MARKER, () => music);

// The composer's own end marker is meaningless once inlined.
ui = ui.replace('/* __MUSIC_EXPORTS__ */', '');

let registered = 0;
const sandbox = {
  window: { __ModuleLoader__: { load: () => { registered++; } } },
  console,
  navigator: { clipboard: { writeText: async () => {} } },
  document: { createElement: () => ({ style: {}, select() {}, remove() {} }), body: { appendChild() {}, removeChild() {} } },
};
vm.runInNewContext(ui, sandbox, { filename: 'client.js' });
if (registered !== 1) throw new Error(`expected exactly one __ModuleLoader__.load call, got ${registered}`);

fs.writeFileSync(path.join(dir, 'client.js'), ui, 'utf8');
console.log('client.js written:', ui.length, 'bytes (score inlined:', music.length, ') | loader calls:', registered);
