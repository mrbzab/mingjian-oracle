import { Lunar, LunarMonth, LunarUtil, Solar } from 'lunar-typescript';
import { Temporal } from '@js-temporal/polyfill';

export type BirthInput = {
  name: string;
  calendar: 'solar' | 'lunar';
  year: number; month: number; day: number; leap: boolean;
  time: string; unknownTime: boolean;
  city: string; longitude: number;
  timezone: '+08:00' | 'Asia/Shanghai';
  clock: 'beijing' | 'apparent';
  daySect: 1 | 2; yunSect: 1 | 2;
  gender: 'male' | 'female' | 'unknown';
  overlap: 'reject' | 'earlier' | 'later';
};

export const DEFAULT_INPUT: BirthInput = {
  name: '', calendar: 'solar', year: 1996, month: 6, day: 18, leap: false,
  time: '12:00:00', unknownTime: false, city: '北京', longitude: 116.4,
  timezone: 'Asia/Shanghai', clock: 'beijing', daySect: 2, yunSect: 2,
  gender: 'unknown', overlap: 'reject',
};

export const CITIES = [
  { name: '北京', longitude: 116.4 }, { name: '上海', longitude: 121.47 },
  { name: '广州', longitude: 113.26 }, { name: '成都', longitude: 104.07 },
  { name: '西安', longitude: 108.94 }, { name: '武汉', longitude: 114.3 },
  { name: '杭州', longitude: 120.16 }, { name: '乌鲁木齐', longitude: 87.62 },
];

function integer(value: number, min: number, max: number, label: string) {
  if (!Number.isInteger(value) || value < min || value > max) throw new Error(`${label}须为 ${min}–${max} 范围的整数。`);
}

export function gregorianDate(input: BirthInput) {
  integer(input.year, 1901, 2099, '年份');
  integer(input.month, 1, 12, '月份');
  integer(input.day, 1, 31, '日期');
  if (input.calendar === 'lunar') {
    const month = input.leap ? -input.month : input.month;
    const lunarMonth = LunarMonth.fromYm(input.year, month);
    if (!lunarMonth) throw new Error('该农历年份没有所选闰月，请检查月份。');
    if (input.day > lunarMonth.getDayCount()) throw new Error(`该农历月只有 ${lunarMonth.getDayCount()} 天。`);
    const solar = Lunar.fromYmd(input.year, month, input.day).getSolar();
    return Temporal.PlainDate.from(solar.toYmd());
  }
  if (input.calendar !== 'solar') throw new Error('请选择公历或农历。');
  try {
    return Temporal.PlainDate.from({ year: input.year, month: input.month, day: input.day }, { overflow: 'reject' });
  } catch { throw new Error('公历日期不存在，请检查月份和日期。'); }
}

function asSolar(date: Temporal.PlainDateTime) {
  return Solar.fromYmdHms(date.year, date.month, date.day, date.hour, date.minute, date.second);
}

// NOAA fractional-year equation of time. Approximation, not ephemeris precision.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
export function equationOfTime(date: Temporal.PlainDateTime) {
  const hour = date.hour + date.minute / 60 + date.second / 3600;
  const gamma = 2 * Math.PI / date.daysInYear * (date.dayOfYear - 1 + (hour - 12) / 24);
  return 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
}

function moment(input: BirthInput, date: Temporal.PlainDate, time: string) {
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(time)) throw new Error('请输入有效出生时刻，格式为 时:分 或 时:分:秒。');
  let plain: Temporal.PlainDateTime;
  try { plain = date.toPlainDateTime(Temporal.PlainTime.from(time, { overflow: 'reject' })); }
  catch { throw new Error('出生时刻不存在。小时为 0–23，分秒为 0–59。'); }
  let zoned: Temporal.ZonedDateTime;
  try {
    // Always reject gaps. Allow an explicit choice only for duplicated clock times.
    const earlier = plain.toZonedDateTime(input.timezone, { disambiguation: 'earlier' });
    const later = plain.toZonedDateTime(input.timezone, { disambiguation: 'later' });
    if (!earlier.toPlainDateTime().equals(plain) || !later.toPlainDateTime().equals(plain)) {
      throw new Error('gap');
    }
    zoned = plain.toZonedDateTime(input.timezone, { disambiguation: input.overlap });
  } catch {
    throw new Error('此时刻遇到历史夏令时跳时或重复：跳过的时刻不能排盘；重复时刻请在规则中明确选择第一次或第二次。');
  }
  const beijing = zoned.withTimeZone('+08:00').toPlainDateTime();
  const utc = zoned.withTimeZone('UTC').toPlainDateTime();
  const equation = equationOfTime(utc);
  const adjustment = input.longitude * 4 - 480 + equation;
  const clockDate = input.clock === 'apparent'
    ? utc.add({ seconds: Math.round((input.longitude * 4 + equation) * 60) }) : beijing;
  const solar = asSolar(beijing);
  const clockSolar = asSolar(clockDate);
  const absoluteEight = solar.getLunar().getEightChar();
  const localEight = clockSolar.getLunar().getEightChar();
  localEight.setSect(input.daySect);
  return {
    solar, beijing, clockDate, offset: zoned.offset, adjustment,
    // Year and month are astronomical instants, unaffected by clock correction.
    values: [absoluteEight.getYear(), absoluteEight.getMonth(), localEight.getDay(), localEight.getTime()],
  };
}

export function describePillar(value: string, dayMaster: string | null, index = -1) {
  const stem = value[0]; const branch = value[1];
  const hidden = LunarUtil.ZHI_HIDE_GAN[branch] ?? [];
  return {
    value, stem, branch,
    elements: (LunarUtil.WU_XING_GAN[stem] ?? '') + (LunarUtil.WU_XING_ZHI[branch] ?? ''),
    tenGod: dayMaster ? (index === 2 ? '日主' : LunarUtil.SHI_SHEN[dayMaster + stem]) : '日主未定',
    hidden: hidden.map((gan) => ({ gan, element: LunarUtil.WU_XING_GAN[gan], tenGod: dayMaster ? LunarUtil.SHI_SHEN[dayMaster + gan] : '—' })),
    naYin: LunarUtil.NAYIN[value],
  };
}

export function calculateBaZi(input: BirthInput) {
  if (!input || typeof input !== 'object') throw new Error('出生资料格式无效，请重新填写。');
  if (typeof input.name !== 'string' || input.name.length > 30 || typeof input.city !== 'string' || input.city.length > 60 || typeof input.unknownTime !== 'boolean' || typeof input.leap !== 'boolean') throw new Error('出生资料格式无效，请重新填写。');
  if (!['+08:00', 'Asia/Shanghai'].includes(input.timezone)) throw new Error('当前版本仅支持北京时间及中国历史时区。');
  if (!['beijing', 'apparent'].includes(input.clock) || ![1, 2].includes(input.daySect) || ![1, 2].includes(input.yunSect)) throw new Error('排盘规则无效。');
  if (!['male', 'female', 'unknown'].includes(input.gender) || !['reject', 'earlier', 'later'].includes(input.overlap)) throw new Error('起运或夏令时选项无效。');
  if (!Number.isFinite(input.longitude) || input.longitude < 73 || input.longitude > 135) throw new Error('当前版本支持中国地区，请填写 73°–135°E 范围的出生地经度。');
  if (input.unknownTime && input.clock === 'apparent') throw new Error('未知时刻不能进行真太阳时校正，请先选择北京时间。');
  const date = gregorianDate(input);
  const current = moment(input, date, input.unknownTime ? '12:00:00' : input.time);
  const warnings: string[] = [];
  let candidates = current.values.map((value) => [value]);
  if (input.unknownTime) {
    // Endpoints cover the monotonic solar-term boundaries; 23:00 covers sect 1.
    const samples = ['00:00:00', '12:00:00', '23:00:00', '23:59:59'].map((t) => moment(input, date, t));
    candidates = [0, 1, 2].map((i) => [...new Set(samples.map((sample) => sample.values[i]))]);
    candidates.push([]);
    warnings.push('出生时刻未知：仅显示当日可能的前三柱，不生成时柱、大运或起运时间。');
    if (candidates.some((values) => values.length > 1)) warnings.push('当日跨越换日或节气边界，出现多个候选柱；须补充出生时刻才能确定。');
  }
  const master = candidates[2].length === 1 ? candidates[2][0][0] : null;
  const pillars = candidates.map((values, i) => values.map((value) => describePillar(value, master, i)));
  const complete = candidates.every((values) => values.length === 1);
  const elementCounts = complete ? ['木', '火', '土', '金', '水'].map((element) => ({
    element, count: pillars.flat().reduce((n, p) => n + p.elements.split('').filter((e) => e === element).length, 0),
  })) : [];
  const lunar = current.solar.getLunar();
  const prev = lunar.getPrevJie(); const next = lunar.getNextJie();
  if (!input.unknownTime && (Math.abs(current.solar.subtractMinute(prev.getSolar())) < 10 || Math.abs(next.getSolar().subtractMinute(current.solar)) < 10)) {
    warnings.push('出生时间距交节不足 10 分钟。节气模型与出生记录存在精度差异，请用权威历书复核。');
  }
  if (input.clock === 'apparent') {
    warnings.push('真太阳时使用经度与 NOAA 均时差近似式，结果取整到秒，不代表秒级天文精度；靠近时辰或换日边界时需复核。');
    const minuteOfDay = current.clockDate.hour * 60 + current.clockDate.minute + current.clockDate.second / 60;
    const nearest = Math.min(...Array.from({ length: 13 }, (_, i) => Math.abs(minuteOfDay - (i === 0 ? 0 : (i * 2 - 1) * 60))), Math.abs(1440 - minuteOfDay));
    if (nearest < 5) warnings.push('校正后的时间距时辰／换日边界不足 5 分钟，当前柱仅供核对，不宜视为唯一结论。');
  }
  if (current.offset !== '+08:00') warnings.push(`记录时区偏移为 ${current.offset}；已换算为 UTC+8 再定节气，不直接把夏令时钟面时间当作北京时间。`);
  if (input.year < 1970) warnings.push('1970 年以前的中国地方用时可能与通用时区记录不同，请核对出生记录实际采用的时制。');
  const yun = !input.unknownTime && input.gender !== 'unknown'
    ? lunar.getEightChar().getYun(input.gender === 'male' ? 1 : 0, input.yunSect) : null;
  const luck = yun ? {
    forward: yun.isForward(),
    start: yun.getStartSolar().toYmdHms(),
    age: `${yun.getStartYear()} 年 ${yun.getStartMonth()} 月 ${yun.getStartDay()} 天 ${yun.getStartHour()} 小时`,
    cycles: yun.getDaYun(9).slice(1).map((cycle, i) => ({
      ...describePillar(cycle.getGanZhi(), master),
      start: yun.getStartSolar().nextYear(i * 10).toYmdHms(),
      end: yun.getStartSolar().nextYear((i + 1) * 10).toYmdHms(),
    })),
  } : null;
  return {
    input: { ...input }, date: date.toString(),
    lunarDate: Solar.fromYmd(date.year, date.month, date.day).getLunar().toString(),
    beijing: input.unknownTime ? null : current.beijing.toString(),
    clockDate: input.unknownTime ? null : current.clockDate.toString(),
    adjustment: input.clock === 'apparent' ? current.adjustment : 0,
    pillars, master, elementCounts, warnings, luck,
    prevJie: { name: prev.getName(), time: prev.getSolar().toYmdHms() },
    nextJie: { name: next.getName(), time: next.getSolar().toYmdHms() },
  };
}

export type BaZiResult = ReturnType<typeof calculateBaZi>;

export function annualPillar(year: number, dayMaster: string | null) {
  integer(year, 1901, 2199, '流年年份');
  const lunar = Solar.fromYmd(year, 7, 1).getLunar();
  const start = lunar.getJieQiTable()['立春'];
  const end = Solar.fromYmd(year + 1, 7, 1).getLunar().getJieQiTable()['立春'];
  return { year, ...describePillar(lunar.getEightChar().getYear(), dayMaster), start: start.toYmdHms(), end: end.toYmdHms() };
}

export function beijingNow() {
  return Temporal.Now.zonedDateTimeISO('+08:00').toPlainDateTime().toString({ smallestUnit: 'second' });
}

// All timeline comparisons use the same UTC+8 clock, with inclusive starts and exclusive ends.
export function luckAt(luck: BaZiResult['luck'], now: string) {
  if (!luck) return { state: 'unavailable' as const, index: -1 };
  const time = Temporal.PlainDateTime.from(now);
  const index = luck.cycles.findIndex((cycle) =>
    Temporal.PlainDateTime.compare(time, cycle.start) >= 0 && Temporal.PlainDateTime.compare(time, cycle.end) < 0);
  if (index >= 0) return { state: 'active' as const, index };
  return { state: Temporal.PlainDateTime.compare(time, luck.start) < 0 ? 'before' as const : 'after' as const, index: -1 };
}

export function annualYearAt(now: string) {
  const time = Temporal.PlainDateTime.from(now);
  integer(time.year, 1901, 2199, '当前年份');
  return Temporal.PlainDateTime.compare(time, annualPillar(time.year, null).start) < 0 ? time.year - 1 : time.year;
}

export function cycleYears(cycle: NonNullable<BaZiResult['luck']>['cycles'][number], master: string | null) {
  const start = Temporal.PlainDateTime.from(cycle.start);
  const end = Temporal.PlainDateTime.from(cycle.end);
  const years = [];
  for (let year = Math.max(1901, start.year - 1); year <= Math.min(2199, end.year); year++) {
    const flow = annualPillar(year, master);
    if (Temporal.PlainDateTime.compare(flow.start, end) >= 0 || Temporal.PlainDateTime.compare(flow.end, start) <= 0) continue;
    const overlapStart = Temporal.PlainDateTime.compare(flow.start, start) < 0 ? cycle.start : flow.start;
    const overlapEnd = Temporal.PlainDateTime.compare(flow.end, end) > 0 ? cycle.end : flow.end;
    years.push({ ...flow, overlapStart, overlapEnd, partial: overlapStart !== flow.start || overlapEnd !== flow.end });
  }
  return years;
}

export function formatReport(result: BaZiResult) {
  return [
    `${result.input.name.trim() || '未署名'}的八字排盘`,
    `公历：${result.date} ${result.input.unknownTime ? '时刻未知' : result.input.time}；农历：${result.lunarDate}`,
    `出生地：${result.input.city}；东经 ${result.input.longitude}°；记录时区：${result.input.timezone}；重复时刻选择：${result.input.overlap}`,
    `北京时间：${result.beijing ?? '未知'}；日时计算时间：${result.clockDate ?? '未知'}`,
    `四柱：${result.pillars.map((p) => p.map((v) => v.value).join(' / ') || '未知').join('　')}`,
    `规则：立春换年、节气换月；日时口径 ${result.input.clock === 'apparent' ? '真太阳时近似' : 'UTC+8 北京时间'}；日柱口径 ${result.input.daySect}；起运口径 ${result.input.yunSect}；起运性别口径 ${result.input.gender}。`,
    ...(result.luck ? [`${result.luck.forward ? '顺行' : '逆行'}；出生后 ${result.luck.age} 起运；交运 ${result.luck.start}（UTC+8）`] : ['时刻或起运性别未提供，不计算起运。']),
    ...result.warnings,
    '历法引擎：lunar-typescript 1.8.6。传统文化排盘不证明命运预测有效；五行数量不等于旺衰或喜用神。',
  ].join('\n');
}
