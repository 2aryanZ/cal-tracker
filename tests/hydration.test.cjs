const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToString } = require('react-dom/server');
const { load, memoryStorage } = require('./helpers.cjs');
test('static HTML contains a loading shell, not device-specific dates or private journal content', () => {
  const { NutritionProvider } = load('src/context/NutritionContext.tsx', {
    'react-native': {
      View: ({ children, accessibilityLabel }) =>
        React.createElement(
          'div',
          { 'aria-label': accessibilityLabel },
          children,
        ),
      ActivityIndicator: () => React.createElement('span', null, 'Loading'),
      Platform: { select: (options) => options.default },
    },
    '@react-native-async-storage/async-storage': memoryStorage(),
    '@/services/supabase': { supabase: { auth: {} } },
    '@/services/notificationService': {},
    '@/services/hapticsService': {},
  });
  const html = renderToString(
    React.createElement(
      NutritionProvider,
      null,
      React.createElement('div', null, 'Personal journal data'),
    ),
  );
  assert.match(html, /Loading your account/);
  assert.doesNotMatch(html, /Personal journal data/);
});
