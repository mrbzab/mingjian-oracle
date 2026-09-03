'use client';

import { type SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { Compass, Copy, History, MoonStar, ScrollText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { annualPillar, calculateBaZi, CITIES, DEFAULT_INPUT, formatReport, gregorianDate, type BirthInput } from '@/lib/bazi';
import { Solar } from 'lunar-typescript';

type Saved = { id: string; input: BirthInput };
const HISTORY_KEY = 'mingjian-bazi-v1';
const example = calculateBaZi(DEFAULT_INPUT);
const labels = ['年柱', '月柱', '日柱', '时柱'];

export default function Home() {
  const [input, setInput] = useState<BirthInput>({ ...DEFAULT_INPUT });
  const [result, setResult] = useState(example);
  const [isExample, setIsExample] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [history, setHistory] = useState<Saved[]>([]);
  const [year, setYear] = useState(2026);
  const [cycle, setCycle] = useState(0);
  const flow = useMemo(() => annualPillar(year, result.master), [year, result.master]);

  useEffect(() => {
    try {
      const parsed: unknown = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? '[]');
      if (Array.isArray(parsed)) {
        const valid = parsed.slice(0, 5).filter((item): item is Saved => {
          try { if (!item || typeof item.id !== 'string' || !item.input) return false; calculateBaZi(item.input); return true; }
          catch { return false; }
        });
        // One-time hydration of explicitly device-local history.
        // oxlint-disable-next-line react/react-compiler
        setHistory(valid);
      }
    } catch { /* Storage can be disabled; calculation remains available. */ }
    setYear(new Date().getFullYear());
  }, []);

  function update<K extends keyof BirthInput>(key: K, value: BirthInput[K]) {
    setInput((current) => ({ ...current, [key]: value }));
  }
  function changeCalendar(calendar: BirthInput['calendar']) {
    try {
      const date = gregorianDate(input);
      const lunar = Solar.fromYmd(date.year, date.month, date.day).getLunar();
      setInput((current) => ({ ...current, calendar,
        year: calendar === 'solar' ? date.year : lunar.getYear(),
        month: calendar === 'solar' ? date.month : Math.abs(lunar.getMonth()),
        day: calendar === 'solar' ? date.day : lunar.getDay(),
        leap: calendar === 'lunar' && lunar.getMonth() < 0,
      }));
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : '请先填写有效日期再切换历法。'); }
  }
  function saveHistory(items: Saved[]) {
    setHistory(items);
    try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); }
    catch { setNotice('此浏览器无法保存记录，但本次排盘已完成。'); }
  }
  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = calculateBaZi(input);
      setResult(next); setIsExample(false); setError(''); setNotice(''); setCycle(0);
      saveHistory([{ id: crypto.randomUUID(), input: { ...input } }, ...history].slice(0, 5));
    } catch (e) { setError(e instanceof Error ? e.message : '排盘未完成，请检查出生资料。'); }
  }
  function restore(saved: Saved) {
    try { const next = calculateBaZi(saved.input); setResult(next); setInput(saved.input); setIsExample(false); setError(''); setCycle(0); }
    catch { setError('此记录无效或不适用于当前规则，请重新填写。'); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(formatReport(result)); setNotice('命盘与所用规则已复制。分享前请注意出生资料隐私。'); }
    catch { setNotice('浏览器未允许复制，请选中页面文字手动复制。'); }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-5 py-6 md:px-10">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground"><MoonStar className="size-5" /></span><div><p className="font-serif text-2xl tracking-[.15em]">命笺</p><p className="text-sm text-muted-foreground">四柱八字 · 历法排盘</p></div></div>
        <span className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground">历法可核对 · 不作命运承诺</span>
      </header>

      <div className="mx-auto grid max-w-[1440px] gap-6 px-5 pb-10 md:px-10 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="self-start rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h1 className="mb-2 font-serif text-2xl">填写出生资料</h1>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">支持 1901–2099 年中国地区出生记录。日期按中国农历换算，时刻与时制请以原始记录为准。</p>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="name">称呼（选填，不参与计算）</Label><Input id="name" value={input.name} maxLength={30} onChange={(e) => update('name', e.target.value)} placeholder="未署名" className="h-11" /></div>
            <div className="space-y-2"><Label htmlFor="calendar">历法（切换时自动换算日期）</Label><NativeSelect id="calendar" value={input.calendar} onChange={(e) => changeCalendar(e.target.value as BirthInput['calendar'])} className="choice"><NativeSelectOption value="solar">公历 / 阳历</NativeSelectOption><NativeSelectOption value="lunar">农历 / 阴历</NativeSelectOption></NativeSelect></div>
            <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2">
              {([['year', '年', 1901, 2099], ['month', '月', 1, 12], ['day', '日', 1, input.calendar === 'lunar' ? 30 : 31]] as const).map(([key, label, min, max]) => <div key={key} className="space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} type="number" min={min} max={max} required value={input[key] || ''} onChange={(e) => update(key, Number(e.target.value))} className="h-11" /></div>)}
            </div>
            {input.calendar === 'lunar' && <div className="flex items-center gap-3"><Checkbox id="leap" checked={input.leap} onCheckedChange={(checked) => update('leap', checked)} /><Label htmlFor="leap">这是闰月（会校验是否存在）</Label></div>}
            <div className="space-y-2"><Label htmlFor="time">出生时刻（24 小时制）</Label><Input id="time" type="time" step="1" required={!input.unknownTime} disabled={input.unknownTime} value={input.time} onChange={(e) => update('time', e.target.value)} className="h-11" /></div>
            <div className="flex items-center gap-3"><Checkbox id="unknown" checked={input.unknownTime} onCheckedChange={(checked) => setInput((v) => ({ ...v, unknownTime: checked, clock: checked ? 'beijing' : v.clock }))} /><Label htmlFor="unknown">不清楚出生时刻</Label></div>
            <div className="space-y-2"><Label htmlFor="city">出生城市</Label><NativeSelect id="city" value={CITIES.some((c) => c.name === input.city) ? input.city : 'custom'} className="choice" onChange={(e) => { const city = CITIES.find((c) => c.name === e.target.value); setInput((v) => ({ ...v, city: city?.name ?? '其他地区', longitude: city?.longitude ?? v.longitude })); }}>
              {CITIES.map((city) => <NativeSelectOption key={city.name}>{city.name}</NativeSelectOption>)}<NativeSelectOption value="custom">其他地区 / 手动经度</NativeSelectOption>
            </NativeSelect></div>
            <div className="space-y-2"><Label htmlFor="gender">传统起运顺逆依据</Label><NativeSelect id="gender" value={input.gender} onChange={(e) => update('gender', e.target.value as BirthInput['gender'])} className="choice"><NativeSelectOption value="unknown">不提供（仍可排四柱）</NativeSelectOption><NativeSelectOption value="male">男命口径</NativeSelectOption><NativeSelectOption value="female">女命口径</NativeSelectOption></NativeSelect></div>

            <details className="rounded-xl border border-border p-4" open>
              <summary className="cursor-pointer font-medium">时间与流派规则</summary>
              <div className="mt-4 space-y-4">
                <div className="space-y-2"><Label htmlFor="timezone">出生记录采用的时制</Label><NativeSelect id="timezone" value={input.timezone} onChange={(e) => update('timezone', e.target.value as BirthInput['timezone'])} className="choice"><NativeSelectOption value="Asia/Shanghai">历史民用时间（自动处理夏令时）</NativeSelectOption><NativeSelectOption value="+08:00">明确为 UTC+8 标准时间</NativeSelectOption></NativeSelect><p className="text-sm leading-6 text-muted-foreground">若记录已扣除夏令时，选择 UTC+8，避免重复校正。新疆地方时间须先换算，不能直接填入。</p></div>
                <div className="space-y-2"><Label htmlFor="clock">日柱与时柱的时间口径</Label><NativeSelect id="clock" value={input.clock} disabled={input.unknownTime} onChange={(e) => update('clock', e.target.value as BirthInput['clock'])} className="choice"><NativeSelectOption value="beijing">北京时间（UTC+8）</NativeSelectOption><NativeSelectOption value="apparent">出生地真太阳时（近似）</NativeSelectOption></NativeSelect></div>
                {input.clock === 'apparent' && <div className="space-y-2"><Label htmlFor="longitude">出生地经度（东经 °）</Label><Input id="longitude" type="number" min="73" max="135" step="0.001" required value={input.longitude} onChange={(e) => update('longitude', Number(e.target.value))} className="h-11" /><p className="text-sm leading-6 text-muted-foreground">城市预设为市区近似经度，可改为出生地址经度。每度约对应 4 分钟。</p></div>}
                <div className="space-y-2"><Label htmlFor="sect">日柱换日口径</Label><NativeSelect id="sect" value={input.daySect} onChange={(e) => update('daySect', Number(e.target.value) as 1 | 2)} className="choice"><NativeSelectOption value="2">子正 00:00 换日（流派 2）</NativeSelectOption><NativeSelectOption value="1">子初 23:00 换日（流派 1）</NativeSelectOption></NativeSelect></div>
                <div className="space-y-2"><Label htmlFor="yunSect">起运折算方式</Label><NativeSelect id="yunSect" value={input.yunSect} onChange={(e) => update('yunSect', Number(e.target.value) as 1 | 2)} className="choice"><NativeSelectOption value="2">按分钟折算（3 天折 1 年）</NativeSelectOption><NativeSelectOption value="1">按时辰折算（传统整时辰法）</NativeSelectOption></NativeSelect></div>
                <div className="space-y-2"><Label htmlFor="overlap">夏令时回拨的重复时刻</Label><NativeSelect id="overlap" value={input.overlap} onChange={(e) => update('overlap', e.target.value as BirthInput['overlap'])} className="choice"><NativeSelectOption value="reject">未确认（遇到时提示）</NativeSelectOption><NativeSelectOption value="earlier">第一次出现</NativeSelectOption><NativeSelectOption value="later">第二次出现</NativeSelectOption></NativeSelect></div>
              </div>
            </details>
            {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl text-base"><ScrollText />排出命盘</Button>
          </form>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">计算在浏览器内完成，记录仅保存在本机。旧版娱乐结果不会当作真实命盘使用。</p>
          {history.length > 0 && <section className="mt-5 border-t pt-5"><h2 className="mb-3 flex items-center gap-2 text-base font-medium"><History className="size-4" />最近五份命盘</h2><ul className="space-y-2">{history.map((item) => <li key={item.id} className="flex items-center gap-1"><Button variant="outline" className="min-w-0 flex-1 justify-start truncate" onClick={() => restore(item)}>{item.input.name || '未署名'} · {item.input.year}/{item.input.month}/{item.input.day}</Button><Button size="icon" variant="ghost" aria-label={`删除${item.input.name || '未署名'}的记录`} onClick={() => saveHistory(history.filter((v) => v.id !== item.id))}><Trash2 /></Button></li>)}</ul></section>}
        </aside>

        <section className="min-w-0 space-y-6" aria-live="polite">
          <article className="rounded-3xl bg-[#173d34] p-5 text-[#f7f2e8] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/15 pb-5"><div><p className="mb-2 text-sm text-[#d9bd86]">{isExample ? '示例命盘 · 填写左侧资料后重新排盘' : '按已提交资料排盘'}</p><h2 className="font-serif text-3xl">{result.input.name.trim() || '未署名'}的四柱</h2><p className="mt-3 text-sm leading-6 text-[#d5e2da]">公历 {result.date} · 农历 {result.lunarDate}</p></div><Button variant="outline" onClick={copy} className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"><Copy />复制命盘</Button></div>
            <div className="my-7 grid grid-cols-2 gap-3 md:grid-cols-4">
              {result.pillars.map((options, index) => <section key={labels[index]} className="rounded-2xl border border-white/15 bg-white/5 p-4 text-center"><h3 className="mb-4 text-sm text-[#c3d8ce]">{labels[index]}</h3>{options.length ? options.map((pillar) => <div key={pillar.value} className="mb-2"><p className="font-serif text-4xl leading-[1.4] text-[#f0d89d]">{pillar.stem}<br />{pillar.branch}</p><p className="mt-3 text-sm">{pillar.tenGod}</p><p className="mt-1 text-sm text-[#c3d8ce]">{pillar.elements} · {pillar.naYin}</p></div>) : <p className="py-7 text-xl text-[#c3d8ce]">时刻未知</p>}{options.length > 1 && <p className="text-sm text-[#f0d89d]">以上均为候选</p>}</section>)}
            </div>
            <div className="rounded-xl bg-white/5 p-4 text-sm leading-7 text-[#d5e2da]">
              <p>日主：{result.master ? `${result.master}（由日柱天干确定）` : '因换日边界暂不能确定'}</p>
              {!result.input.unknownTime && <><p>统一北京时间：{result.beijing?.replace('T', ' ')}（UTC+8）</p><p>日时排盘时间：{result.clockDate?.replace('T', ' ')}{result.input.clock === 'apparent' ? ` · 真太阳时近似，较北京时间 ${result.adjustment >= 0 ? '+' : ''}${result.adjustment.toFixed(2)} 分钟` : ' · 北京时间'}</p></>}
            </div>
          </article>

          {result.warnings.length > 0 && <aside className="rounded-2xl border border-amber-400/40 bg-amber-50 p-5 text-amber-950"><h3 className="mb-2 font-medium">不确定性与复核提示</h3><ul className="list-disc space-y-2 pl-5 text-sm leading-6">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></aside>}

          <section className="panel"><h3 className="section-title">藏干与十神</h3><Table><TableHeader><TableRow><TableHead>柱位</TableHead><TableHead>干支</TableHead><TableHead>藏干 · 五行 · 十神</TableHead></TableRow></TableHeader><TableBody>{result.pillars.flatMap((options, i) => options.map((p) => <TableRow key={`${i}-${p.value}`}><TableCell>{labels[i]}</TableCell><TableCell>{p.value}</TableCell><TableCell className="whitespace-normal leading-7">{p.hidden.map((h) => `${h.gan}${h.element} · ${h.tenGod}`).join('　/　')}</TableCell></TableRow>))}</TableBody></Table>
            {result.elementCounts.length > 0 && <><h4 className="mb-3 mt-6 font-medium">八字表层五行计数</h4><div className="grid grid-cols-5 gap-2">{result.elementCounts.map((e) => <div key={e.element} className="rounded-xl bg-primary/6 py-3 text-center"><p className="text-sm text-muted-foreground">{e.element}</p><p className="mt-1 text-2xl text-primary">{e.count}</p></div>)}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">只统计四干四支所属五行，共 8 个字；不加权藏干。这不是旺衰评分，不能据“缺某五行”直接判断喜用神或补救。</p></>}
          </section>

          <section className="panel"><h3 className="section-title flex items-center gap-2"><Compass className="size-5 text-primary" />大运与起运</h3>
            {result.luck ? <><p className="text-base leading-7">{result.luck.forward ? '顺行' : '逆行'} · 出生后 {result.luck.age} 起运</p><p className="mt-1 text-sm text-muted-foreground">交运时间：{result.luck.start}（UTC+8，传统折算值）</p><div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{result.luck.cycles.map((v, i) => <Button key={v.start} variant={cycle === i ? 'default' : 'outline'} className="h-auto flex-col gap-1 py-3" onClick={() => setCycle(i)} aria-pressed={cycle === i}><span className="text-lg">{v.value}</span><span className="text-sm">{v.start.slice(0, 4)} 起</span></Button>)}</div><div className="mt-4 rounded-xl bg-muted/70 p-4 text-sm leading-7"><p>{result.luck.cycles[cycle]?.value}大运 · {result.luck.cycles[cycle]?.tenGod} · {result.luck.cycles[cycle]?.naYin}</p><p>起：{result.luck.cycles[cycle]?.start}</p><p>止：{result.luck.cycles[cycle]?.end}（不含，UTC+8）</p></div></> : <p className="text-base leading-7 text-muted-foreground">提供出生时刻和传统起运性别口径后，才计算顺逆、大运与交运时间。未提供时不会推测。</p>}
          </section>

          <section className="panel"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h3 className="section-title mb-0">流年干支</h3><div className="flex items-center gap-2"><Label htmlFor="flowYear">年份</Label><NativeSelect id="flowYear" value={year} onChange={(e) => setYear(Number(e.target.value))} className="choice w-28">{Array.from({ length: 299 }, (_, i) => 1901 + i).map((y) => <NativeSelectOption key={y} value={y}>{y}</NativeSelectOption>)}</NativeSelect></div></div><p className="font-serif text-3xl text-primary">{flow.value}<span className="ml-4 font-sans text-base">{flow.tenGod} · {flow.naYin}</span></p><p className="mt-3 text-sm leading-7 text-muted-foreground">从 {flow.start} 立春起，至 {flow.end} 立春止（不含，UTC+8）。十神相对于本命日主，不表示这一年必然吉凶。</p></section>

          <section className="panel"><h3 className="section-title">计算口径与依据</h3><div className="space-y-3 text-sm leading-7 text-muted-foreground">
            <p>年柱以立春交节瞬间划分，月柱以十二“节”划分，不以农历初一换月。交节判断始终使用实际出生瞬间换算的 UTC+8 时间，真太阳时只影响日、时柱。</p>
            <p>当前口径：{result.input.daySect === 1 ? '流派 1：23:00 换日。' : '流派 2：00:00 换日；23:00–23:59 日柱仍属当天，但子时时干按次日推算（沿用引擎流派 2 规则）。'}</p>
            <p>起运顺逆：阳年男命、阴年女命顺行；阴年男命、阳年女命逆行。顺行数至后一个节，逆行数至前一个节。{result.input.yunSect === 2 ? '按分钟折算：4320 分钟折 1 年，360 分钟折 1 月，12 分钟折 1 日，余 1 分钟折 2 小时。' : '按整日与时辰差折算：3 天折 1 年，1 时辰折 10 天。'}折算值是传统规则，不是天文年龄。</p>
            <p>{result.input.unknownTime ? '以下交节信息以出生日期中午作展示参考，不代表确定出生时刻。' : '出生瞬间相邻的两个节：'}<br />前节：{result.prevJie.name} {result.prevJie.time}<br />后节：{result.nextJie.name} {result.nextJie.time}（均为 UTC+8）</p>
            <p>历法引擎 <a className="source-link" href="https://github.com/6tail/lunar-typescript" target="_blank" rel="noreferrer">lunar-typescript 1.8.6（MIT）</a>；真太阳时均时差使用 <a className="source-link" href="https://gml.noaa.gov/grad/solcalc/solareqns.PDF" target="_blank" rel="noreferrer">NOAA 近似公式</a>。时区使用运行环境的 IANA 数据，历史记录与交节临界时刻建议独立复核。</p>
            <p className="font-medium text-foreground">四柱、藏干、十神、大运属于传统文化计算体系；排盘规则可复核，不代表命运预测获得科学验证。本版不再生成随机运势分数、幸运数字或吉凶承诺。</p>
          </div></section>
          {notice && <output className="block rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">{notice}</output>}
        </section>
      </div>
      <footer className="mx-auto max-w-[1440px] border-t px-5 py-6 text-sm leading-6 text-muted-foreground md:px-10">命笺 · 尊重历法边界与出生资料隐私。不要据此作医疗、投资、婚姻或其他重大决定。</footer>
    </main>
  );
}
