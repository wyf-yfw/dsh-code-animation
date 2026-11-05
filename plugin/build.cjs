// Generate client.js from src/ui.js.
//
// The client module system can only `require('react')`, so the whole browser half has
// to live in this one file. There is no procedural score engine any more: every clip's
// music is the score_js the model wrote for it, so nothing gets inlined here.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const dir = __dirname;

let ui = fs.readFileSync(path.join(dir, 'src/ui.js'), 'utf8');

// 兜底引擎已经删除：源码里再出现这些名字，说明有人把回退逻辑又接回来了。
for (const banned of ['renderMusic', 'previewMusic', 'kitFor(', '__MUSIC_ENGINE__']) {
  if (ui.includes(banned)) throw new Error(`src/ui.js still references ${banned}: 配乐只能是模型写的`);
}

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
console.log('client.js written:', ui.length, 'bytes | loader calls:', registered);
