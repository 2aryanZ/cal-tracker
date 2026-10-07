const test = require('node:test');
const assert = require('node:assert/strict');
const { load, memoryStorage } = require('./helpers.cjs');
const targets = { calories: 2000, protein: 100, carbs: 200, fats: 60 };
const preferences = [
  'balanced',
  'high_protein',
  'keto',
  'vegan',
  'vegetarian',
  'mediterranean',
  'paleo',
  'intermittent_fasting',
];
const local = load('src/services/localMealPlanService.ts');
const catalog = load('src/data/mealRecipes.ts');
function aiPlan(now = Date.now()) {
  return {
    id: 'ai-test',
    createdAt: new Date(now).toISOString(),
    meals: ['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => ({
      mealType,
      name: 'Oat bowl',
      description: '',
      calories: 500,
      protein: 25,
      carbs: 75,
      fats: 11.1,
      portionSize: '1 bowl',
      ingredients: ['100 g dry oats'],
    })),
  };
}
function cache(storage = memoryStorage()) {
  return load('src/services/mealPlanCache.ts', {
    '@react-native-async-storage/async-storage': storage,
  });
}
test('all preferences have four valid offline meals with bounded ingredient quantities', () => {
  assert.equal(catalog.MEAL_RECIPES.length, 36);
  for (const preference of preferences)
    for (const calories of [1, 1200, 2000, 10000])
      for (const revision of [0, 1, 2, 3]) {
        const plan = local.everydayMealPlan(
          { calories, protein: 0, carbs: 0, fats: 0 },
          preference,
          revision,
          '2026-10-07',
        );
        assert.equal(new Set(plan.meals.map((m) => m.mealType)).size, 4);
        for (const meal of plan.meals) {
          assert.ok(
            Math.abs(
              meal.calories -
                (meal.protein * 4 + meal.carbs * 4 + meal.fats * 9),
            ) <= 0.5,
          );
          const original = catalog.MEAL_RECIPES.find(
            (r) => r.name === meal.name,
          );
          assert.ok(local.recipeMatches(original, preference));
          meal.ingredients.forEach((line, index) => {
            const grams = Number(line.split(' ')[0]);
            assert.ok(
              grams >= Math.floor(original.ingredients[index][1] * 0.75),
            );
            assert.ok(grams <= Math.ceil(original.ingredients[index][1] * 1.5));
          });
          if (preference === 'keto')
            assert.ok(meal.carbs * 4 <= meal.calories * 0.1);
        }
      }
});
test('local totals are estimates from recipes, never copied from extreme targets', () => {
  const plan = local.everydayMealPlan(
    { calories: 10000, protein: 1, carbs: 1, fats: 1 },
    'balanced',
  );
  assert.ok(local.mealPlanTotals(plan).calories < 5000);
  assert.equal(plan.targetCalories, 10000);
  assert.notEqual(local.mealPlanTotals(plan).protein, 1);
});
test('other everyday ideas change recipes without an API dependency', () => {
  const plans = [0, 1, 2].map((n) =>
    local.everydayMealPlan(targets, 'vegan', n, '2026-10-07'),
  );
  assert.ok(
    new Set(plans.map((p) => p.meals.map((m) => m.name).join(','))).size > 1,
  );
});
test('AI cache isolates accounts and every nutrition target and preference', async () => {
  const storage = memoryStorage(),
    service = cache(storage),
    now = Date.now();
  await service.saveMealPlanCache('alice', targets, 'vegan', aiPlan(now), now);
  assert.ok(await service.readMealPlanCache('alice', targets, 'vegan', now));
  assert.equal(
    await service.readMealPlanCache('bob', targets, 'vegan', now),
    null,
  );
  assert.equal(
    await service.readMealPlanCache('guest', targets, 'vegan', now),
    null,
  );
  for (const field of ['calories', 'protein', 'carbs', 'fats'])
    assert.equal(
      await service.readMealPlanCache(
        'alice',
        { ...targets, [field]: targets[field] + 1 },
        'vegan',
        now,
      ),
      null,
    );
  assert.equal(
    await service.readMealPlanCache('alice', targets, 'balanced', now),
    null,
  );
  await service.saveMealPlanCache(
    'guest',
    targets,
    'balanced',
    aiPlan(now),
    now,
  );
  assert.equal(storage.data.has(service.mealPlanCacheKey('guest')), false);
});
test('cache expires at local midnight, 24 hours, and rejects future timestamps', async () => {
  const storage = memoryStorage(),
    service = cache(storage);
  const now = new Date(2026, 9, 7, 23, 55).getTime();
  await service.saveMealPlanCache('alice', targets, 'vegan', aiPlan(now), now);
  assert.ok(
    await service.readMealPlanCache('alice', targets, 'vegan', now + 60000),
  );
  assert.equal(
    await service.readMealPlanCache(
      'alice',
      targets,
      'vegan',
      now + 10 * 60000,
    ),
    null,
  );
  assert.equal(
    await service.readMealPlanCache('alice', targets, 'vegan', now + 86400000),
    null,
  );
  assert.equal(
    await service.readMealPlanCache('alice', targets, 'vegan', now - 1),
    null,
  );
});
test('corrupt and incoherent cached plans are ignored, valid entries preserve IDs and dates', async () => {
  const storage = memoryStorage(),
    service = cache(storage),
    now = Date.now();
  storage.data.set(service.mealPlanCacheKey('alice'), 'not json');
  assert.equal(
    await service.readMealPlanCache('alice', targets, 'vegan', now),
    null,
  );
  await service.saveMealPlanCache('alice', targets, 'vegan', aiPlan(now), now);
  const valid = await service.readMealPlanCache('alice', targets, 'vegan', now);
  assert.equal(valid.id, 'ai-test');
  assert.equal(valid.createdAt, aiPlan(now).createdAt);
  const value = JSON.parse(storage.data.get(service.mealPlanCacheKey('alice')));
  value[0].plan.meals[0].fats = 999;
  storage.data.set(service.mealPlanCacheKey('alice'), JSON.stringify(value));
  assert.equal(
    await service.readMealPlanCache('alice', targets, 'vegan', now),
    null,
  );
  await assert.rejects(
    service.saveMealPlanCache(
      'alice',
      targets,
      'vegan',
      { ...aiPlan(now), meals: [null] },
      now,
    ),
  );
});
test('cache is bounded and concurrent writes do not lose records; clearing affects one account', async () => {
  const storage = memoryStorage(),
    service = cache(storage),
    now = Date.now();
  await Promise.all(
    Array.from({ length: 12 }, (_, protein) =>
      service.saveMealPlanCache(
        'alice',
        { ...targets, protein },
        'vegan',
        aiPlan(now),
        now,
      ),
    ),
  );
  const values = JSON.parse(
    storage.data.get(service.mealPlanCacheKey('alice')),
  );
  assert.equal(values.length, 8);
  assert.equal(new Set(values.map((v) => v.key)).size, 8);
  await service.saveMealPlanCache('bob', targets, 'vegan', aiPlan(now), now);
  await service.clearMealPlanCache('alice');
  assert.equal(
    await service.readMealPlanCache('alice', targets, 'vegan', now),
    null,
  );
  assert.ok(await service.readMealPlanCache('bob', targets, 'vegan', now));
});
test('AI plan validation safely rejects malformed meals and missing quantities', () => {
  const rules = load('src/services/mealPlanRules.ts');
  for (const meal of [
    null,
    { name: 1 },
    { ...aiPlan().meals[0], portionSize: 123 },
    { ...aiPlan().meals[0], ingredients: ['oats'] },
  ]) {
    assert.throws(() =>
      rules.validateMealPlan(
        { meals: [meal, ...aiPlan().meals.slice(1)] },
        targets,
        'vegan',
      ),
    );
  }
});
test('AI requests never invoke the provider for guests, changed accounts or cancelled actions', async () => {
  let calls = 0,
    session = null;
  const api = load('src/services/nutritionApi.ts', {
    './supabase': {
      supabase: {
        auth: { getSession: async () => ({ data: { session } }) },
        functions: {
          invoke: async () => {
            calls++;
            return { data: aiPlan() };
          },
        },
      },
    },
  });
  await assert.rejects(api.requestNutrition({ kind: 'plan' }), /Sign in/);
  session = { user: { id: 'bob' } };
  await assert.rejects(
    api.requestNutrition({ kind: 'plan' }, undefined, 'alice'),
    /Sign in/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    api.requestNutrition({ kind: 'plan' }, controller.signal),
    /cancelled/,
  );
  assert.equal(calls, 0);
});
test('quota and deployment errors produce useful meal-specific fallback messages', async () => {
  for (const [status, code] of [
    [401, 'session'],
    [429, 'quota'],
    [404, 'unavailable'],
    [503, 'unavailable'],
    [504, 'timeout'],
  ]) {
    let calls = 0;
    const api = load('src/services/nutritionApi.ts', {
      './supabase': {
        supabase: {
          auth: {
            getSession: async () => ({
              data: { session: { user: { id: 'alice' } } },
            }),
          },
          functions: {
            invoke: async () => {
              calls++;
              return {
                error: {
                  context: Response.json(
                    { message: 'Gateway error' },
                    { status },
                  ),
                },
              };
            },
          },
        },
      },
    });
    await assert.rejects(
      api.requestNutrition({ kind: 'plan' }),
      (error) =>
        error.code === code && api.mealIdeaError(error).includes('ideas'),
    );
    assert.equal(calls, 1);
  }
});
test('provider result arriving after cancellation cannot become a meal plan', async () => {
  let release;
  const api = load('src/services/nutritionApi.ts', {
    './supabase': {
      supabase: {
        auth: {
          getSession: async () => ({
            data: { session: { user: { id: 'alice' } } },
          }),
        },
        functions: {
          invoke: () =>
            new Promise((resolve) => {
              release = resolve;
            }),
        },
      },
    },
  });
  const controller = new AbortController();
  const pending = api.requestNutrition(
    { kind: 'plan' },
    controller.signal,
    'alice',
  );
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  release({ data: aiPlan() });
  await assert.rejects(pending, /cancelled/);
});
test('clearing journal records clears only the initiating account cache even during account switch', async () => {
  const disk = memoryStorage();
  let release, reached;
  const gate = new Promise((resolve) => {
    reached = resolve;
  });
  const originalRemove = disk.removeItem;
  disk.removeItem = async (key) => {
    if (key.endsWith(':alice')) {
      reached();
      await new Promise((resolve) => {
        release = resolve;
      });
    }
    await originalRemove(key);
  };
  const store = load('src/services/storage.ts', {
    '@react-native-async-storage/async-storage': disk,
  });
  const entry = (id) => ({
    id,
    date: '2026-10-07',
    mealType: 'lunch',
    name: 'Real meal',
    calories: 100,
    protein: 0,
    carbs: 25,
    fats: 0,
  });
  await store.setStorageScope('bob');
  await store.saveFoodEntry(entry('b'));
  await store.setStorageScope('alice');
  await store.saveFoodEntry(entry('a'));
  disk.data.set('@cal_tracker_meal_ideas_v1:alice', '[]');
  disk.data.set('@cal_tracker_meal_ideas_v1:bob', '[]');
  const resetting = store.resetLocalData();
  await gate;
  await store.setStorageScope('bob');
  release();
  await resetting;
  assert.equal((await store.getFoodEntries()).length, 1);
  assert.equal(disk.data.has('@cal_tracker_meal_ideas_v1:bob'), true);
  assert.equal(disk.data.has('@cal_tracker_meal_ideas_v1:alice'), false);
  await store.setStorageScope('alice');
  assert.equal((await store.getFoodEntries()).length, 0);
});

test('large valid plans respect the cache document bound and discard unknown model fields', async () => {
  const storage = memoryStorage(),
    service = cache(storage),
    now = Date.now();
  const plan = aiPlan(now);
  plan.meals = plan.meals.map((meal) => ({
    ...meal,
    name: 'n'.repeat(300),
    portionSize: 'p'.repeat(300),
    description: 'd'.repeat(3000),
    ingredients: Array.from(
      { length: 20 },
      () => '100 g oats ' + 'x'.repeat(285),
    ),
    unknownModelField: 'unneeded'.repeat(100000),
  }));
  for (let protein = 0; protein < 12; protein++)
    await service.saveMealPlanCache(
      'alice',
      { ...targets, protein },
      'vegan',
      plan,
      now,
    );
  const raw = storage.data.get(service.mealPlanCacheKey('alice'));
  assert.ok(raw.length <= 200000);
  const cached = await service.readMealPlanCache(
    'alice',
    { ...targets, protein: 11 },
    'vegan',
    now,
  );
  assert.ok(cached);
  assert.equal(cached.meals[0].description.length, 1500);
  assert.equal(cached.meals[0].unknownModelField, undefined);
});
