// Generate client.js from src/ui.js and syntax-check it.
// The catalog is no longer inlined: tool cards read their payload from the tool
// result's presentationMeta, which the Host projects. This keeps the browser
// bundle small and the catalog in one place (styles.json).
const fs = require('node:fs');
const path = require('node:path');

const dir = __dirname;
const ui = fs.readFileSync(path.join(dir, 'src/ui.js'), 'utf8');

let registered = 0;
const sandbox = {
  window: { __ModuleLoader__: { load: () => { registered++; } } },
  console,
  navigator: { clipboard: { writeText: async () => {} } },
  document: { createElement: () => ({ style: {}, select() {}, remove() {} }), body: { appendChild() {}, removeChild() {} } },
};
const vm = require('node:vm');
vm.runInNewContext(ui, sandbox, { filename: 'client.js' });
if (registered !== 1) throw new Error(`expected exactly one __ModuleLoader__.load call, got ${registered}`);

fs.writeFileSync(path.join(dir, 'client.js'), ui, 'utf8');
console.log('client.js written:', ui.length, 'bytes | loader calls:', registered);
