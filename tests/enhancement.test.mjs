import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaZi, DEFAULT_INPUT, formatReport } from '../lib/bazi.ts';
import { enhanceBaZi, buildInterpretationPrompt } from '../lib/bazi-enhancement.ts';

test('enhancement preserves resolved pillars through Zi-hour and solar-clock boundaries', () => {
  for (const overrides of [
    {}, { year: 1988, month: 2, day: 15, time: '23:30:00', daySect: 1 },
    { year: 1988, month: 2, day: 15, time: '23:30:00', daySect: 2 },
    { time: '00:10:00', clock: 'apparent', longitude: 87.62 },
    { year: 1990, month: 7, day: 1, time: '12:00:00', timezone: 'Asia/Shanghai' },
  ]) {
    const result = calculateBaZi({ ...DEFAULT_INPUT, ...overrides });
    const analysis = enhanceBaZi(result);
    assert.deepEqual(analysis.pillars, result.pillars.map((p) => p[0].value));
    assert.equal(analysis.structure.distributions.reduce((n, p) => n + p.visibleCount, 0), 4);
    assert.equal(analysis.structure.distributions.reduce((n, p) => n + p.hiddenCount, 0), result.pillars.reduce((n, p) => n + p[0].hidden.length, 0));
  }
});

test('fixed ten-god fixture matches current chart including hidden stems', () => {
  const result = calculateBaZi({ ...DEFAULT_INPUT, year: 2005, month: 12, day: 23, time: '08:37:00' });
  const analysis = enhanceBaZi(result);
  assert.deepEqual(analysis.pillars, ['乙酉', '戊子', '辛巳', '壬辰']);
  const visible = Object.fromEntries(analysis.structure.distributions.filter((p) => p.visibleCount).map((p) => [p.tenGod, p.visibleCount]));
  assert.deepEqual(visible, { 偏财: 1, 正印: 1, 比肩: 1, 伤官: 1 });
});

test('unknown time never becomes an invented complete analysis', () => {
  assert.throws(() => enhanceBaZi(calculateBaZi({ ...DEFAULT_INPUT, unknownTime: true })), /补充出生时刻/);
});

test('upstream no-water explanation is withheld when the chart contains water', () => {
  const analysis = enhanceBaZi(calculateBaZi(DEFAULT_INPUT));
  assert.equal(analysis.useful.reviewRequired, true);
  assert.equal(analysis.useful.yong, '待复核');
  assert.ok(!analysis.useful.reasoning.includes('原局无水'));
});

test('prompt retains input rules, warnings, question and source versions', () => {
  const result = calculateBaZi({ ...DEFAULT_INPUT, clock: 'apparent' });
  const prompt = buildInterpretationPrompt(formatReport(result), enhanceBaZi(result), '如何理解十神？');
  for (const text of ['如何理解十神？', 'mingyu-core 0.2.1', 'zhiji-bazi 0.2.1', 'NOAA', '日柱口径 2']) assert.ok(prompt.includes(text));
});
