// Synthetic helper timings, not end-to-end phone timings. No real account data.
const { performance } = require('node:perf_hooks');
const { resolve } = require('node:path');
const { load } = require('../tests/helpers.cjs');
process.chdir(resolve(__dirname, '..'));
const journal = load('src/services/journalRules.ts');
const analytics = load('src/services/analyticsRules.ts');
const calendar = analytics.trailingDates('2026-10-06', 90);
const dates = calendar.slice(-30);
const entries = Array.from({ length: 100000 }, (_, i) => ({
  id: String(i), name: `Meal ${i}`,
  timestamp: new Date(Date.UTC(2026, 0, 1) + ((i * 7919) % 100000) * 1000).toISOString(),
  date: calendar[i % calendar.length], calories: 100, protein: 5, carbs: 10, fats: 2,
}));
// Already computed by the provider on meal changes; excluded from range timings.
const index = journal.indexJournal(entries);
function fullSortRecent() {
  const newest = new Map();
  for (const entry of entries) {
    const key = entry.name.trim().toLowerCase();
    const previous = newest.get(key);
    if (!previous || entry.timestamp > previous.timestamp) newest.set(key, entry);
  }
  return [...newest.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 8);
}
function scanSummary() {
  const totals = Object.fromEntries(dates.map(date => [date, { calories: 0, count: 0 }]));
  for (const entry of entries) {
    const day = totals[entry.date];
    if (day) { day.calories += entry.calories; day.count++; }
  }
  let sum = 0, logged = 0;
  for (const day of Object.values(totals)) {
    if (day.count) { sum += day.calories; logged++; }
  }
  return logged ? Math.round(sum / logged) : null;
}
function median(fn) {
  fn(); fn();
  const times = [];
  for (let i = 0; i < 9; i++) {
    const start = performance.now(); fn(); times.push(performance.now() - start);
  }
  return Number(times.sort((a, b) => a - b)[4].toFixed(3));
}
if (scanSummary() !== analytics.summarizeJournalPeriod(index.days, dates, 2000).averageCalories)
  throw new Error('Summary benchmark output differs.');
if (fullSortRecent().map(e => e.id).join(',') !== journal.recentJournalMeals(entries).map(e => e.id).join(','))
  throw new Error('Recent-meal benchmark output differs.');
console.log(JSON.stringify({
  syntheticMeals: entries.length, selectedDates: dates.length,
  medianMs: {
    fullSortRecent: median(fullSortRecent), boundedRecent: median(() => journal.recentJournalMeals(entries)),
    scanSummary: median(scanSummary), indexedSummary: median(() => analytics.summarizeJournalPeriod(index.days, dates, 2000)),
  },
  note: 'Two warmups; median of nine runs. Date index reused. Synthetic desktop helper benchmark, not phone or APK performance.',
}, null, 2));
