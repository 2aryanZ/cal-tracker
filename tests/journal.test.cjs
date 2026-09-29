const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const rules = load('src/services/journalRules.ts');
test('recent meals put the newest repeat first, normalize names and retain input order', () => {
  const entries = [
    { id: 'oats-old', name: 'Oats', timestamp: '2026-09-01T08:00:00Z' },
    { id: 'dal', name: 'Dal', timestamp: '2026-09-28T12:00:00Z' },
    { id: 'oats-new', name: ' oats ', timestamp: '2026-09-29T08:00:00Z' },
  ];
  assert.equal(
    rules
      .recentJournalMeals(entries)
      .map((e) => e.id)
      .join(','),
    'oats-new,dal',
  );
  assert.equal(entries.map((e) => e.id).join(','), 'oats-old,dal,oats-new');
  assert.equal(rules.recentJournalMeals(entries, 1)[0].id, 'oats-new');
  assert.equal(rules.recentJournalMeals(entries, 0).length, 0);
});
test('weight progress uses dated records in order and excludes future weigh-ins', () => {
  const logs = [
    { id: 'future', date: '2026-10-02', weightKg: 70 },
    { id: 'last', date: '2026-09-29', weightKg: 77 },
    { id: 'first', date: '2026-09-01', weightKg: 80 },
  ];
  const recorded = rules.recordedWeightsThrough(logs, '2026-09-29');
  assert.equal(recorded.map((e) => e.id).join(','), 'first,last');
  assert.equal(logs[0].id, 'future');
  assert.equal(rules.recordedWeightsThrough(logs, '2026-08-31').length, 0);
});
test('description estimates and meal ideas do not count as camera scans', () => {
  assert.equal(
    rules.isScannedMeal({ source: 'text', isAiGenerated: true }),
    false,
  );
  assert.equal(rules.isScannedMeal({ source: 'manual' }), false);
  for (const source of ['photo', 'barcode', 'label'])
    assert.equal(rules.isScannedMeal({ source }), true);
});
