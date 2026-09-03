'use client';

import { type SyntheticEvent, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Clock3, Compass, Copy, History, MoonStar, RefreshCw, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Reading = {
  id: string; name: string; date: string; time: string; gender: string; createdAt: string;
  element: string; sign: string; keyword: string; overview: string; advice: string;
  luckyColor: string; luckyNumber: number; luckyDirection: string;
  scores: { label: string; value: number }[];
};

const elements = ['木', '火', '土', '金', '水'];
const colors = ['松石青', '朱砂红', '月白', '黛青', '琥珀金', '藤黄'];
const directions = ['东方', '东南', '南方', '西南', '西方', '西北', '北方', '东北'];
const keywords = ['顺势而为', '静候花开', '拨云见日', '守正出新', '心有定见', '乘风而起'];
const signs = ['上上签', '上吉签', '中吉签', '渐进签'];

function seededNumbers(input: string) {
  let seed = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    seed ^= input.charCodeAt(i);
    seed = Math.imul(seed, 16777619);
  }
  return Array.from({ length: 12 }, (_, index) => {
    seed = Math.imul(seed ^ (index + 1), 2246822519);
    seed ^= seed >>> 13;
    return Math.abs(seed >>> 0);
  });
}

function createReading(name: string, date: string, time: string, gender: string): Reading {
  const numbers = seededNumbers(`${name}|${date}|${time}|${gender}`);
  const element = elements[numbers[0] % elements.length];
  const keyword = keywords[numbers[1] % keywords.length];
  const sign = signs[numbers[2] % signs.length];
  const scores = ['事业', '财运', '情感', '健康', '成长'].map((label, index) => ({ label, value: 62 + (numbers[index + 3] % 34) }));
  const overview = [
    `你的气象偏向「${element}」，眼下宜先定方向，再稳步推进。看似缓慢的积累，正在形成下一阶段的转机。`,
    '当前运势重在取舍。把精力集中到一件真正重要的事情上，比同时追逐多个答案更容易见到成果。',
    '近期人际与机会相互牵引。真诚表达需求，同时保留自己的节奏，会遇见更适合你的助力。',
  ][numbers[8] % 3];
  const advice = [
    '先完成最小的一步，再决定下一步；今日不宜被他人的节奏催促。',
    '整理一次空间或待办清单，清晰的边界会带来新的判断。',
    '把重要想法写下来，并在日落前与可信任的人交流一次。',
    '适合学习、复盘与重新安排优先级，避免冲动承诺。',
  ][numbers[9] % 4];
  return {
    id: `${Date.now()}-${numbers[10]}`, name: name || '有缘人', date, time, gender,
    createdAt: new Date().toISOString(), element, sign, keyword, overview, advice,
    luckyColor: colors[numbers[10] % colors.length], luckyNumber: (numbers[11] % 9) + 1,
    luckyDirection: directions[numbers[6] % directions.length], scores,
  };
}

const sampleReading = createReading('有缘人', '1996-06-18', '午时', '不透露');

export default function Home() {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('午时');
  const [gender, setGender] = useState('不透露');
  const [reading, setReading] = useState<Reading>(sampleReading);
  const [history, setHistory] = useState<Reading[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('mingjian-readings');
    if (saved) try {
      // oxlint-disable-next-line react/react-compiler
      setHistory(JSON.parse(saved));
    } catch { window.localStorage.removeItem('mingjian-readings'); }
  }, []);

  const displayDate = useMemo(() => new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(`${reading.date}T12:00:00`)), [reading.date]);

  function submit(event: SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    if (!date) return;
    const next = createReading(name.trim(), date, time, gender);
    const nextHistory = [next, ...history].slice(0, 5);
    setReading(next); setHistory(nextHistory);
    window.localStorage.setItem('mingjian-readings', JSON.stringify(nextHistory));
  }

  async function copyResult() {
    const text = `${reading.name}的命笺｜${reading.sign}\n关键词：${reading.keyword}\n${reading.overview}\n今日宜：${reading.advice}\n幸运色：${reading.luckyColor}｜幸运数字：${reading.luckyNumber}｜方位：${reading.luckyDirection}`;
    await navigator.clipboard.writeText(text);
    setCopied(true); window.setTimeout(() => setCopied(false), 1800);
  }

  function restore(item: Reading) {
    setReading(item); setName(item.name === '有缘人' ? '' : item.name);
    setDate(item.date); setTime(item.time); setGender(item.gender);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(circle_at_20%_8%,rgba(207,155,73,.18),transparent_26%),radial-gradient(circle_at_85%_24%,rgba(54,105,89,.16),transparent_25%)]" />
      <header className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-6 md:px-10">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full border border-primary/25 bg-primary text-primary-foreground shadow-sm"><MoonStar className="size-5" /></span>
          <div><p className="font-serif text-xl font-semibold tracking-[.18em]">命笺</p><p className="text-[10px] tracking-[.28em] text-muted-foreground">东方灵感 · 今日启示</p></div>
        </div>
        <span className="rounded-full border border-border bg-card/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">仅供娱乐与自我探索</span>
      </header>

      <section className="relative mx-auto grid max-w-7xl gap-6 px-5 pb-12 pt-4 md:px-10 lg:grid-cols-[.8fr_1.2fr] lg:gap-8 lg:pt-8">
        <div className="self-start rounded-[28px] border border-border/80 bg-card/88 p-6 shadow-[0_30px_80px_rgba(38,30,20,.09)] backdrop-blur md:p-8">
          <div className="mb-8">
            <p className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[.2em] text-primary"><Sparkles className="size-4" />起一封命笺</p>
            <h1 className="font-serif text-3xl font-semibold leading-tight md:text-4xl">问当下，也问内心</h1>
            <p className="mt-3 max-w-md text-sm leading-7 text-muted-foreground">输入基础信息，生成一份稳定、可重复的个性化解读。相同信息会得到相同结果。</p>
          </div>
          <form className="space-y-5" onSubmit={submit}>
            <div className="space-y-2"><Label htmlFor="name" className="flex items-center gap-2"><UserRound className="size-4 text-primary" />称呼</Label><Input id="name" value={name} onChange={(event) => setName(event.target.value)} placeholder="留空则称为有缘人" className="h-11 bg-background/70" maxLength={20} /></div>
            <div className="space-y-2"><Label htmlFor="date" className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" />出生日期</Label><Input id="date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required max={new Date().toISOString().slice(0, 10)} className="h-11 bg-background/70" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label htmlFor="time" className="flex items-center gap-2"><Clock3 className="size-4 text-primary" />出生时辰</Label><select id="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30">{['子时', '丑时', '寅时', '卯时', '辰时', '巳时', '午时', '未时', '申时', '酉时', '戌时', '亥时', '不清楚'].map((item) => <option key={item}>{item}</option>)}</select></div>
              <div className="space-y-2"><Label htmlFor="gender">性别</Label><select id="gender" value={gender} onChange={(event) => setGender(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background/70 px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30">{['不透露', '女', '男'].map((item) => <option key={item}>{item}</option>)}</select></div>
            </div>
            <Button type="submit" size="lg" className="mt-2 h-12 w-full rounded-xl text-base shadow-[0_12px_30px_rgba(38,86,70,.22)]"><Sparkles data-icon="inline-start" />为我解读</Button>
          </form>
          {history.length > 0 && <div className="mt-8 border-t border-border pt-6"><p className="mb-3 flex items-center gap-2 text-sm font-medium"><History className="size-4 text-primary" />最近命笺</p><div className="flex flex-wrap gap-2">{history.map((item) => <button key={item.id} onClick={() => restore(item)} className="rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs text-muted-foreground transition hover:border-primary/40 hover:text-primary">{item.name} · {item.date.slice(5)}</button>)}</div></div>}
        </div>

        <article className="relative overflow-hidden rounded-[28px] border border-primary/20 bg-[#173d34] p-6 text-[#f7f2e8] shadow-[0_30px_90px_rgba(24,56,48,.2)] md:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full border border-[#d4a95d]/20" /><div className="pointer-events-none absolute -right-6 -top-10 size-44 rounded-full border border-[#d4a95d]/20" />
          <div className="relative">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/12 pb-6"><div><p className="mb-2 text-xs tracking-[.2em] text-[#d9bd86]">{displayDate} · {reading.time}</p><h2 className="font-serif text-3xl font-semibold">{reading.name}的命笺</h2></div><span className="rounded-full border border-[#d9bd86]/35 bg-[#d9bd86]/10 px-4 py-2 font-serif text-sm text-[#efd79d]">{reading.sign}</span></div>
            <div className="grid gap-6 py-7 sm:grid-cols-[1fr_auto]"><div><p className="text-xs tracking-[.24em] text-[#b9d2c8]">本命关键词</p><p className="mt-2 font-serif text-4xl text-[#f0d89d]">{reading.keyword}</p></div><div className="flex items-center gap-4 rounded-2xl bg-white/7 px-5 py-4"><span className="grid size-12 place-items-center rounded-full border border-[#f0d89d]/25 font-serif text-2xl text-[#f0d89d]">{reading.element}</span><div><p className="text-xs text-[#b9d2c8]">五行气象</p><p className="mt-1 text-sm">以{reading.element}为引，宜稳中求进</p></div></div></div>
            <p className="max-w-2xl font-serif text-lg leading-9 text-[#fbf7ef]">{reading.overview}</p>
            <div className="my-8 grid grid-cols-5 gap-2">{reading.scores.map((score) => <div key={score.label} className="text-center"><div className="mx-auto mb-2 flex h-24 w-2 items-end overflow-hidden rounded-full bg-white/10"><span className="w-full rounded-full bg-gradient-to-t from-[#b98c43] to-[#efd79d] transition-all duration-700" style={{ height: `${score.value}%` }} /></div><p className="text-xs text-[#b9d2c8]">{score.label}</p><p className="mt-1 text-sm font-semibold">{score.value}</p></div>)}</div>
            <div className="rounded-2xl border border-white/10 bg-white/6 p-5"><p className="mb-2 flex items-center gap-2 text-xs tracking-[.18em] text-[#d9bd86]"><Compass className="size-4" />今日宜</p><p className="leading-7 text-[#f7f2e8]">{reading.advice}</p></div>
            <div className="mt-6 flex flex-wrap items-center justify-between gap-4"><div className="flex flex-wrap gap-2 text-xs text-[#c7d8d1]"><span className="rounded-full bg-white/7 px-3 py-2">幸运色 · {reading.luckyColor}</span><span className="rounded-full bg-white/7 px-3 py-2">幸运数 · {reading.luckyNumber}</span><span className="rounded-full bg-white/7 px-3 py-2">方位 · {reading.luckyDirection}</span></div><Button type="button" variant="outline" onClick={copyResult} className="border-white/15 bg-white/8 text-[#f7f2e8] hover:bg-white/14 hover:text-white">{copied ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}{copied ? '已复制' : '复制命笺'}</Button></div>
          </div>
        </article>
      </section>
      <footer className="relative mx-auto flex max-w-7xl flex-col gap-2 border-t border-border/70 px-5 py-6 text-xs leading-5 text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10"><p>命笺采用确定性算法生成文化娱乐内容，不构成医疗、法律、财务或人生决策建议。</p><button onClick={() => setReading(createReading(name.trim(), date || '1996-06-18', time, gender))} className="flex items-center gap-1.5 text-primary hover:underline"><RefreshCw className="size-3.5" />再看一笺</button></footer>
    </main>
  );
}
