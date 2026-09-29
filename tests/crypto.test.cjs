const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');
const { memoryStorage } = require('./helpers.cjs');

function runtime(os, existingCrypto) {
  const warnings = [];
  const calls = { random: 0, digest: 0 };
  const nativeCrypto = {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomValues(array) {
      calls.random++;
      return webcrypto.getRandomValues(array);
    },
    digest(algorithm, data) {
      calls.digest++;
      return webcrypto.subtle.digest(algorithm, data);
    },
  };
  const context = vm.createContext({
    crypto: existingCrypto,
    TextEncoder,
    Uint8Array,
    Uint32Array,
    URL,
    URLSearchParams,
    console: { ...console, warn: message => warnings.push(message) },
    btoa: value => Buffer.from(value, 'binary').toString('base64'),
  });
  const module = { exports: {} };
  context.exports = module.exports;
  context.module = module;
  context.require = name => {
    if (name === 'react-native') return { Platform: { OS: os } };
    if (name === 'expo-crypto') return nativeCrypto;
    throw new Error(`Unexpected import: ${name}`);
  };
  const source = fs.readFileSync('src/services/authCrypto.ts', 'utf8');
  vm.runInContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  const adapter = module.exports;

  // Evaluate the installed Supabase helper in the same globals as the app's
  // adapter, so a Node WebCrypto implementation cannot hide the original bug.
  const helperPath = require.resolve('@supabase/auth-js/dist/main/lib/helpers.js');
  const helper = { exports: {} };
  context.require = createRequire(helperPath);
  context.module = helper;
  context.exports = helper.exports;
  vm.runInContext(fs.readFileSync(helperPath, 'utf8'), context);
  return { context, adapter, helper: helper.exports, warnings, calls };
}

test('native PKCE uses S256 and secure randomness with no plain-fallback warning', async () => {
  for (const os of ['ios', 'android']) {
    const env = runtime(os);
    env.adapter.requireAuthCrypto();
    // RFC 7636 Appendix B test vector verifies the exact SHA-256/base64url bytes.
    assert.equal(
      await env.helper.generatePKCEChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
    const [challenge, method] = await env.helper.getCodeChallengeAndMethod(memoryStorage(), 'auth-test');
    assert.equal(method, 's256');
    assert.match(challenge, /^[A-Za-z0-9_-]{43}$/);
    assert.ok(env.calls.random >= 2);
    assert.equal(env.calls.digest, 2);
    assert.deepEqual(env.warnings, []);
  }
});

test('existing crypto implementations are preserved on native and web', async () => {
  for (const os of ['ios', 'web']) {
    const env = runtime(os, webcrypto);
    env.adapter.requireAuthCrypto();
    assert.equal(env.context.crypto, webcrypto);
    assert.equal(
      await env.helper.generatePKCEChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk'),
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
    assert.equal(env.calls.random, 0);
    assert.equal(env.calls.digest, 0);
  }
});

test('insecure web origins are rejected without installing a recursive web adapter', () => {
  const incomplete = { getRandomValues: webcrypto.getRandomValues.bind(webcrypto) };
  const env = runtime('web', incomplete);
  assert.equal(env.context.crypto, incomplete);
  assert.equal(env.context.crypto.subtle, undefined);
  assert.throws(() => env.adapter.requireAuthCrypto(), /HTTPS or localhost/);
  assert.equal(env.calls.digest, 0);
});

test('the native adapter rejects unsupported algorithms instead of returning an incorrect digest', async () => {
  const env = runtime('ios');
  await assert.rejects(
    env.context.crypto.subtle.digest('SHA-512', new Uint8Array([1, 2, 3])),
    /only supports SHA-256/,
  );
});
