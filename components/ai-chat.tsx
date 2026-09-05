'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
type Message = { role:'user'|'assistant'; content:string };
export function AiChat({ context, disabled }: { context:string; disabled:boolean }) {
  const [provider,setProvider]=useState('deepseek'), [apiKey,setKey]=useState(''), [model,setModel]=useState('');
  const [history,setHistory]=useState<{context:string;messages:Message[]}>({context:'',messages:[]});
  const [question,setQuestion]=useState(''), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const controller=useRef<AbortController | null>(null);
  const messages=history.context===context ? history.messages : [];
  useEffect(() => () => controller.current?.abort(), [context]);
  async function send(text=question) {
    if (busy || disabled || !text.trim()) return;
    const next:Message[]=[...messages,{role:'user',content:text.trim()}];
    setBusy(true);setError('');const abort=new AbortController();controller.current=abort;
    try { const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json'},signal:abort.signal,body:JSON.stringify({provider,apiKey,model,context,messages:next})});const data=await response.json() as {error?:string;answer:string;truncated?:boolean};if(!response.ok)throw Error(data.error || '请求未完成。');setHistory({context,messages:[...next,{role:'assistant',content:data.answer+(data.truncated?'\n\n（回答达到长度限制，可继续追问。）':'')}]});setQuestion(''); }
    catch(e){setError(e instanceof Error && e.name==='AbortError'?'已停止本次回答。':e instanceof Error?e.message:'请求未完成。');}
    finally{setBusy(false);controller.current=null;}
  }
  return <section className="space-y-4 border-t pt-6"><h4 className="text-lg font-medium">站内 AI 追问</h4><details className="rounded-xl border p-4" open={!apiKey || !model}><summary className="cursor-pointer font-medium">连接你的 AI 服务</summary><div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="ai-provider">服务商</Label><NativeSelect id="ai-provider" value={provider} disabled={busy} onChange={(e)=>{setProvider(e.target.value);setModel('');setKey('');}}><NativeSelectOption value="deepseek">DeepSeek</NativeSelectOption><NativeSelectOption value="openai">OpenAI</NativeSelectOption></NativeSelect></div><div className="space-y-2"><Label htmlFor="ai-model">模型 ID</Label><Input id="ai-model" value={model} disabled={busy} onChange={(e)=>setModel(e.target.value)} placeholder="填写服务商支持的模型名称" /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="ai-key">API 密钥</Label><Input id="ai-key" type="password" autoComplete="off" value={apiKey} disabled={busy} onChange={(e)=>setKey(e.target.value)} /><p className="text-sm leading-6 text-muted-foreground">密钥只留在当前页面会话中，可随时清除。发送时，命盘、对话和密钥经本站转发到所选服务商，本站不保存；费用由你的服务商账户承担。</p><Button variant="ghost" disabled={busy} onClick={()=>setKey('')}>清除密钥</Button></div></div></details>
    <div className="space-y-3" aria-live="polite">{messages.map((m,i)=><div key={i} className={`rounded-xl p-4 ${m.role==='user'?'bg-muted':'border'}`}><p className="mb-2 text-sm text-muted-foreground">{m.role==='user'?'你':'AI 解读'}</p><p className="whitespace-pre-wrap break-words leading-8">{m.content}</p></div>)}</div>
    <div className="flex flex-wrap gap-2">{['请先综合解读，列出各体系的相同主题与分歧。','这条判断依据是什么？有哪些相反因素？','哪些资料不足，需要进一步核对？'].map((text)=><Button key={text} variant="outline" className="h-auto whitespace-normal text-left" disabled={busy||disabled||!apiKey||!model||messages.length>=20} onClick={()=>send(text)}>{text}</Button>)}</div>
    <Label htmlFor="ai-question">继续追问</Label><Textarea id="ai-question" value={question} maxLength={4000} onChange={(e)=>setQuestion(e.target.value)} placeholder="例如：请比较八字与紫微对同一问题的不同依据" /><div className="flex flex-wrap gap-3"><Button onClick={()=>send()} disabled={busy||disabled||!apiKey||!model||!question.trim()||messages.length>=20}>{busy?'正在回答…':'发送追问'}</Button>{busy&&<Button variant="outline" onClick={()=>controller.current?.abort()}>停止</Button>}<Button variant="ghost" disabled={busy} onClick={()=>{setHistory({context,messages:[]});setError('');}}>清空对话</Button></div>{messages.length>=20&&<p className="text-sm">已达十轮，请清空对话后继续。</p>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<p className="text-sm text-muted-foreground">对话在刷新后清空。更换综合资料后开启新对话，避免旧命盘混入。</p>
  </section>;
}

