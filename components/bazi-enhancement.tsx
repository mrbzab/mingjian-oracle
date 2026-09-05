'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '@/components/ui/table';
import { formatReport, type BaZiResult } from '@/lib/bazi';
import type { BaZiEnhancement } from '@/lib/bazi-enhancement';

export function BaziEnhancement({ result }: { result: BaZiResult }) {
  const [analysis, setAnalysis] = useState<BaZiEnhancement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [question, setQuestion] = useState('');
  const [prompt, setPrompt] = useState('');
  const [notice, setNotice] = useState('');
  const complete = !result.input.unknownTime && result.pillars.every((p) => p.length === 1);

  async function generate() {
    setBusy(true); setError(''); setNotice('');
    try {
      const engine = await import('@/lib/bazi-enhancement');
      const next = engine.enhanceBaZi(result);
      setAnalysis(next);
      setPrompt(engine.buildInterpretationPrompt(formatReport(result), next, question));
    } catch (e) { setError(e instanceof Error ? e.message : '增强分析暂时无法生成，请重试。'); }
    finally { setBusy(false); }
  }

  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setNotice('提示词已复制，可粘贴到你使用的 AI 中。'); }
    catch { setNotice('复制未成功，请在下方文本框中全选并手动复制。'); }
  }

  return <section className="panel space-y-6" aria-busy={busy}>
    <div><h3 className="section-title">八字增强与 AI 解读</h3>
      <p className="text-sm leading-6 text-muted-foreground">使用当前四柱，补充身强弱、格局、用神与十神结构。分析在本机完成；提示词可交给你选择的 AI 解读。</p></div>
    {!complete && <p className="rounded-xl bg-primary/5 p-4 text-sm leading-6">出生时刻未知或四柱尚未确定。请先补充出生资料，现有候选命盘仍可查看。</p>}
    <div className="space-y-2"><Label htmlFor="analysis-question">想了解的问题（选填）</Label><Textarea id="analysis-question" value={question} maxLength={2000} onChange={(e) => setQuestion(e.target.value)} placeholder="例如：十神结构如何理解？身强弱判断依据是什么？" /></div>
    <Button disabled={!complete || busy} onClick={generate}>{busy ? '正在生成…' : analysis ? '重新生成分析与提示词' : '生成分析与提示词'}</Button>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {analysis && <>
      <p className="text-sm leading-6 text-muted-foreground">以下为传统规则判断，采用知己八字的算法口径；不同流派可能得出不同结果。</p>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-4"><h4 className="text-sm text-muted-foreground">日主强弱</h4><p className="my-2 text-xl font-medium">{analysis.strength.label}</p><p className="text-sm leading-6">得令：{analysis.strength.deLing ? '是' : '否'} · 得地：{analysis.strength.deDi ? '是' : '否'} · 得势：{analysis.strength.deShi ? '是' : '否'}</p></div>
        <div className="rounded-xl border p-4"><h4 className="text-sm text-muted-foreground">格局</h4><p className="my-2 text-xl font-medium">{analysis.pattern.label}</p><p className="text-sm leading-6">{analysis.pattern.state}</p></div>
        <div className="rounded-xl border p-4"><h4 className="text-sm text-muted-foreground">用神与喜忌</h4><p className="my-2 text-xl font-medium">用 {analysis.useful.yong} · 喜 {analysis.useful.xi}</p><p className="text-sm leading-6">忌 {analysis.useful.ji} · {analysis.useful.method}</p></div>
      </div>
      <details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">查看判断依据</summary><div className="mt-4 space-y-4 text-sm leading-7"><p>{analysis.strength.description}</p><p>{analysis.pattern.description}</p><p>{analysis.useful.reasoning}</p></div></details>
      <div><h4 className="mb-3 font-medium">命语 · 十神结构</h4><p className="mb-3 text-sm leading-6 text-muted-foreground">统计四个天干（含日干作为比肩）及全部藏干的出现次数，不作强弱加权。</p>
        <Table><TableHeader><TableRow><TableHead>十神</TableHead><TableHead>天干</TableHead><TableHead>藏干</TableHead><TableHead>状态</TableHead></TableRow></TableHeader><TableBody>{analysis.structure.distributions.map((item) => <TableRow key={item.tenGod}><TableCell>{item.tenGod}</TableCell><TableCell>{item.visibleCount}</TableCell><TableCell>{item.hiddenCount}</TableCell><TableCell>{item.status}</TableCell></TableRow>)}</TableBody></Table>
      </div>
      <div className="space-y-3"><h4 className="font-medium">十神生克链条</h4>{analysis.flow.items.length ? analysis.flow.items.map((item) => <div key={item.name} className="rounded-xl bg-primary/5 p-4"><p className="font-medium">{item.name}</p><p className="mt-2 text-sm leading-6">{item.description}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.caution}</p></div>) : <p className="text-sm">当前未识别到该规则覆盖的链条。</p>}</div>
      <div className="space-y-3"><Label htmlFor="analysis-prompt">AI 解读提示词（可编辑）</Label><p className="text-sm leading-6 text-muted-foreground">这是解读材料，尚未调用 AI。含当前出生资料；复制前可删除不想分享的信息。修改上方问题后，点击重新生成。</p><Textarea id="analysis-prompt" value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-80 text-sm leading-6" /><Button variant="outline" onClick={copy} disabled={!prompt.trim()}>复制提示词</Button></div>
    </>}
    {notice && <p role="status" className="text-sm leading-6">{notice}</p>}
    <p className="text-sm leading-6 text-muted-foreground">算法来源：<a className="underline" href="https://github.com/Brhiza/mingyu" target="_blank" rel="noreferrer">命语 · MIT</a>、<a className="underline" href="https://github.com/AmsonntagChow/zhiji-bazi" target="_blank" rel="noreferrer">知己八字 · Apache-2.0</a>。</p>
  </section>;
}
