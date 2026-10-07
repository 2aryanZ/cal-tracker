const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');

function photoService(options = {}) {
  const calls = [];
  const image = {
    release: () => calls.push('release image'),
    saveAsync: async (settings) => {
      calls.push({ save: settings });
      if (options.saveError) throw Error('Cannot encode image');
      return { uri: 'cache/normalized.jpg', width: 1280, height: 960, base64: options.base64 ?? 'abcd' };
    },
  };
  const context = {
    resize: (size) => calls.push({ resize: size }),
    renderAsync: async () => {
      calls.push('render');
      options.onRender?.();
      return image;
    },
    release: () => calls.push('release context'),
  };
  const service = load('src/services/mealPhotoService.ts', {
    'expo-image-manipulator': {
      ImageManipulator: { manipulate: (uri) => { calls.push({ source: uri }); return context; } },
      SaveFormat: { JPEG: 'jpeg' },
    },
  });
  return { service, calls };
}

test('large photos are resized without distortion and normalized to bounded JPEG uploads', async () => {
  const { service, calls } = photoService();
  const result = await service.prepareMealPhoto({ uri: 'local/meal.heic', width: 4000, height: 3000 });
  assert.equal(result.mimeType, 'image/jpeg');
  assert.equal(result.base64, 'abcd');
  assert.equal(result.uri, 'cache/normalized.jpg');
  const resize = calls.find(call => call.resize).resize;
  assert.equal(resize.width, 1280);
  assert.equal(resize.height, 960);
  const save = calls.find(call => call.save).save;
  assert.equal(save.format, 'jpeg');
  assert.equal(save.compress, 0.75);
  assert.equal(save.base64, true);
  assert.deepEqual(calls.slice(-2), ['release image', 'release context']);
});
test('small photos are not upscaled and labels can retain a 1600-pixel edge', async () => {
  const small = photoService();
  await small.service.prepareMealPhoto({ uri: 'local/small.png', width: 400, height: 600 });
  assert.equal(small.calls.some(call => call.resize), false);
  const label = photoService();
  await label.service.prepareMealPhoto({ uri: 'local/label.jpg', width: 2000, height: 4000 }, undefined, 1600);
  assert.equal(label.calls.find(call => call.resize).resize.width, 800);
  assert.equal(label.calls.find(call => call.resize).resize.height, 1600);
});
test('cancelled photo preparation cannot encode or return a late image', async () => {
  const controller = new AbortController();
  controller.abort();
  const before = photoService();
  await assert.rejects(before.service.prepareMealPhoto({ uri: 'local/photo.jpg', width: 100, height: 100 }, controller.signal), /cancelled/);
  assert.equal(before.calls.length, 0);
  const afterRender = new AbortController();
  const during = photoService({ onRender: () => afterRender.abort() });
  await assert.rejects(during.service.prepareMealPhoto({ uri: 'local/photo.jpg', width: 100, height: 100 }, afterRender.signal), /cancelled/);
  assert.equal(during.calls.some(call => call.save), false);
  assert.deepEqual(during.calls.slice(-2), ['release image', 'release context']);
});
test('invalid dimensions, empty output, oversized uploads and encoding errors cannot reach AI', async () => {
  const invalid = photoService();
  await assert.rejects(invalid.service.prepareMealPhoto({ uri: 'local/photo.jpg', width: 0, height: 100 }), /read this photo/);
  assert.equal(invalid.calls.length, 0);
  for (const settings of [{ base64: '' }, { base64: 'x'.repeat(4_000_001) }, { saveError: true }]) {
    const { service, calls } = photoService(settings);
    await assert.rejects(service.prepareMealPhoto({ uri: 'local/photo.jpg', width: 100, height: 100 }));
    assert.deepEqual(calls.slice(-2), ['release image', 'release context']);
  }
});
test('photo and label analysis preserve all real nutrition fields and bind requests to the initiating account', async () => {
  const calls = [];
  const detection = { foodName: 'Banana', servingSize: '1 medium banana (about 118 g)', calories: 105, protein: 1.3, carbs: 27, fats: 0, confidence: 0.7, breakdown: [{ item: 'Banana', portion: '118 g edible portion', calories: 105 }] };
  const api = load('src/services/aiFoodService.ts', { './nutritionApi': {
    requestNutrition: async (...args) => { calls.push(args); return detection; },
    validateDetection: value => value,
  } });
  const controller = new AbortController();
  for (const [kind, analyze] of [['food', api.analyzeFoodImage], ['label', api.analyzeNutritionLabelImage]]) {
    const result = await analyze('cache/photo.jpg', 'abcd', 'image/jpeg', controller.signal, 'account-a');
    assert.equal(result, detection);
    const [body, signal, owner] = calls.at(-1);
    assert.equal(body.kind, kind);
    assert.equal(body.mimeType, 'image/jpeg');
    assert.equal(body.base64, 'abcd');
    assert.equal(signal, controller.signal);
    assert.equal(owner, 'account-a');
  }
});
test('capture lock prevents overlapping picker/AI requests and ignores old completions after cancellation', () => {
  const { createScanSession } = load('src/services/scanSession.ts');
  const session = createScanSession();
  const old = session.begin();
  assert.ok(old);
  assert.equal(session.begin(), null);
  session.cancel();
  assert.equal(old.signal.aborted, true);
  const next = session.begin();
  assert.equal(session.isCurrent(old), false);
  session.finish(old);
  assert.equal(session.isCurrent(next), true);
  assert.equal(session.begin(), null);
  session.finish(next);
  assert.ok(session.begin());
});
