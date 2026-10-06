const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const { load } = require('./helpers.cjs');
const flatten = style => Object.assign({}, ...[style].flat(Infinity).filter(Boolean));
const { MetricValue } = load('src/components/MetricValue.tsx', {
  'react-native': { View: 'View', Text: 'Text', StyleSheet: { create: x => x } },
  '@/constants/theme': { FONTS: { bold: 'Manrope-ExtraBold', sans: 'Manrope-Regular' }, JOURNAL: { ink: '#152B30', muted: '#64716D' } },
});

test('phone metrics isolate small unit line heights from large numbers and retain zero values', () => {
  for (const [value, unit] of [[78, 'kg'], [1972, 'kcal'], [69, 'kg'], [0, 'kcal'], [0, '% of days'], [0, 'kcal recorded']]) {
    const element = MetricValue({ value, unit, valueStyle: { fontSize: 52, lineHeight: 70 }, unitStyle: { fontSize: 11, lineHeight: 18 } });
    assert.equal(element.type, 'View');
    assert.equal(element.props.accessibilityLabel, `${value} ${unit}`);
    const [number, label] = element.props.children;
    assert.equal(number.type, 'Text');
    assert.equal(label.type, 'Text');
    assert.equal(number.props.children, value);
    assert.equal(label.props.children, unit);
    assert.equal(flatten(number.props.style).lineHeight, 70);
    assert.equal(flatten(label.props.style).lineHeight, 18);
    assert.ok(flatten(number.props.style).includeFontPadding);
    assert.ok(flatten(element.props.style).columnGap >= 6);
    assert.equal(flatten(element.props.style).flexWrap, 'wrap');
    assert.notEqual(number.props.allowFontScaling, false);
    assert.equal(number.props.numberOfLines, undefined);
  }
});

test('each reported phone metric reserves enough vertical space for its displayed font', () => {
  let checked = 0;
  for (const file of ['src/app/(tabs)/analytics.tsx', 'src/app/(tabs)/history.tsx', 'src/app/settings.tsx']) {
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const styles = new Map();
    const visit = node => {
      if (ts.isPropertyAssignment(node) && ts.isObjectLiteralExpression(node.initializer)) {
        const fields = Object.fromEntries(node.initializer.properties.filter(p => ts.isPropertyAssignment(p) && ts.isNumericLiteral(p.initializer)).map(p => [p.name.getText(source), Number(p.initializer.text)]));
        if (fields.fontSize) styles.set(node.name.getText(source), fields);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    const inspect = node => {
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === 'MetricValue') {
        const attribute = node.attributes.properties.find(p => p.name?.getText(source) === 'valueStyle');
        const expression = attribute?.initializer?.expression;
        assert.ok(expression && ts.isPropertyAccessExpression(expression));
        const style = styles.get(expression.name.text);
        assert.ok(style?.lineHeight >= style?.fontSize * 1.2, `${file}: ${expression.name.text} would clip its numeric text`);
        checked++;
      }
      ts.forEachChild(node, inspect);
    };
    inspect(source);
  }
  assert.equal(checked, 7, 'all seven metric locations reported in the phone screenshots must be checked');
});
