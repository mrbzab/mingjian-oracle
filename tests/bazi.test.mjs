import test from 'node:test';
import assert from 'node:assert/strict';
import { Solar, Lunar } from 'lunar-typescript';
import { Temporal } from '@js-temporal/polyfill';
import { calculateBaZi, DEFAULT_INPUT, gregorianDate, annualPillar, equationOfTime, formatReport } from '../lib/bazi.ts';

const input = (overrides = {}) => ({ ...DEFAULT_INPUT, timezone: '+08:00', ...overrides });
const values = (result) => result.pillars.map((options) => options.map((p) => p.value));

// Upstream fixed fixtures (MIT): 6tail/lunar-javascript __tests__/EightChar.test.js.
test('2005-12-23 published four-pillar fixture and ten gods', () => {
  const r = calculateBaZi(input({ year: 2005, month: 12, day: 23, time: '08:37:00' }));
  assert.deepEqual(values(r), [['乙酉'], ['戊子'], ['辛巳'], ['壬辰']]);
  assert.deepEqual(r.pillars.map((p) => p[0].tenGod), ['偏财', '正印', '日主', '伤官']);
  assert.deepEqual(r.pillars[2][0].hidden.map((h) => h.gan), ['丙', '庚', '戊']);
  assert.deepEqual(r.pillars[2][0].hidden.map((h) => h.tenGod), ['正官', '劫财', '正印']);
});

test('late Zi-hour two sects keep their documented, distinct day convention', () => {
  const base = input({ year: 1988, month: 2, day: 15, time: '23:30:00' });
  assert.deepEqual(values(calculateBaZi(base)), [['戊辰'], ['甲寅'], ['庚子'], ['戊子']]);
  assert.deepEqual(values(calculateBaZi({ ...base, daySect: 1 })), [['戊辰'], ['甲寅'], ['辛丑'], ['戊子']]);
  assert.equal(calculateBaZi({ ...base, time: '22:30:00' }).pillars[3][0].value, '丁亥');
});

test('minute/second boundaries at 23:00 and midnight', () => {
  const base = input({ year: 2005, month: 12, day: 23 });
  const a = calculateBaZi({ ...base, time: '22:59:59', daySect: 1 });
  const b = calculateBaZi({ ...base, time: '23:00:00', daySect: 1 });
  const c = calculateBaZi({ ...base, day: 24, time: '00:00:00', daySect: 2 });
  assert.notEqual(a.pillars[2][0].value, b.pillars[2][0].value);
  assert.equal(b.pillars[2][0].value, c.pillars[2][0].value);
});

test('year and month change on Li Chun, not Lunar New Year', () => {
  const before = calculateBaZi(input({ year: 2024, month: 2, day: 4, time: '16:20:00' }));
  const after = calculateBaZi(input({ year: 2024, month: 2, day: 4, time: '16:30:00' }));
  assert.deepEqual(values(before).slice(0, 2), [['癸卯'], ['乙丑']]);
  assert.deepEqual(values(after).slice(0, 2), [['甲辰'], ['丙寅']]);
  assert.equal(calculateBaZi(input({ year: 2024, month: 2, day: 10 })).pillars[0][0].value, '甲辰');
});

test('Jing Zhe changes month, not year; Qi does not change month', () => {
  const terms = Solar.fromYmd(2024, 7, 1).getLunar().getJieQiTable();
  for (const [term, shouldChange] of [['惊蛰', true], ['春分', false]]) {
    const t = Temporal.PlainDateTime.from(terms[term].toYmdHms().replace(' ', 'T'));
    const at = (p) => calculateBaZi(input({ year: p.year, month: p.month, day: p.day, time: p.toPlainTime().toString() }));
    const a = at(t.subtract({ seconds: 1 })); const b = at(t.add({ seconds: 1 }));
    assert.equal(a.pillars[0][0].value, b.pillars[0][0].value);
    assert.equal(a.pillars[1][0].value !== b.pillars[1][0].value, shouldChange);
  }
});

// Independent calendar checks: HKO 2023/2024 Gregorian-Lunar conversion tables.
test('HKO calendar: 2024 lunar new year maps to February 10', () => {
  assert.equal(gregorianDate(input({ calendar: 'lunar', year: 2024, month: 1, day: 1 })).toString(), '2024-02-10');
});
test('HKO calendar: 2023 leap second month begins March 22', () => {
  assert.equal(gregorianDate(input({ calendar: 'lunar', year: 2023, month: 2, day: 1, leap: true })).toString(), '2023-03-22');
});
test('solar and lunar paths yield the same chart', () => {
  const solar = input({ year: 2020, month: 1, day: 6, time: '11:22:00' });
  const lunar = { ...solar, calendar: 'lunar', year: 2019, month: 12, day: 12 };
  assert.deepEqual(values(calculateBaZi(solar)), values(calculateBaZi(lunar)));
});
test('invalid calendar dates and non-existent leap months are rejected', () => {
  for (const data of [{ year: 2023, month: 2, day: 29 }, { year: 2024, month: 4, day: 31 }, { year: 1900 }, { year: 2100 }, { month: 1.5 }, { calendar: 'lunar', year: 2024, month: 2, leap: true }, { calendar: 'lunar', year: 2023, month: 2, leap: true, day: 30 }]) {
    assert.throws(() => calculateBaZi(input(data)), undefined, JSON.stringify(data));
  }
});
test('invalid time and longitude are rejected; leap date is accepted', () => {
  for (const time of ['24:00', '12:60', 'ab:cd', '', '9:00']) assert.throws(() => calculateBaZi(input({ time })));
  for (const longitude of [NaN, 0, 200]) assert.throws(() => calculateBaZi(input({ longitude })));
  assert.doesNotThrow(() => calculateBaZi(input({ year: 2024, month: 2, day: 29 })));
});

test('China 1990 summer time converts 12:00 civil to 11:00 UTC+8', () => {
  const civil = calculateBaZi(input({ year: 1990, month: 7, day: 1, time: '12:00', timezone: 'Asia/Shanghai' }));
  const standard = calculateBaZi(input({ year: 1990, month: 7, day: 1, time: '11:00' }));
  assert.deepEqual(values(civil), values(standard));
  assert.equal(civil.beijing, '1990-07-01T11:00:00');
});
test('historical DST gap is rejected even with explicit disambiguation', () => {
  for (const overlap of ['reject', 'earlier', 'later']) {
    assert.throws(() => calculateBaZi(input({ year: 1990, month: 4, day: 15, time: '02:30', timezone: 'Asia/Shanghai', overlap })));
  }
});
test('historical DST overlap requires a choice, choices differ by one hour', () => {
  const base = input({ year: 1990, month: 9, day: 16, time: '01:30', timezone: 'Asia/Shanghai' });
  assert.throws(() => calculateBaZi(base));
  const a = calculateBaZi({ ...base, overlap: 'earlier' }); const b = calculateBaZi({ ...base, overlap: 'later' });
  assert.equal(a.beijing, '1990-09-16T00:30:00');
  assert.equal(b.beijing, '1990-09-16T01:30:00');
});

test('true solar correction affects day/hour but never moves astronomical year/month boundary', () => {
  const base = input({ year: 2024, month: 2, day: 4, time: '16:30', longitude: 87.62 });
  const standard = calculateBaZi(base); const apparent = calculateBaZi({ ...base, clock: 'apparent' });
  assert.deepEqual(values(apparent).slice(0, 2), values(standard).slice(0, 2));
  assert.notEqual(apparent.pillars[3][0].value, standard.pillars[3][0].value);
  assert.ok(apparent.adjustment < -120);
});
test('longitude displacement changes apparent time by four minutes per degree', () => {
  const a = calculateBaZi(input({ clock: 'apparent', longitude: 110 }));
  const b = calculateBaZi(input({ clock: 'apparent', longitude: 111 }));
  assert.ok(Math.abs((b.adjustment - a.adjustment) - 4) < 1e-8);
  const aTime = Temporal.PlainDateTime.from(a.clockDate); const bTime = Temporal.PlainDateTime.from(b.clockDate);
  assert.equal(aTime.until(bTime).total('minutes'), 4);
});
test('equation of time stays within its annual physical range', () => {
  for (let month = 1; month <= 12; month++) assert.ok(Math.abs(equationOfTime(Temporal.PlainDateTime.from({ year: 2024, month, day: 15, hour: 12 }))) < 17);
});

test('unknown time does not fabricate hour, element counts or luck', () => {
  const r = calculateBaZi(input({ unknownTime: true, gender: 'male' }));
  assert.equal(r.pillars[3].length, 0); assert.equal(r.elementCounts.length, 0); assert.equal(r.luck, null); assert.equal(r.clockDate, null);
  assert.throws(() => calculateBaZi(input({ unknownTime: true, clock: 'apparent' })));
});
test('unknown time exposes Li Chun and Zi-hour ambiguity', () => {
  const r = calculateBaZi(input({ year: 2024, month: 2, day: 4, unknownTime: true, daySect: 1 }));
  assert.equal(r.pillars[0].length, 2); assert.equal(r.pillars[1].length, 2); assert.equal(r.pillars[2].length, 2); assert.equal(r.master, null);
});
test('name does not affect calculation; gender changes luck direction, not pillars', () => {
  const a = calculateBaZi(input({ name: '张三', gender: 'male' }));
  const b = calculateBaZi(input({ name: '李四', gender: 'female' }));
  assert.deepEqual(values(a), values(b)); assert.notEqual(a.luck.forward, b.luck.forward);
  assert.equal(a.elementCounts.reduce((n, v) => n + v.count, 0), 8);
  assert.equal(calculateBaZi(input()).luck, null);
});

// Upstream Yun fixture: same birth yields different traditional start-date conventions.
test('both start-luck methods match published fixed fixtures', () => {
  const base = input({ year: 2022, month: 3, day: 9, time: '20:51', gender: 'male' });
  assert.equal(calculateBaZi({ ...base, yunSect: 1 }).luck.start.slice(0, 10), '2030-12-19');
  const precise = calculateBaZi({ ...base, yunSect: 2 });
  assert.equal(precise.luck.start.slice(0, 10), '2030-12-12');
  assert.match(precise.luck.age, /^8 年 9 月 2 天/);
  assert.equal(precise.luck.cycles.length, 8);
  assert.equal(precise.luck.cycles[0].end, precise.luck.cycles[1].start);
});
test('annual pillars advance with explicit Li Chun boundaries', () => {
  assert.equal(annualPillar(2024, '甲').value, '甲辰');
  assert.equal(annualPillar(2025, '甲').value, '乙巳');
  assert.equal(annualPillar(2026, '甲').value, '丙午');
  assert.equal(annualPillar(2024, '甲').end, annualPillar(2025, '甲').start);
});
test('reports include rules and uncertainty, not random scores', () => {
  const report = formatReport(calculateBaZi(input({ unknownTime: true })));
  assert.match(report, /时刻未知/); assert.match(report, /立春换年/); assert.match(report, /不计算起运/);
  assert.doesNotMatch(report, /幸运数字|财运评分/);
});
test('broad deterministic date samples round-trip through lunar conversion', () => {
  for (const year of [1901, 1949, 1988, 2000, 2024, 2099]) for (const month of [1, 2, 6, 12]) {
    const solar = Solar.fromYmd(year, month, 15); const lunar = solar.getLunar();
    assert.equal(Lunar.fromYmd(lunar.getYear(), lunar.getMonth(), lunar.getDay()).getSolar().toYmd(), solar.toYmd());
    const r = calculateBaZi(input({ year, month, day: 15 }));
    assert.equal(r.pillars.flat().length, 4); assert.ok(r.pillars.flat().every((p) => p.value.length === 2 && p.tenGod));
  }
});
