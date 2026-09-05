'use client';

import { type SyntheticEvent, useEffect, useRef, useState } from 'react';
import { History, ScrollText, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { beijingNow, calculateBaZi, CITIES, DEFAULT_INPUT, formatReport, gregorianDate, type BirthInput } from '@/lib/bazi';
import { LuckOverview, LuckExplorer } from '@/components/luck-explorer';
import { TermHelp } from '@/components/term-help';
import { ChartSheet } from '@/components/chart-sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Solar } from 'lunar-typescript';
import { BaziEnhancement } from '@/components/bazi-enhancement';

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
  const [now, setNow] = useState<string | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const resultsRef = useRef<HTMLHeadingElement>(null);
  const formTitleRef = useRef<HTMLHeadingElement>(null);
  const rulesRef = useRef<HTMLDetailsElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const shouldReveal = useRef(false);

  function focusSection(element: HTMLElement | null) {
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  useEffect(() => {
    if (!shouldReveal.current) return;
    shouldReveal.current = false;
    if (window.matchMedia('(max-width: 800px)').matches) focusSection(resultsRef.current);
  }, [result]);
  useEffect(() => {
    if (error) {
      if (rulesRef.current) rulesRef.current.open = true;
      focusSection(errorRef.current);
    }
  }, [error]);

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
    const refreshClock = () => setNow(beijingNow());
    refreshClock();
    const interval = window.setInterval(refreshClock, 60_000);
    window.addEventListener('focus', refreshClock);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refreshClock); };
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
      if (window.matchMedia('(max-width: 800px)').matches) setFormCollapsed(true);
      shouldReveal.current = true;
      setResult(next); setIsExample(false); setError(''); setNotice(''); setNow(beijingNow());
      saveHistory([{ id: crypto.randomUUID(), input: { ...input } }, ...history].slice(0, 5));
    } catch (e) { setError(e instanceof Error ? e.message : '排盘未完成，请检查出生资料。'); }
  }
  function restore(saved: Saved) {
    try { const next = calculateBaZi(saved.input); shouldReveal.current = true; setResult(next); setInput(saved.input); setIsExample(false); setError(''); setNow(beijingNow()); }
    catch { setError('此记录无效或不适用于当前规则，请重新填写。'); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(formatReport(result)); setNotice('命盘与所用规则已复制。分享前请注意出生资料隐私。'); }
    catch { setNotice('浏览器未允许复制，请选中页面文字手动复制。'); }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="site-header"><div className="brand"><span className="brand-seal">命</span><div><p>命笺</p><span>四柱八字</span></div></div><span className="header-note">传统文化 · 理性解读</span></header>

      <div className="workspace">
        <aside className="birth-panel">
          <div className="mobile-form-toggle"><Button variant="outline" aria-expanded={!formCollapsed} aria-controls="birth-fields" onClick={() => setFormCollapsed(!formCollapsed)}>{formCollapsed ? '展开出生资料' : '收起出生资料'}</Button><span>{result.date} · {result.input.city}</span></div>
          <div id="birth-fields" className={formCollapsed ? 'birth-fields mobile-collapsed' : 'birth-fields'}>
          <h1 ref={formTitleRef} tabIndex={-1} className="mb-2 scroll-mt-5 font-serif text-2xl">出生资料</h1>
          <p className="mb-6 text-sm leading-6 text-muted-foreground">1901–2099 年 · 中国地区</p>
          <form onSubmit={submit} className="space-y-4" onInvalidCapture={(event) => {
            const field = event.target as HTMLInputElement;
            if (rulesRef.current?.contains(field)) {
              rulesRef.current.open = true;
              requestAnimationFrame(() => field.focus());
            }
          }}>
            <div className="space-y-2"><Label htmlFor="calendar">出生日期历法</Label><NativeSelect id="calendar" value={input.calendar} onChange={(e) => changeCalendar(e.target.value as BirthInput['calendar'])} className="choice"><NativeSelectOption value="solar">公历 / 阳历</NativeSelectOption><NativeSelectOption value="lunar">农历 / 阴历</NativeSelectOption></NativeSelect></div>
            <div className="grid grid-cols-[1.35fr_1fr_1fr] gap-2">
              {([['year', '年', 1901, 2099], ['month', '月', 1, 12], ['day', '日', 1, input.calendar === 'lunar' ? 30 : 31]] as const).map(([key, label, min, max]) => <div key={key} className="min-w-0 space-y-2"><Label htmlFor={key}>{label}</Label><Input id={key} type="number" inputMode="numeric" min={min} max={max} required value={input[key] || ''} onChange={(e) => update(key, Number(e.target.value))} className="h-11" /></div>)}
            </div>
            {input.calendar === 'lunar' && <div className="flex items-center gap-3"><Checkbox id="leap" checked={input.leap} onCheckedChange={(checked) => update('leap', checked)} /><Label htmlFor="leap">这是闰月（会校验是否存在）</Label></div>}
            <div className="space-y-2"><Label htmlFor="time">出生时刻（24 小时制）</Label><Input id="time" type="time" step="1" required={!input.unknownTime} disabled={input.unknownTime} value={input.time} onChange={(e) => update('time', e.target.value)} className="h-11" /></div>
            <div className="flex items-center gap-3"><Checkbox id="unknown" checked={input.unknownTime} onCheckedChange={(checked) => setInput((v) => ({ ...v, unknownTime: checked, clock: checked ? 'beijing' : v.clock }))} /><Label htmlFor="unknown">不清楚出生时刻</Label></div>
            <div className="space-y-2"><Label htmlFor="city">出生城市</Label><NativeSelect id="city" value={CITIES.some((c) => c.name === input.city) ? input.city : 'custom'} className="choice" onChange={(e) => { const city = CITIES.find((c) => c.name === e.target.value); setInput((v) => ({ ...v, city: city?.name ?? '其他地区', longitude: city?.longitude ?? v.longitude })); }}>
              {CITIES.map((city) => <NativeSelectOption key={city.name}>{city.name}</NativeSelectOption>)}<NativeSelectOption value="custom">其他地区 / 手动经度</NativeSelectOption>
            </NativeSelect></div>
            <div className="space-y-2"><Label htmlFor="gender">起运性别口径</Label><NativeSelect id="gender" value={input.gender} onChange={(e) => update('gender', e.target.value as BirthInput['gender'])} className="choice"><NativeSelectOption value="unknown">不提供（仍可排四柱）</NativeSelectOption><NativeSelectOption value="male">男命口径</NativeSelectOption><NativeSelectOption value="female">女命口径</NativeSelectOption></NativeSelect></div>

            <div className="space-y-2"><Label htmlFor="name">称呼（选填）</Label><Input id="name" value={input.name} maxLength={30} onChange={(e) => update('name', e.target.value)} placeholder="未署名" className="h-11" /></div>
            <details ref={rulesRef} className="rules-panel">
              <summary className="cursor-pointer font-medium">时间与流派规则<span className="mt-2 block text-sm font-normal leading-6 text-muted-foreground">{input.timezone === 'Asia/Shanghai' ? '历史民用时间' : 'UTC+8 标准时间'} · {input.clock === 'apparent' ? '真太阳时近似' : '北京时间'} · {input.daySect === 1 ? '23:00' : '00:00'} 换日<br />起运：{input.yunSect === 2 ? '按分钟' : '按时辰'}折算 · 点此展开修改</span></summary>
              <div className="mt-4 space-y-4">
                <div className="space-y-2"><Label htmlFor="timezone">出生记录采用的时制</Label><NativeSelect id="timezone" value={input.timezone} onChange={(e) => update('timezone', e.target.value as BirthInput['timezone'])} className="choice"><NativeSelectOption value="Asia/Shanghai">历史民用时间（自动处理夏令时）</NativeSelectOption><NativeSelectOption value="+08:00">明确为 UTC+8 标准时间</NativeSelectOption></NativeSelect><p className="text-sm leading-6 text-muted-foreground">若记录已扣除夏令时，选择 UTC+8，避免重复校正。新疆地方时间须先换算，不能直接填入。</p></div>
                <div className="space-y-2"><Label htmlFor="clock">日柱与时柱的时间口径</Label><NativeSelect id="clock" value={input.clock} disabled={input.unknownTime} onChange={(e) => update('clock', e.target.value as BirthInput['clock'])} className="choice"><NativeSelectOption value="beijing">北京时间（UTC+8）</NativeSelectOption><NativeSelectOption value="apparent">出生地真太阳时（近似）</NativeSelectOption></NativeSelect></div>
                {input.clock === 'apparent' && <div className="space-y-2"><Label htmlFor="longitude">出生地经度（东经 °）</Label><Input id="longitude" type="number" min="73" max="135" step="0.001" required value={input.longitude} onChange={(e) => update('longitude', Number(e.target.value))} className="h-11" /><p className="text-sm leading-6 text-muted-foreground">城市预设为市区近似经度，可改为出生地址经度。每度约对应 4 分钟。</p></div>}
                <div className="space-y-2"><Label htmlFor="sect">日柱换日口径</Label><NativeSelect id="sect" value={input.daySect} onChange={(e) => update('daySect', Number(e.target.value) as 1 | 2)} className="choice"><NativeSelectOption value="2">子正 00:00 换日（流派 2）</NativeSelectOption><NativeSelectOption value="1">子初 23:00 换日（流派 1）</NativeSelectOption></NativeSelect></div>
                <div className="space-y-2"><Label htmlFor="yunSect">起运折算方式</Label><NativeSelect id="yunSect" value={input.yunSect} onChange={(e) => update('yunSect', Number(e.target.value) as 1 | 2)} className="choice"><NativeSelectOption value="2">按分钟折算（3 天折 1 年）</NativeSelectOption><NativeSelectOption value="1">按时辰折算（传统整时辰法）</NativeSelectOption></NativeSelect></div>
                <div className="space-y-2"><Label htmlFor="overlap">夏令时回拨的重复时刻</Label><NativeSelect id="overlap" value={input.overlap} onChange={(e) => update('overlap', e.target.value as BirthInput['overlap'])} className="choice"><NativeSelectOption value="reject">未确认（遇到时提示）</NativeSelectOption><NativeSelectOption value="earlier">第一次出现</NativeSelectOption><NativeSelectOption value="later">第二次出现</NativeSelectOption></NativeSelect></div>
              </div>
            </details>
            {error && <p ref={errorRef} tabIndex={-1} role="alert" className="scroll-mt-5 rounded-lg bg-destructive/10 p-3 text-sm leading-6 text-destructive">{error}</p>}
            <Button type="submit" className="h-12 w-full rounded-xl text-base"><ScrollText />排出命盘</Button>
          </form>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">资料仅存于本机，计算不上传。</p>
          {history.length > 0 && <section className="mt-5 border-t pt-5"><h2 className="mb-3 flex items-center gap-2 text-base font-medium"><History className="size-4" />最近五份命盘</h2><ul className="space-y-2">{history.map((item) => <li key={item.id} className="flex items-center gap-1"><Button variant="outline" className="min-w-0 flex-1 justify-start truncate" onClick={() => restore(item)}>{item.input.name || '未署名'} · {item.input.year}/{item.input.month}/{item.input.day}</Button><Button size="icon" variant="ghost" aria-label={`删除${item.input.name || '未署名'}的记录`} onClick={() => saveHistory(history.filter((v) => v.id !== item.id))}><Trash2 /></Button></li>)}</ul></section>}
          </div>
        </aside>

        <section className="results-column" aria-live="polite">
          <div className="workspace-heading"><div><p className="workspace-kicker">{isExample ? '示例命盘' : '已生成命盘'}</p><h2 ref={resultsRef} tabIndex={-1} className="scroll-mt-5">{result.input.name.trim() || '未署名'}的命笺</h2><p className="workspace-caption">{result.date} · {result.input.city} · {result.pillars.map((p) => p.map((v) => v.value).join('/') || '时柱未知').join('　')}</p></div><Button variant="outline" className="min-h-11 min-[801px]:hidden" onClick={() => { setFormCollapsed(false); requestAnimationFrame(() => focusSection(formTitleRef.current)); }}>修改资料</Button></div>
          {result.warnings.length > 0 && <details className="review-notice"><summary>排盘复核提示 · {result.warnings.length} 项</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
          <Tabs defaultValue="overview" className="result-tabs">
            <TabsList variant="line" className="result-tab-list"><TabsTrigger value="overview">命盘总览</TabsTrigger><TabsTrigger value="analysis">八字分析</TabsTrigger><TabsTrigger value="details">五行藏干</TabsTrigger><TabsTrigger value="luck">大运流年</TabsTrigger></TabsList>
            <TabsContent value="overview" className="overview-panels"><ChartSheet result={result} isExample={isExample} onCopy={copy} /><LuckOverview result={result} now={now} /></TabsContent>
            <TabsContent value="analysis" keepMounted><BaziEnhancement key={JSON.stringify(result.input)} result={result} now={now} /></TabsContent>
            <TabsContent value="luck" keepMounted><LuckExplorer key={JSON.stringify(result.input)} result={result} now={now} /></TabsContent>
            <TabsContent value="details">

          <section className="panel"><h3 className="section-title"><TermHelp term="藏干" />与<TermHelp term="十神" /></h3><Table><TableHeader><TableRow><TableHead>柱位</TableHead><TableHead>干支</TableHead><TableHead>藏干 · 五行 · 十神</TableHead></TableRow></TableHeader><TableBody>{result.pillars.flatMap((options, i) => options.map((p) => <TableRow key={`${i}-${p.value}`}><TableCell>{labels[i]}</TableCell><TableCell>{p.value}</TableCell><TableCell className="whitespace-normal leading-7">{p.hidden.map((h) => <span key={h.gan} className="mr-3 inline-block">{h.gan}{h.element} · <TermHelp term={h.tenGod} /></span>)}</TableCell></TableRow>))}</TableBody></Table>
            {result.elementCounts.length > 0 && <><h4 className="mb-3 mt-6 font-medium">八字表层五行计数</h4><div className="grid grid-cols-5 gap-2">{result.elementCounts.map((e) => <div key={e.element} className="rounded-xl bg-primary/6 py-3 text-center"><p className="text-sm text-muted-foreground">{e.element}</p><p className="mt-1 text-2xl text-primary">{e.count}</p></div>)}</div><p className="mt-3 text-sm leading-6 text-muted-foreground">只统计四干四支所属五行，共 8 个字；不加权藏干。这不是旺衰评分，不能据“缺某五行”直接判断喜用神或补救。</p></>}
          </section>


            </TabsContent>
          </Tabs>

          {notice && <output className="block rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6">{notice}</output>}
        </section>
      </div>
      <footer className="site-footer">命笺 · 尊重历法边界与出生资料隐私。不要据此作医疗、投资、婚姻或其他重大决定。</footer>
    </main>
  );
}
