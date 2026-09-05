'use client';
import { useState } from 'react';
import { ZiweiDetails, QimenDetails } from '@/components/palace-details';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { beijingNow, type BaZiResult } from '@/lib/bazi';
import type { ZiweiResult, QimenResult } from '@/lib/metaphysics';

const palacePositions: Record<string, [number, number]> = { 巳:[1,1], 午:[2,1], 未:[3,1], 申:[4,1], 酉:[4,2], 戌:[4,3], 亥:[4,4], 子:[3,4], 丑:[2,4], 寅:[1,4], 卯:[1,3], 辰:[1,2] };

function PromptBox({ prompt, setPrompt, stale, id }: { prompt: string; setPrompt: (v: string) => void; stale: boolean; id: string }) {
  const [notice, setNotice] = useState('');
  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setNotice('已复制。可粘贴到你选择的 AI 中解读。'); }
    catch { setNotice('浏览器未允许复制，请在文本框中全选并手动复制。'); }
  }
  return <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">AI 解读提示词</summary><div className="mt-4 space-y-3"><Label htmlFor={id}>可编辑的解读材料</Label><p className="text-sm leading-6 text-muted-foreground">尚未调用 AI。复制前可删除不想分享的资料；输入修改后需要重新生成。</p><Textarea id={id} value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-80 text-sm leading-6" /><Button onClick={copy} variant="outline" disabled={stale || !prompt.trim()}>复制提示词</Button>{notice && <p role="status" className="text-sm">{notice}</p>}</div></details>;
}

export function ZiweiPanel({ result, year, onYearChange, onResult }: { result: BaZiResult; year: number; onYearChange: (year:number) => void; onResult: (data:ZiweiResult | null) => void }) {
  const [pickedDate, setPickedDate] = useState('');
  const targetDate = pickedDate.startsWith(`${year}-`) ? pickedDate : `${year}-07-01`;
  const [selectedPalace, setSelectedPalace] = useState<number | null>(null);
  const [algorithm, setAlgorithm] = useState<'default' | 'zhongzhou'>('default');
  const [question, setQuestion] = useState('');
  const [data, setData] = useState<ZiweiResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [prompt, setPrompt] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const key = JSON.stringify({ algorithm, question, targetDate });
  const stale = !!data && key !== snapshot;
  async function generate() {
    setBusy(true); setError('');
    try { const engine = await import('@/lib/metaphysics'); const next = await engine.calculateZiwei(result, algorithm, targetDate); setData(next); onResult(next); setSelectedPalace(null); setPrompt(engine.expansionPrompt(next, question)); setSnapshot(key); }
    catch (e) { setError(e instanceof Error ? e.message : '紫微排盘未完成，请重试。'); }
    finally { setBusy(false); }
  }
  return <section className="panel space-y-6" aria-busy={busy}><div><h3 className="section-title">紫微斗数</h3><p className="text-sm leading-7 text-muted-foreground">沿用已排命盘的出生资料：{result.date} · {result.input.unknownTime ? '时刻未知' : result.input.time} · {result.input.city}。修改出生资料后，先点击“排出命盘”。</p></div>
    <div className="analysis-inputs"><div className="space-y-2"><Label htmlFor="ziwei-question">想了解的问题（选填）</Label><Textarea id="ziwei-question" maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例如：命宫与三方四正怎样联系？" /></div><div className="space-y-2"><Label htmlFor="ziwei-school">排盘口径</Label><NativeSelect id="ziwei-school" disabled={busy} value={algorithm} onChange={(e) => { setAlgorithm(e.target.value as typeof algorithm); onResult(null); }}><NativeSelectOption value="default">通行口径</NativeSelectOption><NativeSelectOption value="zhongzhou">中州派</NativeSelectOption></NativeSelect></div></div>
    <div className="space-y-2"><Label htmlFor="ziwei-fortune-date">运限日期（年份与八字分析联动）</Label><Input id="ziwei-fortune-date" disabled={busy} type="date" min={result.date} max="2199-12-31" value={targetDate} onChange={(e) => { setPickedDate(e.target.value); onResult(null); if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) onYearChange(Number(e.target.value.slice(0,4))); }} className="max-w-xs" /><p className="text-sm leading-6 text-muted-foreground">紫微按农历年划分，八字按立春划分。所列大限与流年对应具体日期，不概括整个公历年。</p></div>
    {(result.input.unknownTime || result.input.gender === 'unknown') && <p className="rounded-xl bg-muted p-4 text-sm leading-6">请先补全出生时刻与男命／女命口径。紫微不会用默认时刻或性别代填。</p>}
    <Button onClick={generate} disabled={busy || result.input.unknownTime || result.input.gender === 'unknown'}>{busy ? '正在排盘…' : data ? '重新生成紫微命盘' : '生成紫微命盘'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{stale && <p role="status" className="text-sm text-primary">输入已修改，下方仍为上次结果，请重新生成。</p>}
    {data && <><p className="text-sm leading-7 text-muted-foreground">{data.rules}</p><p className="text-sm">实际排盘时刻：{data.input.correctedTime.replace('T', ' ')} · {data.chart.time}</p>
      {data.horoscope && <div className="rounded-xl bg-muted p-4 text-sm leading-7"><p>{data.horoscope.date} · 虚岁 {data.horoscope.nominalAge}</p><p>大限 {data.horoscope.decadal.heavenlyStem}{data.horoscope.decadal.earthlyBranch} · 命宫落本命{data.chart.palaces[data.horoscope.decadal.index]?.name}</p><p>流年 {data.horoscope.yearly.heavenlyStem}{data.horoscope.yearly.earthlyBranch} · 命宫落本命{data.chart.palaces[data.horoscope.yearly.index]?.name}</p><p>流年四化：{data.horoscope.yearly.mutagen.map((s,i) => `${s}化${['禄','权','科','忌'][i]}`).join('、')}</p></div>}
      <div className="ziwei-grid"><div className="ziwei-center"><h4 className="font-serif text-2xl">{data.chart.fiveElementsClass}</h4><p>命宫 · {data.chart.earthlyBranchOfSoulPalace}</p><p>身宫 · {data.chart.earthlyBranchOfBodyPalace}</p><p>命主 · {data.chart.soul}</p><p>身主 · {data.chart.body}</p><p className="text-sm text-muted-foreground">{data.chart.lunarDate}</p><p className="text-sm text-muted-foreground">大限为虚岁区间</p></div>{data.chart.palaces.map((p) => { const pos = palacePositions[p.earthlyBranch]; return <article key={p.index} className={`ziwei-palace ${p.earthlyBranch === data.chart.earthlyBranchOfSoulPalace ? 'ziwei-soul' : ''}`} style={{ gridColumn: pos?.[0], gridRow: pos?.[1] }}><div className="flex flex-wrap items-center justify-between gap-2"><button type="button" className="palace-open" aria-label={`查看${p.name}三方四正与四化`} onClick={() => setSelectedPalace(p.index)}>{p.name}{p.isBodyPalace ? ' · 身宫' : ''} ↗</button><span className="text-sm text-muted-foreground">{p.heavenlyStem}{p.earthlyBranch}</span></div><div className="my-3 space-y-1">{p.majorStars.length ? p.majorStars.map((s) => <p key={s.name} className="text-primary">{s.name} <span className="text-sm">{s.brightness}{s.mutagen ? ` · 化${s.mutagen}` : ''}</span></p>) : <p className="text-sm text-muted-foreground">无主星</p>}</div><p className="text-sm leading-6">{p.minorStars.map((s) => `${s.name}${s.mutagen ? `化${s.mutagen}` : ''}`).join('、') || '无辅星'}</p><details className="mt-3 text-sm"><summary className="cursor-pointer text-muted-foreground">杂曜与长生</summary><p className="mt-2 leading-6">{p.adjectiveStars.map((s) => s.name).join('、') || '无杂曜'} · {p.changsheng12}</p></details><p className="mt-3 border-t pt-2 text-sm text-muted-foreground">大限 {p.decadal.range.join('–')} 虚岁</p></article>; })}</div>
      {data.warnings.length > 0 && <details className="review-notice"><summary>出生时间复核提示</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6">{data.warnings.map((w) => <li key={w}>{w}</li>)}</ul></details>}
      <ZiweiDetails data={data} index={selectedPalace} close={() => setSelectedPalace(null)} />
      <PromptBox id="ziwei-prompt" prompt={prompt} setPrompt={setPrompt} stale={stale} />
    </>}<p className="text-sm text-muted-foreground">来源：<a href="https://github.com/Brhiza/mingyu" className="source-link">命语</a> · <a href="https://github.com/SylarLong/iztro" className="source-link">iztro</a>。点击宫名查看三方四正、本命与岁运四化。</p></section>;
}

export function QimenPanel({ onResult }: { onResult: (data:QimenResult | null) => void }) {
  const [selectedPalace, setSelectedPalace] = useState<number | null>(null);
  const [time, setTime] = useState('');
  const [question, setQuestion] = useState('');
  const [data, setData] = useState<QimenResult | null>(null);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [snapshot, setSnapshot] = useState('');
  const key = JSON.stringify({ time, question });
  const stale = !!data && key !== snapshot;
  async function generate() {
    setBusy(true); setError('');
    try { const engine = await import('@/lib/metaphysics'); const next = await engine.calculateQimen(time); setData(next); onResult(next); setSelectedPalace(null); setPrompt(engine.expansionPrompt(next, question)); setSnapshot(key); }
    catch (e) { setError(e instanceof Error ? e.message : '奇门起局未完成，请重试。'); }
    finally { setBusy(false); }
  }
  return <section className="panel space-y-6" aria-busy={busy}><div><h3 className="section-title">奇门遁甲</h3><p className="text-sm leading-7 text-muted-foreground">为所问之事选择起局时刻。时家转盘 · 拆补法 · 北京时间 UTC+8，独立于左侧出生资料。</p></div><div className="space-y-2"><Label htmlFor="qimen-time">起局时间（北京时间）</Label><div className="flex flex-wrap gap-3"><Input id="qimen-time" disabled={busy} type="datetime-local" min="1901-01-01T00:00" max="2099-12-31T23:59" value={time} onChange={(e) => { setTime(e.target.value); onResult(null); }} className="max-w-xs" /><Button variant="outline" disabled={busy} onClick={() => { setTime(beijingNow().slice(0,16)); onResult(null); }}>使用当前北京时间</Button></div></div><div className="space-y-2"><Label htmlFor="qimen-question">所问之事（选填）</Label><Textarea id="qimen-question" maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="说明问题与背景，解读时将核对对应宫位" /></div><Button onClick={generate} disabled={busy || !time}>{busy ? '正在起局…' : data ? '重新生成奇门盘' : '生成奇门盘'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{stale && <p role="status" className="text-sm text-primary">输入已修改，下方仍为上次结果，请重新生成。</p>}
    {data && <><div className="rounded-xl bg-muted p-5"><h4 className="font-serif text-2xl">{data.chart.isYangDun ? '阳遁' : '阴遁'} {data.chart.juShu} 局</h4><p className="mt-3 leading-7">值符 · {data.chart.zhiFu}　值使 · {data.chart.zhiShi}</p><p className="text-sm leading-7">{data.time.replace('T',' ')} UTC+8 · {Object.values(data.chart.ganzhi).join('　')}</p><p className="text-sm leading-7 text-muted-foreground">节气 {data.chart.timeInfo.solarTerm} · 定局节气 {data.chart.timeInfo.juTerm} · {data.chart.timeInfo.epoch} · 空亡 {data.chart.voidBranches.join('、') || '未提供'} · 驿马 {data.chart.horseStar?.branch ?? '未提供'}</p></div>
      <p className="text-sm text-muted-foreground">九宫按上南下北、左东右西排列；中宫寄宫情况以盘内随行星干为准。</p><div className="qimen-grid">{[4,9,2,3,5,7,8,1,6].map((number) => { const p = data.chart.jiuGongGe.find((item) => item.gong === number); return p ? <article key={number} className="qimen-palace"><button type="button" className="palace-open" aria-label={`查看${p.name}组合依据`} onClick={() => setSelectedPalace(p.gong)}>{p.name} · {p.gong} ↗</button><p className="text-sm text-muted-foreground">{p.direction} · {p.element}</p><p className="my-3 font-medium text-primary">{p.renPan.door || '无门'} · {p.shenPan.god || '无神'}</p><p className="text-sm leading-6">九星 {p.tianPan.star || '—'}</p><p className="text-sm leading-6">天盘 {p.tianPan.stem || '—'} · 地盘 {p.diPan.stem || '—'}</p>{p.tianPan.companionStar && <p className="mt-2 text-sm leading-6">随行 {p.tianPan.companionStar} {p.tianPan.companionStem}</p>}</article> : null; })}</div>
      <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">格局与天地盘干关系</summary><div className="mt-4 space-y-3 text-sm leading-7">{data.chart.patternDetails.map((p) => <p key={p.tag}>{p.tag}：{p.summary}</p>)}{data.chart.stemRelations.map((p, i) => <p key={i}>{p.gong}宫 · {p.heavenStem} / {p.earthStem} · {p.relation} {p.pattern}</p>)}</div></details><QimenDetails data={data} number={selectedPalace} close={() => setSelectedPalace(null)} /><PromptBox id="qimen-prompt" prompt={prompt} setPrompt={setPrompt} stale={stale} />
    </>}<p className="text-sm leading-6 text-muted-foreground">来源：<a href="https://github.com/Brhiza/mingyu" className="source-link">命语</a>。传统格局名称不代表确定结果；本页不输出方位获利或固定应期承诺。</p></section>;
}

