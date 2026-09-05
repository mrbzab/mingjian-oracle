import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { calculateBaZi, DEFAULT_INPUT } from '../lib/bazi.ts';
import { calculateZiwei, calculateQimen, expansionPrompt } from '../lib/metaphysics.ts';

test('ziwei requires real time and gender, never fills missing input', async () => {
  await assert.rejects(calculateZiwei(calculateBaZi(DEFAULT_INPUT)), /男命/);
  await assert.rejects(calculateZiwei(calculateBaZi({ ...DEFAULT_INPUT, gender: 'male', unknownTime: true })), /出生时刻/);
});

test('ziwei returns twelve unique palaces and a serializable natal snapshot', async () => {
  const z = await calculateZiwei(calculateBaZi({ ...DEFAULT_INPUT, gender: 'male' }));
  assert.equal(z.chart.palaces.length, 12);
  assert.equal(new Set(z.chart.palaces.map((p) => p.earthlyBranch)).size, 12);
  assert.equal(z.chart.earthlyBranchOfSoulPalace, '子');
  assert.equal(z.chart.fiveElementsClass, '土五局');
  assert.equal(z.chart.palaces.filter((p) => p.isBodyPalace).length, 1);
  assert.ok(JSON.parse(JSON.stringify(z)).chart.palaces.every((p) => p.decadal.range.length === 2));
  const alternative = await calculateZiwei(calculateBaZi({ ...DEFAULT_INPUT, gender: 'female' }), 'zhongzhou');
  assert.equal(alternative.input.algorithm, 'zhongzhou');
});

test('ziwei uses already corrected time across DST and true-solar midnight', async () => {
  const birth = calculateBaZi({ ...DEFAULT_INPUT, gender: 'male', year: 1990, month: 7, day: 1, time: '01:30:00' });
  const z = await calculateZiwei(birth);
  assert.equal(z.input.timeIndex, 0); // DST 01:30 -> 00:30; no second correction
  const solarBirth = calculateBaZi({ ...DEFAULT_INPUT, gender: 'male', time: '00:10:00', clock: 'apparent', longitude: 87.62 });
  const solar = await calculateZiwei(solarBirth);
  assert.equal(solar.input.birthDate, solarBirth.clockDate.slice(0,10));
  assert.notEqual(solar.input.birthDate, solarBirth.date);
});

test('late Zi-hour rule changes star placement while retaining the birth-date label', async () => {
  const input = { ...DEFAULT_INPUT, gender: 'male', time: '23:30:00' };
  const a = await calculateZiwei(calculateBaZi({ ...input, daySect: 1 }));
  const b = await calculateZiwei(calculateBaZi({ ...input, daySect: 2 }));
  assert.equal(a.input.timeIndex, 12);
  assert.equal(a.input.birthDate, b.input.birthDate);
  const majors = (z) => z.chart.palaces.map((p) => p.majorStars.map((s) => s.name));
  assert.notDeepEqual(majors(a), majors(b));
  const nextDay = await calculateZiwei(calculateBaZi({ ...input, day: 19, time: '00:30:00', daySect: 1 }));
  assert.deepEqual(majors(a), majors(nextDay));
});

test('qimen validates explicit wall time and returns nine unique palaces', async () => {
  for (const value of ['', '2026-02-30T12:00', '2100-01-01T12:00', '2026-09-05T25:00', '2026-09-05T12:00Z']) await assert.rejects(calculateQimen(value));
  const q = await calculateQimen('2026-09-05T12:00');
  assert.deepEqual(q.chart.ganzhi, { year: '丙午', month: '丙申', day: '壬午', hour: '丙午' });
  assert.equal(q.chart.jiuGongGe.length, 9);
  assert.deepEqual(q.chart.jiuGongGe.map((p) => p.gong).sort(), [1,2,3,4,5,6,7,8,9]);
  assert.ok(q.chart.juShu >= 1 && q.chart.juShu <= 9);
});

test('qimen core snapshot is invariant under device time zone', () => {
  const script = "import {calculateQimen} from './lib/metaphysics.ts';console.log(JSON.stringify(await calculateQimen('2026-09-05T00:30')));";
  const run = (TZ) => execFileSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', script], { cwd: new URL('..', import.meta.url), env: { ...process.env, TZ }, encoding: 'utf8' });
  assert.deepEqual(JSON.parse(run('UTC')), JSON.parse(run('America/New_York')));
});

test('each prompt keeps system identity, rules and question', async () => {
  const q = await calculateQimen('2026-09-05T12:00');
  const text = expansionPrompt(q, '核对九宫对应关系');
  const payload = JSON.parse(text.slice(text.indexOf('{')));
  assert.equal(payload.data.system, '奇门遁甲');
  assert.equal(payload.question, '核对九宫对应关系');
  assert.ok(text.includes('起局时刻不是出生时刻'));
});
