const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { load } = require('./helpers.cjs');
const validation = load('supabase/functions/nutrition-analysis/validation.ts');
const targets = { calories: 2000, protein: 100, carbs: 200, fats: 60 };
const meal = {
  foodName: 'Rice',
  servingSize: '100g',
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  confidence: 0.5,
};
function endpoint(output = meal, raw = false, options = {}) {
  let handler;
  const calls = [];
  const code = ts.transpileModule(
    fs.readFileSync('supabase/functions/nutrition-analysis/index.ts', 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const context = {
    exports: {},
    require: () => validation,
    Response,
    Request,
    AbortController,
    RangeError,
    setTimeout,
    clearTimeout,
    Deno: {
      env: {
        get: (key) =>
          options.missing?.includes(key) ? undefined : 'configured',
      },
      serve: (fn) => {
        handler = fn;
      },
    },
    fetch: async (url, requestOptions) => {
      calls.push({ url, options: requestOptions });
      if (url.includes('/auth/'))
        return Response.json(
          { id: 'owner' },
          { status: options.authStatus ?? 200 },
        );
      if (url.includes('/rpc/'))
        return Response.json(
          options.quotaStatus
            ? { message: options.quotaMessage ?? 'Daily limit reached' }
            : 1,
          { status: options.quotaStatus ?? 200 },
        );
      if (options.providerStatus)
        return Response.json(
          { error: 'provider failure' },
          { status: options.providerStatus },
        );
      return Response.json({
        candidates: [
          {
            content: {
              parts: [{ text: raw ? output : JSON.stringify(output) }],
            },
          },
        ],
      });
    },
  };
  vm.runInNewContext(code, context);
  return { handler, calls };
}
const request = (body) =>
  new Request('https://example.test', {
    method: 'POST',
    headers: { authorization: 'Bearer test' },
    body: JSON.stringify(body),
  });
test('analysis endpoint rejects invalid bodies before reserving quota', async () => {
  for (const body of [
    null,
    [],
    { kind: 'text', transcript: '' },
    {
      kind: 'plan',
      targets: { ...targets, protein: -1 },
      preference: 'balanced',
    },
    { kind: 'text', transcript: 'rice', base64: 'abcd' },
  ]) {
    const { handler, calls } = endpoint();
    assert.equal((await handler(request(body))).status, 400);
    assert.equal(calls.length, 1);
  }
});
test('analysis endpoint accepts valid zero nutrition but rejects malformed model output', async () => {
  for (const output of [
    [],
    { foodName: 'Rice' },
    { ...meal, calories: -1 },
    { ...meal, breakdown: {} },
    { ...meal, confidence: 2 },
  ]) {
    const { handler } = endpoint(output);
    assert.equal(
      (await handler(request({ kind: 'text', transcript: 'rice' }))).status,
      502,
    );
  }
  const { handler } = endpoint();
  const result = await handler(request({ kind: 'text', transcript: 'rice' }));
  assert.equal(result.status, 200);
  assert.deepEqual(await result.json(), meal);
});
test('analysis endpoint requires authorization and enforces declared body limit', async () => {
  const { handler, calls } = endpoint();
  assert.equal(
    (await handler(new Request('https://example.test', { method: 'POST' })))
      .status,
    401,
  );
  assert.equal(calls.length, 0);
  const req = request({ kind: 'text', transcript: 'rice' });
  req.headers.set('content-length', '8000001');
  assert.equal((await handler(req)).status, 413);
});
test('request validation rejects partial and incompatible plan targets', () => {
  assert.equal(
    validation.validRequest({ kind: 'plan', targets, preference: 'vegan' }),
    true,
  );
  assert.equal(
    validation.validRequest({
      kind: 'plan',
      targets: { calories: 2000 },
      preference: 'vegan',
    }),
    false,
  );
  assert.equal(
    validation.validRequest({
      kind: 'plan',
      targets: { ...targets, protein: 2000 },
      preference: 'vegan',
    }),
    false,
  );
});

test('malformed provider JSON is an upstream failure, not a user input error', async () => {
  const { handler } = endpoint('not json', true);
  assert.equal(
    (await handler(request({ kind: 'text', transcript: 'rice' }))).status,
    502,
  );
});
test('streamed body limit is enforced even without a content-length header', async () => {
  let cancelled = false;
  const stream = new ReadableStream({
    pull(controller) {
      controller.enqueue(new Uint8Array(2000000));
    },
    cancel() {
      cancelled = true;
    },
  });
  const req = new Request('https://example.test', {
    method: 'POST',
    body: stream,
    duplex: 'half',
  });
  await assert.rejects(
    validation.readRequest(req, new AbortController().signal),
    /smaller photo/,
  );
  assert.equal(cancelled, true);
});
test('aborted request cannot wait indefinitely for streamed input', async () => {
  const controller = new AbortController();
  let cancelled = false;
  const req = new Request('https://example.test', {
    method: 'POST',
    duplex: 'half',
    body: new ReadableStream({
      cancel() {
        cancelled = true;
      },
    }),
  });
  const reading = validation.readRequest(req, controller.signal);
  controller.abort();
  await assert.rejects(reading, /timed out/);
  assert.equal(cancelled, true);
});

test('unconfigured AI still authenticates and never reserves quota or calls Gemini', async () => {
  const { handler, calls } = endpoint(meal, false, {
    missing: ['GEMINI_API_KEY'],
  });
  const response = await handler(
    request({ kind: 'plan', targets, preference: 'balanced' }),
  );
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /Everyday ideas/);
  assert.equal(calls.length, 1);
  assert.equal(
    (await handler(new Request('https://example.test', { method: 'POST' })))
      .status,
    401,
  );
});
test('expired authentication cannot reserve quota or reach the provider', async () => {
  const { handler, calls } = endpoint(meal, false, { authStatus: 401 });
  assert.equal(
    (await handler(request({ kind: 'plan', targets, preference: 'balanced' })))
      .status,
    401,
  );
  assert.equal(calls.length, 1);
});
test('quota exhaustion is distinct from database failure and prevents Gemini calls', async () => {
  for (const [options, status] of [
    [{ quotaStatus: 400 }, 429],
    [{ quotaStatus: 400, quotaMessage: 'Permission denied' }, 503],
    [{ quotaStatus: 503, quotaMessage: 'Service unavailable' }, 503],
  ]) {
    const { handler, calls } = endpoint(meal, false, options);
    assert.equal(
      (
        await handler(
          request({ kind: 'plan', targets, preference: 'balanced' }),
        )
      ).status,
      status,
    );
    assert.equal(calls.length, 2);
  }
});
test('provider failures retain meal-specific fallback and do not automatically retry', async () => {
  for (const status of [429, 500]) {
    const { handler, calls } = endpoint(meal, false, {
      providerStatus: status,
    });
    const response = await handler(
      request({ kind: 'plan', targets, preference: 'balanced' }),
    );
    assert.equal(response.status, status === 429 ? 429 : 502);
    assert.match(
      (await response.json()).error,
      /current ideas remain available/,
    );
    assert.equal(calls.length, 3);
  }
});

test('photo analysis sends the image with a whole-portion prompt and returns every editable nutrition field', async () => {
  const expected = { foodName: 'Banana', servingSize: '1 medium banana, about 118 g', calories: 105, protein: 1.3, carbs: 27, fats: 0.3, confidence: 0.7, breakdown: [{ item: 'Banana', portion: '118 g edible portion', calories: 105 }] };
  const { handler, calls } = endpoint(expected);
  const response = await handler(request({ kind: 'food', base64: 'abcd', mimeType: 'image/jpeg' }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected);
  const provider = JSON.parse(calls.at(-1).options.body);
  const parts = provider.contents[0].parts;
  assert.equal(parts[1].inlineData.mimeType, 'image/jpeg');
  assert.equal(parts[1].inlineData.data, 'abcd');
  assert.match(parts[0].text, /whole pictured portion/);
  assert.match(parts[0].text, /hidden ingredients are uncertain/);
});
test('a nonfood photo response remains an error and cannot fabricate a meal', async () => {
  const { handler } = endpoint({ error: 'No edible food is visible. Choose a meal photo.' });
  const response = await handler(request({ kind: 'food', base64: 'abcd', mimeType: 'image/jpeg' }));
  const body = await response.json();
  assert.equal(body.error, 'No edible food is visible. Choose a meal photo.');
  assert.equal(body.calories, undefined);
  const { validateDetection } = load('src/services/nutritionApi.ts', { './supabase': { supabase: {} } });
  assert.throws(() => validateDetection(body));
});
