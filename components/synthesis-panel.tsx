'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

import type { BaZiResult } from '@/lib/bazi';
import type { ZiweiResult,QimenResult } from '@/lib/metaphysics';
export function SynthesisPanel({result,year,ziwei,qimen}:{result:BaZiResult;year:number;ziwei:ZiweiResult|null;qimen:QimenResult|null}) {
  const [question,setQuestion]=useState(''),[prompt,setPrompt]=useState(''),[snapshot,setSnapshot]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const key=JSON.stringify({input:result.input,year,ziwei,qimen,question});const stale=!!prompt&&snapshot!==key;
  async function generate(){setBusy(true);setError('');try{const {buildSynthesis}=await import('@/lib/synthesis');const next=await buildSynthesis(result,year,ziwei,qimen,question);setPrompt(next.prompt);setSnapshot(key);setNotice('综合资料已生成。');}catch(e){setError(e instanceof Error?e.message:'生成失败。');}finally{setBusy(false);}}
  async function copy(){try{await navigator.clipboard.writeText(prompt);setNotice('综合提示词已复制。');}catch{setNotice('请在下方文本框中全选并复制。');}}
  return <section className="panel space-y-6"><div><h3 className="section-title">综合解读</h3><p className="text-sm leading-7 text-muted-foreground">分别引用各体系的资料，保留分歧；相似说法不代表互相验证。</p></div><div className="grid gap-3 sm:grid-cols-3">{[{name:'八字',detail:`当前命盘 · ${year}流年`},{name:'紫微',detail:ziwei?`${ziwei.horoscope?.date ?? '本命'} · 已生成`:'尚无当前资料与年份的命盘'},{name:'奇门',detail:qimen?`${qimen.time.replace('T',' ')} · 独立起局`:'尚未起局或时间已修改'}].map((s)=><div key={s.name} className="rounded-xl border p-4"><p className="font-medium">{s.name}</p><p className="mt-2 text-sm leading-6 text-muted-foreground">{s.detail}</p></div>)}</div><p className="text-sm leading-6 text-muted-foreground">缺失体系将明确标注。先去对应入口生成结果再回来，不会自动起一个奇门盘。八字与紫微使用所选年份，但换年口径不同。</p><Label htmlFor="synthesis-question">本次希望综合了解的问题</Label><Textarea id="synthesis-question" value={question} maxLength={2000} onChange={(e)=>setQuestion(e.target.value)} /><Button disabled={busy} onClick={generate}>{busy?'正在整理…':'生成综合资料'}</Button>{stale&&<p role="status" className="text-sm text-primary">资料或问题已改变，请重新生成，旧提示词暂不能复制。</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}{prompt&&<><details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">查看、编辑综合解读资料</summary><div className="mt-4 space-y-3"><Label htmlFor="synthesis-prompt">综合提示词</Label><Textarea id="synthesis-prompt" value={prompt} onChange={(e)=>setPrompt(e.target.value)} className="min-h-80 text-sm leading-6" /><Button variant="outline" onClick={copy} disabled={stale}>复制综合提示词</Button></div></details></>}{notice&&<p role="status" className="text-sm">{notice}</p>}</section>;
}
