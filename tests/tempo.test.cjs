const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./helpers.cjs');
const calendar = load('src/services/calendarRules.ts');
const analytics = load('src/services/analyticsRules.ts');
const journal = load('src/services/journalRules.ts');

test('month calendar aligns Monday columns, leap days and year boundaries', () => {
  const feb = calendar.monthDays('2024-02-20');
  assert.equal(feb.length % 7, 0);
  assert.equal(feb[0], null);
  assert.equal(feb[3], '2024-02-01');
  assert.equal(feb.filter(Boolean).length, 29);
  assert.ok(feb.includes('2024-02-29'));
  assert.equal(calendar.shiftDay('2024-03-01', -1), '2024-02-29');
  assert.equal(calendar.shiftMonth('2026-12-31', 1), '2027-01-01');
  assert.equal(calendar.shiftMonth('2026-01-31', -1), '2025-12-01');
});

test('All analytics includes the earliest meal or weigh-in without future-only dates', () => {
  const entries = [{ date: '2026-10-06' }, { date: '2026-10-10' }];
  const weights = [{ date: '2026-09-01' }, { date: '2027-01-01' }];
  const dates = analytics.analyticsDates(entries, weights, '2026-10-06', 0);
  assert.equal(dates.length, 36);
  assert.equal(dates[0], '2026-09-01');
  assert.equal(dates.at(-1), '2026-10-06');
  assert.equal(
    analytics.analyticsDates(entries, weights, '2026-10-06', 30)[0],
    '2026-09-07',
  );
  assert.equal(analytics.analyticsDates([], [], '2026-10-06', 0).length, 1);
});

test('calendar chart spacing stays equal through daylight-saving changes', () => {
  const previousZone = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    assert.equal(calendar.shiftDay('2026-03-08', 1), '2026-03-09');
    const logs = ['2026-03-07', '2026-03-08', '2026-03-09'].map((date) => ({
      date,
      weightKg: 80,
    }));
    const points = analytics.weightChart(logs, 75, 320, 160).points;
    assert.equal(points[1].x - points[0].x, points[2].x - points[1].x);
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});

test('large weight histories keep endpoints and extrema with a bounded chart', () => {
  const logs = Array.from({ length: 5000 }, (_, i) => ({
    id: String(i),
    date: calendar.shiftDay('2010-01-01', i),
    weightKg: 80 + Math.sin(i),
  }));
  logs[2345].weightKg = 60;
  logs[4567].weightKg = 100;
  const sampled = analytics.sampleWeights(logs);
  assert.ok(sampled.length <= 180);
  assert.equal(sampled[0], logs[0]);
  assert.equal(sampled.at(-1), logs.at(-1));
  assert.ok(sampled.includes(logs[2345]));
  assert.ok(sampled.includes(logs[4567]));
  assert.ok(sampled.every((log, i) => !i || log.date > sampled[i - 1].date));
  const chart = analytics.weightChart(logs, 75, 320, 160, true);
  assert.ok(
    chart.points.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y)),
  );
  assert.ok(chart.points.length <= 180);
  assert.equal(logs.length, 5000);
});

test('journal index preserves zeros, provenance, record order and date isolation', () => {
  const entries = [
    {
      id: 'zero',
      date: '2026-10-06',
      calories: 0,
      protein: 0,
      carbs: 0,
      fats: 0,
      source: 'manual',
    },
    {
      id: 'photo',
      date: '2026-10-06',
      calories: 420,
      protein: 24,
      carbs: 58,
      fats: 12,
      source: 'photo',
    },
    {
      id: 'past',
      date: '2026-10-05',
      calories: 200,
      protein: 10,
      carbs: 20,
      fats: 8,
      source: 'text',
    },
  ];
  const before = JSON.stringify(entries);
  const index = journal.indexJournal(entries);
  assert.equal(
    index.days['2026-10-06'].entries.map((e) => e.id).join(','),
    'zero,photo',
  );
  assert.equal(index.days['2026-10-06'].calories, 420);
  assert.equal(index.days['2026-10-05'].protein, 10);
  assert.equal(index.days['2026-10-07'], undefined);
  assert.equal(index.scans, 1);
  assert.equal(JSON.stringify(entries), before);
});

test('saved meal search preserves a favorite recipe over a differently portioned recent meal', () => {
  const favorite = {
    id: 'fav',
    name: ' Oats ',
    calories: 300,
    source: 'manual',
  };
  const recent = { id: 'recent', name: 'oats', calories: 500, source: 'photo' };
  const choices = journal.savedMealChoices(
    [favorite],
    [recent, { id: 'dal', name: 'Dal' }],
  );
  assert.equal(choices.length, 2);
  assert.equal(choices[0], favorite);
  assert.equal(choices[1].id, 'dal');
});
