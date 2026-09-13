'use client';

import { type SyntheticEvent, useEffect, useRef, useState } from 'react';
import { ScrollText } from 'lucide-react';
import {TimeComparisonPanel} from '@/components/time-comparison';
import { ReportPanel } from '@/components/report-panel';
import { ArchivePanel } from '@/components/archive-panel';
import { LuckTimeline } from '@/components/luck-timeline';
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
import { ZiweiPanel, QimenPanel } from '@/components/metaphysics-panels';
import { SynthesisPanel } from '@/components/synthesis-panel';
import { resolveZiweiDate, matchingZiwei, matchingQimen } from '@/lib/workspace-state';
import type { ZiweiResult, QimenResult } from '@/lib/metaphysics';


const example = calculateBaZi(DEFAULT_INPUT);
const labels = ['年柱', '月柱', '日柱', '时柱'];

export default function Home() {
  const [input, setInput] = useState<BirthInput>({ ...DEFAULT_INPUT });
  const [result, setResult] = useState(example);
  const [isExample, setIsExample] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeTab,setActiveTab] = useState('overview');
  const [timelineEnabled,setTimelineEnabled] = useState(false);
  const [timelineBusy,setTimelineBusy] = useState(false);
  const [timelineMessage,setTimelineMessage] = useState('');
  const [now, setNow] = useState<string | null>(null);
  const [formCollapsed, setFormCollapsed] = useState(false);
  const [chosenYear, setChosenYear] = useState<number | null>(null);
  const year = chosenYear ?? Math.max(Number(result.date.slice(0,4)), Number(now?.slice(0,4) ?? result.date.slice(0,4)));
  const birthKey = JSON.stringify(result.input);
  const [ziweiSnapshot, setZiweiSnapshot] = useState<{birthKey:string;data:ZiweiResult} | null>(null);
  const [qimenSnapshot, setQimenSnapshot] = useState<QimenResult | null>(null);
  const [ziweiAlgorithm, setZiweiAlgorithm] = useState<'default'|'zhongzhou'>('default');
  const [pickedZiweiDate, setPickedZiweiDate] = useState<string|null>(null);
  const ziweiDate = resolveZiweiDate(result.date,year,pickedZiweiDate);
  const [qimenTime, setQimenTime] = useState('');
  const [refreshing,setRefreshing] = useState(false);
  const [refreshToken,setRefreshToken] = useState(0);
  const [refreshError,setRefreshError] = useState('');
  const draftChanged = JSON.stringify(input) !== birthKey;
  const currentQimen = matchingQimen(qimenSnapshot,qimenTime);
  function changeYear(value:number) { if(!refreshing && Number.isInteger(value) && value >= 1901 && value <= 2199) setChosenYear(value); }
  useEffect(() => { setRefreshError(''); setNotice(''); }, [input, year, ziweiDate, ziweiAlgorithm, qimenTime]);
  async function refreshAll() {
    setRefreshing(true); setRefreshError('');
    try {
      const next = calculateBaZi(input);
      const nextYear = year;
      const date = resolveZiweiDate(next.date,nextYear,pickedZiweiDate);
      if(window.matchMedia('(max-width: 800px)').matches) setFormCollapsed(true);
      shouldReveal.current = true;
      setResult(next); setIsExample(false); setChosenYear(nextYear); setError('');
      setZiweiSnapshot(null); setQimenSnapshot(null);
      const engine = await import('@/lib/metaphysics');
      const errors:string[] = [];
      if(!next.input.unknownTime && next.input.gender !== 'unknown') {
        try { const data=await engine.calculateZiwei(next,ziweiAlgorithm,date);setZiweiSnapshot({birthKey:JSON.stringify(next.input),data}); }
        catch(e){errors.push(e instanceof Error?e.message:'紫微更新失败');}
      } else errors.push('紫微需补全出生时刻与男命／女命口径。');
      if(qimenTime) { try { setQimenSnapshot(await engine.calculateQimen(qimenTime)); } catch(e){errors.push(e instanceof Error?e.message:'奇门更新失败');} }
      else errors.push('奇门尚未填写起局时间，已跳过。');
      setRefreshToken(v=>v+1);setRefreshError(errors.join(' '));
      setNotice('可用命盘已更新，综合摘要已同步。');
    } catch(e) { setRefreshError(e instanceof Error?e.message:'更新未完成，请检查资料。'); }
    finally {setRefreshing(false);}
  }
  const currentZiwei = matchingZiwei(ziweiSnapshot,birthKey,ziweiDate,ziweiAlgorithm);
  useEffect(()=>{
    if(!timelineEnabled||refreshing)return;
    let cancelled=false;setTimelineBusy(true);setTimelineMessage('');
    if(result.input.unknownTime||result.input.gender==='unknown'){setTimelineMessage('八字已联动；紫微需补全出生时刻与性别口径。');setTimelineBusy(false);return;}
    import('@/lib/metaphysics').then(engine=>engine.calculateZiwei(result,ziweiAlgorithm,ziweiDate)).then(data=>{if(!cancelled){setZiweiSnapshot({birthKey,data});setTimelineMessage('八字与紫微已同步至 '+year+' 年；紫微运限日期 '+ziweiDate+'。');}}).catch(e=>{if(!cancelled)setTimelineMessage('八字已联动；紫微：'+(e instanceof Error?e.message:'更新未完成'));}).finally(()=>{if(!cancelled)setTimelineBusy(false);});
    return()=>{cancelled=true;};
  },[timelineEnabled,refreshing,result,year,ziweiDate,ziweiAlgorithm,birthKey]);
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
  function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const next = calculateBaZi(input);
      if (window.matchMedia('(max-width: 800px)').matches) setFormCollapsed(true);
      shouldReveal.current = true;
      setResult(next); setIsExample(false); setError(''); setNotice(''); setNow(beijingNow());

    } catch (e) { setError(e instanceof Error ? e.message : '排盘未完成，请检查出生资料。'); }
  }
  function restore(saved: BirthInput) {
    try { const next = calculateBaZi(saved); shouldReveal.current = true; setActiveTab('overview'); setFormCollapsed(true); setZiweiSnapshot(null); setResult(next); setInput(saved); setIsExample(false); setError(''); setNow(beijingNow()); }
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
        <aside className="birth-panel"><fieldset disabled={refreshing} className="min-w-0">
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
          <p className="mt-4 text-sm leading-6 text-muted-foreground">排盘与解读资料整理均在本机完成，可自行复制提示词。</p>

          </div>
        </fieldset></aside>

        <section className="results-column" aria-live="polite">
          <div className="workspace-heading"><div><p className="workspace-kicker">{isExample ? '示例命盘' : '已生成命盘'}</p><h2 ref={resultsRef} tabIndex={-1} className="scroll-mt-5">{result.input.name.trim() || '未署名'}的命笺</h2><p className="workspace-caption">{result.date} · {result.input.city} · {result.pillars.map((p) => p.map((v) => v.value).join('/') || '时柱未知').join('　')}</p></div><Button variant="outline" className="min-h-11 min-[801px]:hidden" onClick={() => { setFormCollapsed(false); requestAnimationFrame(() => focusSection(formTitleRef.current)); }}>修改资料</Button></div>
          <section className="workspace-context" aria-label="当前资料与更新状态"><div className="context-facts"><p><span>当前出生资料</span><strong>{result.date} · {result.input.unknownTime ? '时刻未知' : result.input.time} · {result.input.city}</strong></p><div><Label htmlFor="workspace-year">关注年份</Label><NativeSelect id="workspace-year" value={year} disabled={refreshing} onChange={e=>changeYear(Number(e.target.value))}>{Array.from({length:299},(_,i)=>1901+i).map(v=><NativeSelectOption key={v} value={v}>{v} 年</NativeSelectOption>)}</NativeSelect></div><p><span>奇门起局 · 北京时间</span><strong>{qimenTime ? qimenTime.replace('T',' ') : '尚未填写'}</strong></p></div><div className="context-actions"><p role="status">{draftChanged ? '出生资料已修改：八字、紫微和综合资料待更新。' : '八字：当前资料'} · 紫微：{draftChanged ? '待出生资料更新' : currentZiwei ? '已同步 · '+ziweiDate : '待生成／更新'} · 奇门：{currentQimen ? '已同步' : qimenTime ? '待生成／更新' : '待填起局时间'}</p><Button onClick={refreshAll} disabled={refreshing}>{refreshing ? '正在更新…' : '一键更新命盘与综合资料'}</Button></div>{refreshError && <p role="alert" className="mt-3 text-sm leading-6">{refreshError}</p>}</section>
          {result.warnings.length > 0 && <details className="review-notice"><summary>排盘复核提示 · {result.warnings.length} 项</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>}
          <Tabs value={activeTab} onValueChange={value=>setActiveTab(String(value))} className="result-tabs">
            <TabsList variant="line" className="result-tab-list"><TabsTrigger value="overview">命盘总览</TabsTrigger><TabsTrigger value="analysis">八字分析</TabsTrigger><TabsTrigger value="details">五行藏干</TabsTrigger><TabsTrigger value="luck">大运流年</TabsTrigger><TabsTrigger value="ziwei">紫微斗数</TabsTrigger><TabsTrigger value="qimen">奇门遁甲</TabsTrigger><TabsTrigger value="synthesis">综合解读</TabsTrigger><TabsTrigger value="archives">命盘档案</TabsTrigger><TabsTrigger value="export">报告导出</TabsTrigger><TabsTrigger value="compare">双时辰对照</TabsTrigger></TabsList>
            <TabsContent value="ziwei" keepMounted><ZiweiPanel result={result} data={currentZiwei} targetDate={ziweiDate} algorithm={ziweiAlgorithm} locked={refreshing} onDateChange={(v)=>{setPickedZiweiDate(v);if (/^\d{4}-\d{2}-\d{2}$/.test(v)) changeYear(Number(v.slice(0,4)));}} onAlgorithmChange={setZiweiAlgorithm} onResult={(data) => setZiweiSnapshot(data ? {birthKey,data} : null)} /></TabsContent>
            <TabsContent value="qimen" keepMounted><QimenPanel data={currentQimen} time={qimenTime} onTimeChange={setQimenTime} locked={refreshing} onResult={setQimenSnapshot} /></TabsContent>
            <TabsContent value="synthesis" keepMounted><SynthesisPanel key={birthKey} result={result} year={year} ziwei={currentZiwei} qimen={currentQimen} refreshToken={refreshToken} /></TabsContent>
            <TabsContent value="overview" className="overview-panels"><ChartSheet result={result} isExample={isExample} onCopy={copy} /><LuckOverview result={result} now={now} /></TabsContent>
            <TabsContent value="analysis" keepMounted><BaziEnhancement key={birthKey} result={result} year={year} onYearChange={changeYear} refreshToken={refreshToken} /></TabsContent>
            <TabsContent value="luck" keepMounted><LuckTimeline result={result} year={year} onSelect={value=>{setTimelineEnabled(true);changeYear(value);}} busy={refreshing||timelineBusy} message={timelineMessage}/><LuckExplorer key={JSON.stringify(result.input)} result={result} now={now} sharedYear={year} onYearChange={changeYear} /></TabsContent>
            <TabsContent value="compare"><TimeComparisonPanel key={birthKey} result={result} targetDate={ziweiDate} algorithm={ziweiAlgorithm} draftChanged={draftChanged} onUse={restore}/></TabsContent><TabsContent value="export"><ReportPanel result={result} year={year} ziwei={currentZiwei} qimen={currentQimen} draftChanged={draftChanged}/></TabsContent>
            <TabsContent value="archives" keepMounted><ArchivePanel result={result} onLoad={restore} draftChanged={draftChanged}/></TabsContent>
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
