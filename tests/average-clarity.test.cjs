const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const analytics = load('src/services/analyticsRules.ts');
const journal = load('src/services/journalRules.ts');
const dates = analytics.trailingDates('2026-10-06', 7);
const meal = (date, calories) => ({ date, calories, protein: 0, carbs: 0, fats: 0 });
test('averages and target percentages use logged days while retaining calendar coverage', () => {
  const entries = [meal(dates[0], 1200), meal(dates[0], 800), meal(dates[2], 1000), meal('2026-10-07', 9999)];
  const summary = analytics.summarizePeriod(entries, dates, { calories: 2000 });
  assert.equal(summary.averageCalories, 1500);
  assert.equal(summary.loggedDays, 2);
  assert.equal(summary.goalDays, 1);
  assert.equal(summary.adherence, 50);
  assert.equal(summary.totals[dates[1]].count, 0);
  assert.equal(Object.keys(summary.totals).length, 7);
});
test('a recorded zero counts as logged; missing data is unavailable, not a zero average', () => {
  const empty = analytics.summarizePeriod([], dates, { calories: 2000 });
  assert.equal(empty.averageCalories, null);
  assert.equal(empty.adherence, null);
  const zero = analytics.summarizePeriod([meal(dates[0], 0)], dates, { calories: 2000 });
  assert.equal(zero.averageCalories, 0);
  assert.equal(zero.loggedDays, 1);
  assert.equal(zero.adherence, 0);
});
test('indexed summaries match entry summaries without modifying index or records', () => {
  const entries = [meal(dates[0], 1800), meal(dates[1], 2200), meal(dates[2], 2201)];
  const index = journal.indexJournal(entries);
  const before = JSON.stringify(index);
  const summary = analytics.summarizeJournalPeriod(index.days, dates, 2000);
  assert.equal(JSON.stringify(summary), JSON.stringify(analytics.summarizePeriod(entries, dates, { calories: 2000 })));
  assert.equal(summary.goalDays, 2);
  assert.equal(summary.adherence, 67);
  assert.equal(JSON.stringify(index), before);
  assert.equal(analytics.summarizeJournalPeriod(index.days, [], 2000).averageCalories, null);
});
