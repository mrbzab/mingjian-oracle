import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBaZi, DEFAULT_INPUT, formatReport } from '../lib/bazi.ts';
import { enhanceBaZi, buildInterpretationPrompt } from '../lib/bazi-enhancement.ts';
import { buildYearContext } from '../lib/bazi-year-context.ts';
import { analyzeRelations } from '../lib/bazi-relations.ts';

test('six break pairs are symmetric and coexist with six combination', () => {
  for (const pair of ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌']) {
    const nodes = [...pair].map((zhi, i) => ({ id: String(i), label: String(i), value: `甲${zhi}`, source: 'birth' }));
    assert.equal(analyzeRelations(nodes).filter((r) => r.term === '地支六破').length, 1);
    assert.equal(analyzeRelations(nodes.reverse()).filter((r) => r.term === '地支六破').length, 1);
    if (pair === '寅亥' || pair === '巳申') assert.ok(analyzeRelations(nodes).some((r) => r.term === '地支六合'));
  }
});

test('pillar life stages and day void distinguish reference stems', () => {
  const analysis = enhanceBaZi(calculateBaZi({ ...DEFAULT_INPUT, year: 2005, month: 12, day: 23, time: '08:37:00' }));
  assert.equal(analysis.details[0].selfStage, '绝'); // 乙坐酉
  assert.equal(analysis.details[1].masterStage, '长生'); // 辛日主见子
  assert.equal(analysis.details[2].selfStage, '死'); // 辛坐巳
  assert.deepEqual(analysis.dayEmpty, ['申', '酉']);
  assert.equal(analysis.details[0].inDayEmpty, true);
  assert.equal(analysis.details[2].inDayEmpty, false);
  assert.ok(analysis.details.every((d) => d.shensha === null));
});

test('explicit gender provides scoped shensha without changing pillars', () => {
  for (const gender of ['male', 'female']) {
    const result = calculateBaZi({ ...DEFAULT_INPUT, gender });
    const analysis = enhanceBaZi(result);
    assert.deepEqual(analysis.pillars, result.pillars.map((p) => p[0].value));
    assert.ok(analysis.details.every((d) => Array.isArray(d.shensha)));
  }
});

test('year context partitions a handover without leaking the other luck pillar', () => {
  const result = calculateBaZi({ ...DEFAULT_INPUT, gender: 'male' });
  const handover = result.luck.cycles[1].start;
  const context = buildYearContext(result, Number(handover.slice(0, 4)));
  assert.equal(context.segments.length, 2);
  assert.equal(context.segments[0].start, context.start);
  assert.equal(context.segments[0].end, handover.replace(' ', 'T'));
  assert.equal(context.segments[1].start, context.segments[0].end);
  assert.equal(context.segments[1].end, context.end);
  for (const segment of context.segments) for (const relation of segment.relations) {
    assert.equal(relation.natal, false);
    for (const node of relation.nodes.filter((n) => n.source === 'luck')) assert.equal(node.value, segment.luck);
  }
});

test('year context covers pre-luck, missing gender and outside listed luck without inventing one', () => {
  const result = calculateBaZi(DEFAULT_INPUT);
  const context = buildYearContext(result, 2026);
  assert.equal(context.segments.length, 1);
  assert.equal(context.segments[0].luck, null);
  const withLuck = calculateBaZi({ ...DEFAULT_INPUT, gender: 'male' });
  assert.equal(buildYearContext(withLuck, 1901).segments[0].luck, null);
  assert.equal(buildYearContext(withLuck, 2199).segments[0].luck, null);
  assert.throws(() => buildYearContext(result, 0));
});

test('prompt preserves concrete evidence and self-report separately', () => {
  const result = calculateBaZi({ ...DEFAULT_INPUT, gender: 'male' });
  const feedback = { claim: '之前的解释过于笼统', observation: '实际情况尚未确认' };
  const prompt = buildInterpretationPrompt(formatReport(result), enhanceBaZi(result), '', buildYearContext(result, 2026), feedback);
  const data = JSON.parse(prompt.slice(prompt.indexOf('{')));
  assert.deepEqual(data.feedback, feedback);
  assert.equal(data.yearContext.year, 2026);
  assert.equal(data.analysis.details.length, 4);
  assert.ok(prompt.includes('不得反向调整四柱'));
  assert.ok(prompt.includes('不得假称已经综合紫微'));
});
