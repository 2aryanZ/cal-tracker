const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
function load(file, mocks = {}, cache = {}) {
  const absolute = path.resolve(file);
  if (cache[absolute]) return cache[absolute].exports;
  const module = { exports: {} };
  cache[absolute] = module;
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const requireMock = name => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('.')) return load(path.resolve(path.dirname(absolute),name) + '.ts', mocks, cache);
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', mocks, cache);
    return require(name);
  };
  vm.runInNewContext(code, { require: requireMock, exports: module.exports, module, process: { env: {} }, console, URL, URLSearchParams, AbortController, Response, Request, Blob, TextDecoder, TextEncoder, RangeError, setTimeout, clearTimeout, fetch: mocks.fetch ?? fetch, Date: mocks.Date ?? Date, Math, setInterval, clearInterval, window: undefined }, { filename: absolute });
  return module.exports;
}
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    async getItem(key) { await Promise.resolve(); return data.get(key) ?? null; },
    async setItem(key, value) { await Promise.resolve(); data.set(key, value); },
    async removeItem(key) { data.delete(key); },
    async multiSet(pairs) { for (const [key,value] of pairs) data.set(key,value); },
    async multiRemove(keys) { keys.forEach(key => data.delete(key)); },
    async getAllKeys() { return [...data.keys()]; },
  };
}
module.exports = { load, memoryStorage };
