import test from 'node:test';
import assert from 'node:assert/strict';
import { LunarUtil } from 'lunar-typescript';
import { analyzeRelations, comparisonNodes } from '../lib/bazi-relations.ts';
import { BAZI_TERMS } from '../lib/bazi-terms.ts';

const node = (value, id, source = 'birth') => ({ value, id, label: id, source });
const match = (values, kind) => analyzeRelations(values.map((value, i) => node(value, String(i)))).filter((item) => item.kind === kind);

test('all five heavenly-stem pairs match symmetrically and once', () => {
  for (const pair of ['甲己', '乙庚', '丙辛', '丁壬', '戊癸']) {
    for (const order of [pair, pair.split('').reverse().join('')]) {
      assert.equal(match([order[0] + '子', order[1] + '子'], '天干五合').length, 1);
    }
  }
  assert.equal(match(['甲子', '甲午'], '天干五合').length, 0);
});

test('every branch six-combination, six-clash, six-harm pair is recognized', () => {
  for (const [kind, pairs] of [
    ['地支六合', ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未']],
    ['地支六冲', ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥']],
    ['地支六害', ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌']],
  ]) for (const pair of pairs) {
    assert.equal(match(['甲' + pair[0], '乙' + pair[1]], kind).length, 1);
    assert.equal(match(['乙' + pair[1], '甲' + pair[0]], kind).length, 1);
  }
});

test('multiple traditional relationships coexist, never cancel one another', () => {
  const kinds = analyzeRelations([node('甲寅', 'a'), node('己巳', 'b')]).map((item) => item.kind);
  assert.deepEqual(kinds.sort(), ['天干五合', '地支六害', '三刑·两支'].sort());
});

test('self-punishment requires distinct positions and only the four listed branches', () => {
  for (const branch of ['辰', '午', '酉', '亥']) {
    assert.equal(match(['甲' + branch], '自刑').length, 0);
    assert.equal(match(['甲' + branch, '甲' + branch], '自刑').length, 1);
  }
  assert.equal(match(['甲子', '甲子'], '自刑').length, 0);
  assert.equal(analyzeRelations([node('甲辰', 'a'), node('甲辰', 'a')]).length, 0);
});

test('three-way combinations need three distinct branches, not two or duplicates', () => {
  for (const group of ['申子辰', '亥卯未', '寅午戌', '巳酉丑']) {
    assert.equal(match(group.split('').map((branch) => '甲' + branch), '地支三合').length, 1);
    assert.equal(match(['甲' + group[0], '甲' + group[1], '甲' + group[1]], '地支三合').length, 0);
  }
});

test('three-punishment partial pairs never assert all three are present', () => {
  for (const group of ['寅巳申', '丑戌未']) {
    const partial = match(['甲' + group[0], '乙' + group[1]], '三刑·两支');
    assert.equal(partial.length, 1);
    assert.match(partial[0].reading, new RegExp('尚缺' + group[2]));
    assert.equal(match(group.split('').map((branch) => '甲' + branch), '三刑·三支齐全').length, 1);
    assert.equal(match(group.split('').map((branch) => '甲' + branch), '三刑·两支').length, 0);
  }
  assert.equal(match(['甲子', '乙卯'], '子卯相刑').length, 1);
});

test('a flow completing a natal pair retains natal scope and identifies new triple', () => {
  const relations = analyzeRelations([node('甲寅', '年柱'), node('乙巳', '日柱'), node('丙申', '流年', 'year')]);
  assert.equal(relations.find((item) => item.kind === '三刑·两支').natal, true);
  const full = relations.find((item) => item.kind === '三刑·三支齐全');
  assert.equal(full.natal, false);
  assert.deepEqual(full.nodes.map((item) => item.label), ['年柱', '日柱', '流年']);
});

test('uncertain candidates are excluded instead of combined into a fictitious chart', () => {
  const nodes = comparisonNodes([[{ value: '甲子' }, { value: '乙丑' }], [{ value: '丙寅' }], [{ value: '丁巳' }], []], undefined, { year: 2026, value: '戊申' });
  assert.deepEqual(nodes.map((item) => item.id), ['birth-1', 'birth-2', 'year']);
  assert.ok(nodes.every((item) => !['甲子', '乙丑'].includes(item.value)));
});

test('newly selected flow replaces old relationships without stale nodes', () => {
  const pillars = [[{ value: '甲子' }], [], [], []];
  const oldRelations = analyzeRelations(comparisonNodes(pillars, undefined, { year: 2026, value: '丙午' }));
  const newRelations = analyzeRelations(comparisonNodes(pillars, undefined, { year: 2027, value: '丁未' }));
  assert.ok(oldRelations.some((item) => item.kind === '地支六冲'));
  assert.ok(!newRelations.some((item) => item.kind === '地支六冲'));
  assert.ok(newRelations.some((item) => item.kind === '地支六害'));
});

test('repeated pillars preserve distinct position matches and stable unique ids', () => {
  const nodes = [node('甲子', 'a'), node('甲子', 'b'), node('己丑', 'c', 'luck')];
  const relations = analyzeRelations(nodes);
  assert.equal(relations.filter((item) => item.kind === '地支六合').length, 2);
  assert.equal(new Set(relations.map((item) => item.id)).size, relations.length);
  assert.deepEqual(analyzeRelations(nodes).map((item) => item.id), relations.map((item) => item.id));
  assert.ok(relations.every((item) => !item.natal));
});

test('glossary covers all engine ten-god names and all emitted relationship terms', () => {
  // Inspect the 100 public stem-pair keys, not the library's extra i18n template keys.
  for (const master of '甲乙丙丁戊己庚辛壬癸') for (const stem of '甲乙丙丁戊己庚辛壬癸') {
    const term = LunarUtil.SHI_SHEN[master + stem];
    assert.ok(BAZI_TERMS[term], term);
  }
  for (const term of ['日主', '十神', '藏干', '纳音', '大运', '流年', '起运', '天干五合', '地支六合', '地支三合', '地支六冲', '地支六害', '子卯相刑', '三刑', '自刑']) assert.ok(BAZI_TERMS[term], term);
});
