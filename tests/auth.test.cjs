const test = require('node:test');
const assert = require('node:assert/strict');
const { load, memoryStorage } = require('./helpers.cjs');
function subject(auth, browser = {}, redirectUrl = 'caltracker://') {
  return load('src/services/supabase.ts', {
    './authCrypto': { requireAuthCrypto() {} },
    'react-native-url-polyfill/auto': {},
    'react-native': { Platform: { OS: 'ios' } },
    '@react-native-async-storage/async-storage': memoryStorage(),
    '@supabase/supabase-js': { createClient: () => ({ auth }) },
    'expo-web-browser': { maybeCompleteAuthSession() {}, ...browser },
    'expo-linking': { createURL: () => redirectUrl },
  });
}
test('invalid password attempts exactly the supplied password once; never creates an account', async () => {
  const attempts = [];
  const api = subject({ signInWithPassword: async c => { attempts.push(c); return { data: {}, error: { message: 'Invalid login credentials' } }; }, signUp: () => assert.fail('sign-in must not register') });
  const result = await api.supabaseSignIn(' USER@EMAIL.COM ', 'wrong-password');
  assert.equal(result.user, null);
  assert.equal(result.error, 'Invalid login credentials');
  assert.deepEqual(attempts.map(x => [x.email,x.password]), [['user@email.com','wrong-password']]);
});
test('missing/short password cannot start network authentication', async () => {
  const api = subject({ signInWithPassword: () => assert.fail('network auth called') });
  assert.equal((await api.supabaseSignIn('user@email.com')).user, null);
  assert.ok((await api.supabaseSignIn('user@email.com','abc')).error);
});
test('confirmation-only signup does not claim to be signed in', async () => {
  const api = subject({ signUp: async () => ({ data: { user: { id: 'real-user' }, session: null }, error: null }) });
  const result = await api.supabaseSignUp('user@email.com','my-own-password');
  assert.equal(result.user, null);
  assert.equal(result.confirmationRequired, true);
});
test('successful session yields the real user and no invented paid subscription', async () => {
  const user = { id: 'real-user', email: 'user@email.com', user_metadata: { full_name: 'Real User' } };
  const api = subject({ signInWithPassword: async () => ({ data: { session: { user }, user }, error: null }) });
  const result = await api.supabaseSignIn(user.email,'my-own-password');
  assert.equal(result.user.id, user.id);
  assert.equal(result.user.isLoggedIn, true);
  assert.equal(result.user.tier, 'Free');
});
test('network failure cannot fabricate a logged-in account', async () => {
  const api = subject({ signInWithPassword: async () => { throw new Error('offline'); } });
  assert.equal((await api.supabaseSignIn('user@email.com','my-own-password')).user, null);
});
test('Google uses provider OAuth and cancellation remains logged out', async () => {
  let provider;
  const api = subject({ signInWithOAuth: async options => { provider = options.provider; return { data: { url: 'https://example.com/auth' }, error: null }; } }, { openAuthSessionAsync: async () => ({ type: 'cancel' }) });
  const result = await api.supabaseSignInWithGoogle();
  assert.equal(provider, 'google');
  assert.equal(result.user, null);
  assert.equal(result.error, 'cancelled');
});
test('network errors explain the server problem without claiming authentication succeeded', async () => {
  for (const message of ['Network request failed', 'Failed to fetch', 'fetch failed', 'Load failed']) {
    const api = subject({
      signInWithPassword: async () => ({ data: {}, error: { message } }),
      signUp: async () => { throw new Error(message); },
      signInWithOAuth: async () => ({ data: {}, error: { message } }),
    });
    for (const result of [
      await api.supabaseSignIn('user@email.com', 'my-password'),
      await api.supabaseSignUp('user@email.com', 'my-password'),
      await api.supabaseSignInWithGoogle(),
    ]) {
      assert.equal(result.user, null);
      assert.match(result.error, /Unable to reach the sign-in server/);
      assert.match(result.error, /Supabase project/);
    }
  }
});
test('Expo Go does not start unsupported OAuth; it explains the email alternative', async () => {
  for (const redirect of ['exp://192.168.1.5:8081/--/', 'exps://example.exp.direct/--/']) {
    const api = subject({ signInWithOAuth: () => assert.fail('OAuth started in Expo Go') }, {
      openAuthSessionAsync: () => assert.fail('browser opened in Expo Go'),
    }, redirect);
    for (const result of [await api.supabaseSignInWithGoogle(), await api.supabaseSignInWithApple()]) {
      assert.equal(result.user, null);
      assert.match(result.error, /development or installed build/);
      assert.match(result.error, /Email & Password/);
    }
  }
});
test('installed builds exchange the provider callback code for a real session', async () => {
  const user = { id: 'google-user', email: 'user@email.com' };
  const calls = [];
  const api = subject({
    signInWithOAuth: async options => { calls.push(options); return { data: { url: 'https://example.com/auth' }, error: null }; },
    exchangeCodeForSession: async code => { assert.equal(code, 'valid-code'); return { data: { session: { user } }, error: null }; },
  }, { openAuthSessionAsync: async () => ({ type: 'success', url: 'caltracker://?code=valid-code' }) });
  assert.equal((await api.supabaseSignInWithGoogle()).user.id, user.id);
  assert.equal(calls[0].options.redirectTo, 'caltracker://');
});
