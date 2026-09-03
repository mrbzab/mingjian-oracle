'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { annualPillar, annualYearAt, cycleYears, luckAt, type BaZiResult } from '@/lib/bazi';
import { TermHelp } from '@/components/term-help';
import { RelationsPanel } from '@/components/relations-panel';

type Props = { result: BaZiResult; now: string | null };

export function LuckOverview({ result, now }: Props) {
  const luck = result.luck;
  const status = now ? luckAt(luck, now) : null;
  const active = status && status.index >= 0 ? luck?.cycles[status.index] : null;
  return <section className="luck-overview" aria-label="当前大运概览">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-medium">当前大运</h3><span className="text-sm text-muted-foreground">{now ? `截至 ${now.slice(0, 10)} · 北京时间` : '正在确认当前日期'}</span></div>
    {luck ? <>
      <p className="mt-3 font-serif text-3xl text-primary">{!status ? '正在定位' : active ? `${active.value}大运` : status.state === 'before' ? '尚未起运' : '已超出所列八步大运'}</p>
      <div className="mt-4 grid gap-4 text-sm leading-7 sm:grid-cols-2">
        <div><p className="text-muted-foreground"><TermHelp term="起运" />年龄 · {luck.forward ? '顺行' : '逆行'}</p><p>出生后 {luck.age}</p><p>首次交运：{luck.start}</p></div>
        <div>{active ? <><p className="text-muted-foreground">第 {status!.index + 1} 步大运 · <TermHelp term={active.tenGod} /></p><p>{active.start} 起</p><p>{status!.index < luck.cycles.length - 1 ? `下次交运：${active.end}，转入${luck.cycles[status!.index + 1].value}大运` : `本步结束：${active.end}；后续未列出`}</p></> : <p className="text-muted-foreground">{status?.state === 'before' ? `将于 ${luck.start} 进入${luck.cycles[0].value}大运。` : status?.state === 'after' ? '当前日期不在已列出的八步范围内，不将最后一步当作当前大运。' : '按实际交运时间定位当前大运。'}</p>}</div>
      </div>
    </> : <p className="mt-2 text-sm leading-7 text-muted-foreground">填写出生时刻与男命／女命口径，即可查看起运时间和当前大运。</p>}
  </section>;
}

export function LuckExplorer({ result, now }: Props) {
  const [pickedCycle, setPickedCycle] = useState<number | null>(null);
  const [pickedYear, setPickedYear] = useState<number | null>(null);
  const stripRef = useRef<HTMLFieldSetElement>(null);
  const current = now ? luckAt(result.luck, now) : null;
  const currentYear = now ? annualYearAt(now) : null;
  const cycleIndex = pickedCycle ?? (current?.state === 'active' ? current.index : current?.state === 'after' ? 7 : 0);
  const selected = result.luck?.cycles[cycleIndex];
  const years = useMemo(() => selected ? cycleYears(selected, result.master) : [], [selected, result.master]);
  const defaultYear = years.find((item) => item.year === currentYear)?.year ?? years[0]?.year ?? Math.max(1901, currentYear ?? 2026);
  const year = pickedYear ?? defaultYear;
  const flow = useMemo(() => annualPillar(year, result.master), [year, result.master]);
  const overlap = years.find((item) => item.year === year);
  useEffect(() => {
    const strip = stripRef.current;
    const button = strip?.querySelector<HTMLButtonElement>('[aria-pressed="true"]');
    if (strip && button) strip.scrollTo({ left: button.offsetLeft - (strip.clientWidth - button.clientWidth) / 2 });
  }, [cycleIndex]);

  function chooseCycle(index: number) { setPickedCycle(index); setPickedYear(null); }
  return <section className="panel" aria-label="大运流年联动">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="section-title mb-0 flex items-center gap-2"><Compass className="size-5 text-primary" />大运 · 流年</h3>{current?.state === 'active' && <Button variant="outline" onClick={() => { setPickedCycle(null); setPickedYear(null); }}>回到当前大运</Button>}</div>
    {selected && result.luck ? <>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">选择一步大运，再查看其中的流年。时间均为北京时间，起点包含、终点不包含。</p>
      <fieldset ref={stripRef} className="relative -mx-1 mt-5 flex min-w-0 snap-x gap-2 overflow-x-auto p-1 pb-3" aria-label="选择大运">
        {result.luck.cycles.map((item, index) => <Button key={item.start} variant={cycleIndex === index ? 'default' : 'outline'} className="h-auto min-w-32 shrink-0 snap-start flex-col gap-2 whitespace-normal py-4" onClick={() => chooseCycle(index)} aria-pressed={cycleIndex === index}>
          <span className="text-sm">第 {index + 1} 步{current?.index === index ? ' · 当前' : ''}</span><span className="font-serif text-2xl">{item.value}</span><span className="text-sm">{item.start.slice(0, 4)}—{item.end.slice(0, 4)}</span>
        </Button>)}
      </fieldset>
      <div className="mt-2 rounded-xl bg-muted/70 p-4 text-sm leading-7"><p className="text-base font-medium">{selected.value}<TermHelp term="大运" /> · <TermHelp term={selected.tenGod} /> · <TermHelp term="纳音" />：{selected.naYin}</p><p>{selected.start} 至 {selected.end}</p></div>
      <h4 className="mb-3 mt-6 font-medium">这步大运覆盖的流年</h4>
      <fieldset className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4" aria-label="选择流年">
        {years.map((item) => <Button key={item.year} variant={year === item.year ? 'default' : 'outline'} aria-pressed={year === item.year} onClick={() => setPickedYear(item.year)} className="h-auto flex-col gap-1 whitespace-normal px-2 py-3"><span className="text-base">{item.year} · {item.value}</span><span className="text-sm">{item.year === currentYear ? '当前流年 · ' : ''}{item.partial ? '部分时段' : item.tenGod}</span></Button>)}
      </fieldset>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">流年以立春为界，不从元旦开始。“部分时段”表示该流年与本步大运只有一段时间重合，交运前后可能分属不同大运。</p>
    </> : <div className="mt-4 flex flex-wrap items-center gap-3"><p className="text-sm leading-6 text-muted-foreground">尚无大运，可先查看流年与本命四柱。</p><Label htmlFor="flowYear">年份</Label><NativeSelect id="flowYear" value={year} onChange={(event) => setPickedYear(Number(event.target.value))}>{Array.from({ length: 299 }, (_, index) => 1901 + index).map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}</NativeSelect></div>}
      <div className="mt-6 border-t pt-5">
        <h4 className="text-lg font-medium">{year} 年 · 本命、大运与流年对照</h4>
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {result.pillars.map((options, index) => <div key={index} className="rounded-xl border bg-background p-3 text-center"><p className="text-sm text-muted-foreground">{['本命年柱', '本命月柱', '本命日柱', '本命时柱'][index]}</p><p className="my-3 font-serif text-2xl text-primary">{options.map((item) => item.value).join(' / ') || '未知'}</p><div className="text-sm">{options.length ? options.map((item) => <div key={item.value}><TermHelp term={item.tenGod} /></div>) : '不推测'}</div></div>)}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center"><p className="text-sm text-muted-foreground">所选<TermHelp term="大运" /></p><p className="my-3 font-serif text-2xl text-primary">{selected?.value ?? '未计算'}</p><p className="text-sm"><TermHelp term={selected?.tenGod ?? '需补充资料'} /></p></div>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-center"><p className="text-sm text-muted-foreground">所选<TermHelp term="流年" /></p><p className="my-3 font-serif text-2xl text-primary">{flow.value}</p><p className="text-sm"><TermHelp term={flow.tenGod} /></p></div>
        </div>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">{flow.value}流年：{flow.start} 立春起，至 {flow.end} 立春止。纳音：{flow.naYin}。</p>
        {overlap && <p className="mt-2 rounded-lg bg-primary/5 p-3 text-sm leading-7">本步大运与该流年的重合时段：{overlap.overlapStart} 至 {overlap.overlapEnd}（不含）。{overlap.partial && '此处对照仅适用于这段时间，不代表整个流年。'}</p>}
        <p className="mt-3 text-sm leading-6 text-muted-foreground">十神是各柱天干与本命日主的传统关系名称，不是吉凶评分，也不表示某件事必然发生。</p>
      </div>
      <RelationsPanel result={result} luck={selected} flow={flow} period={overlap ? `岁运关系仅适用于 ${overlap.overlapStart} 至 ${overlap.overlapEnd}（不含）。` : `流年时段：${flow.start} 至 ${flow.end}（不含）。`} />
      {result.luck && <OtherYears master={result.master} currentYear={currentYear} />}
  </section>;
}

function OtherYears({ master, currentYear }: { master: string | null; currentYear: number | null }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const year = chosen ?? Math.max(1901, currentYear ?? 2026);
  const flow = useMemo(() => annualPillar(year, master), [year, master]);
  return <details className="mt-5 border-t pt-4">
    <summary className="cursor-pointer font-medium">单独查看其他年份</summary>
    <div className="mt-4 flex items-center gap-3"><Label htmlFor="otherYear">年份</Label><NativeSelect id="otherYear" value={year} onChange={(event) => setChosen(Number(event.target.value))}>{Array.from({ length: 299 }, (_, index) => 1901 + index).map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}</NativeSelect></div>
    <p className="mt-4 font-serif text-2xl text-primary">{flow.value} <span className="font-sans text-base"><TermHelp term={flow.tenGod} /> · <TermHelp term="纳音" />：{flow.naYin}</span></p>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">{flow.start} 至 {flow.end}（不含，UTC+8）。此处仅查看流年，不与上方所选大运配对。</p>
  </details>;
}
