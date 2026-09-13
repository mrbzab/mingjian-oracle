'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {TopicReading} from '@/components/topic-reading';
import type {Topic} from '@/lib/topic-reading';
import { summarizeSynthesis } from '@/lib/synthesis';
import type { BaZiResult } from '@/lib/bazi';
import type { ZiweiResult,QimenResult } from '@/lib/metaphysics';
export function SynthesisPanel({result,year,ziwei,qimen,refreshToken=0}:{result:BaZiResult;year:number;ziwei:ZiweiResult|null;qimen:QimenResult|null;refreshToken?:number}) {
 const [topic,setTopic]=useState<Topic>('career'),[includeQimen,setIncludeQimen]=useState(false);
 const [question,setQuestion]=useState(''),[prompt,setPrompt]=useState(''),[snapshot,setSnapshot]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const summary=useMemo(()=>summarizeSynthesis(result,year,ziwei,qimen),[result,year,ziwei,qimen]);
 const key=JSON.stringify({input:result.input,year,ziwei,qimen,question,topic,includeQimen}),stale=!!prompt&&snapshot!==key;
 const generation=useRef(0);
 useEffect(()=>{generation.current++;return()=>{generation.current++;};},[key]);
 async function generate(){const request=++generation.current;setBusy(true);setError('');try{const {buildSynthesis}=await import('@/lib/synthesis');const next=await buildSynthesis(result,year,ziwei,qimen,question,topic,includeQimen);if(request!==generation.current)return;setPrompt(next.prompt);setSnapshot(key);setNotice('完整综合资料已生成。');}catch(e){if(request===generation.current)setError(e instanceof Error?e.message:'生成失败。');}finally{setBusy(false);}}
 useEffect(()=>{if(refreshToken)void generate();},[refreshToken]);
 async function copy(){try{await navigator.clipboard.writeText(prompt);setNotice('综合提示词已复制。');}catch{setNotice('请在下方文本框中全选并复制。');}}
 return <section className="panel space-y-6"><TopicReading result={result} year={year} ziwei={ziwei} qimen={qimen} topic={topic} onTopic={setTopic} question={question} includeQimen={includeQimen} onQimen={setIncludeQimen}/><details className="border-t pt-4"><summary className="cursor-pointer font-medium">查看各体系原始摘要</summary><div><h3 className="section-title">综合解读摘要</h3><p className="leading-7 text-muted-foreground">根据当前有效命盘整理，摘要随资料同步；各体系的来源和时间范围分别列出。</p></div>
 {summary.missing.length>0&&<div className="rounded-xl border border-primary/30 p-4"><h4 className="font-medium">待补充资料</h4><ul className="mt-2 list-disc space-y-2 pl-5 leading-7">{summary.missing.map(m=><li key={m}>{m}</li>)}</ul></div>}
 <div className="space-y-4">{summary.groups.map(g=><article key={g.system} className="summary-source"><h4 className="font-serif text-xl">{g.system}</h4><p className="my-3 text-sm leading-7 text-muted-foreground">{g.period.replaceAll('T',' ')}</p><ul className="space-y-2 leading-7">{g.facts.map(f=><li key={f}>{f}</li>)}</ul><details className="mt-4 border-t pt-3"><summary className="cursor-pointer leading-7">盘面关系 · {g.total} 条{g.total>6?'（先展示六条）':''}</summary><ul className="mt-3 space-y-3 leading-7">{g.relations.map((r,i)=><li key={i} className="rounded-lg bg-muted p-3">{r}</li>)}</ul>{!g.total&&<p className="mt-3 leading-7">当前资料未检出所列关系，不表示没有其他因素。</p>}</details></article>)}</div>

 </details><div className="space-y-3 border-t pt-5"><Label htmlFor="synthesis-question">希望进一步了解的问题（选填）</Label><Textarea id="synthesis-question" value={question} maxLength={2000} onChange={e=>setQuestion(e.target.value)}/><Button disabled={busy} onClick={generate}>{busy?'正在整理…':'生成完整解读材料'}</Button><p className="text-sm leading-6 text-muted-foreground">可编辑、复制到你选择的工具。本站不调用 AI。</p></div>
 {stale&&<p role="status" className="text-sm text-primary">资料或问题已改变，请重新生成完整材料后再复制；上方摘要已同步。</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 {prompt&&<details className="rounded-xl border p-4"><summary className="cursor-pointer font-medium">查看、编辑完整材料</summary><div className="mt-4 space-y-3"><Label htmlFor="synthesis-prompt">综合提示词</Label><Textarea id="synthesis-prompt" value={prompt} onChange={e=>setPrompt(e.target.value)} className="min-h-80 text-sm leading-6"/><Button variant="outline" onClick={copy} disabled={stale||busy}>复制综合提示词</Button></div></details>}{notice&&<p role="status" className="text-sm">{notice}</p>}
 </section>;
}
