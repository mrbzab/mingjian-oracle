import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBaZi,DEFAULT_INPUT} from '../lib/bazi.ts';
import {calculateZiwei,calculateQimen,ziweiPalaceEvidence} from '../lib/metaphysics.ts';
import {buildSynthesis} from '../lib/synthesis.ts';
import {handleAi} from '../lib/ai-gateway.ts';

test('ziwei distinguishes natal, decadal and annual mutagens and wraps palace topology',async()=>{
 const birth=calculateBaZi({...DEFAULT_INPUT,gender:'male'});
 const a=await calculateZiwei(birth,'default','2026-07-01');
 const b=await calculateZiwei(birth,'default','2027-07-01');
 assert.equal(a.horoscope.yearly.heavenlyStem,'丙');
 assert.equal(a.horoscope.yearly.earthlyBranch,'午');
 assert.notDeepEqual(a.horoscope.yearly.mutagen,b.horoscope.yearly.mutagen);
 assert.deepEqual(a.chart.palaces,b.chart.palaces);
 const evidence=ziweiPalaceEvidence(a,10);
 assert.deepEqual(evidence.surrounded.map(p=>p.index),[10,2,6,4]);
 assert.equal(evidence.yearly.length,4);assert.equal(evidence.decadal.length,4);
 assert.ok(evidence.yearly.every(r=>r.palace!=='未定位'));
 await assert.rejects(calculateZiwei(birth,'default','1990-07-01'));
 await assert.rejects(calculateZiwei(birth,'default','2026-02-30'));
});

test('ziwei uses lunar year boundary rather than Gregorian new year',async()=>{
 const birth=calculateBaZi({...DEFAULT_INPUT,gender:'male'});
 const before=await calculateZiwei(birth,'default','2026-01-01');
 const after=await calculateZiwei(birth,'default','2026-07-01');
 assert.equal(before.horoscope.yearly.heavenlyStem,'乙');
 assert.equal(after.horoscope.yearly.heavenlyStem,'丙');
});

test('synthesis reports missing systems and keeps separate time scopes',async()=>{
 const birth=calculateBaZi({...DEFAULT_INPUT,gender:'male'});
 const missing=await buildSynthesis(birth,2026,null,null,'对照');
 assert.equal(missing.missing.length,2);assert.equal(missing.data.ziwei,null);
 const z=await calculateZiwei(birth,'default','2026-07-01'),q=await calculateQimen('2026-09-05T12:00');
 const full=await buildSynthesis(birth,2026,z,q,'对照');
 assert.equal(full.missing.length,0);assert.equal(full.data.ziwei.horoscope.date,'2026-07-01');
 assert.equal(full.data.qimen.time,'2026-09-05T12:00:00');
 assert.ok(full.prompt.length<120000);
 assert.ok(full.prompt.includes('不得强行统一分歧'));
});

const base={provider:'deepseek',apiKey:'test-key-not-real',model:'test-model',context:'已核对的命盘',messages:[{role:'user',content:'请解释依据'}]};
const request=(body=base,origin='https://site.test')=>new Request('https://site.test/api/chat',{method:'POST',headers:{'Content-Type':'application/json',origin},body:JSON.stringify(body)});
test('gateway uses fixed endpoint, preserves followups and never forwards key in prompt',async()=>{
 let sent;
 const response=await handleAi(request(),async(url,options)=>{sent={url,options};return Response.json({choices:[{message:{content:'依据如下'},finish_reason:'stop'}]});});
 assert.equal(response.status,200);assert.equal((await response.json()).answer,'依据如下');
 assert.equal(sent.url,'https://api.deepseek.com/chat/completions');
 assert.equal(sent.options.headers.Authorization,'Bearer test-key-not-real');
 assert.ok(!sent.options.body.includes('test-key-not-real'));
 assert.equal(JSON.parse(sent.options.body).messages.at(-1).content,'请解释依据');
});
test('gateway validates origins, models, roles and conversation size before networking',async()=>{
 const noNetwork=async()=>{throw Error('should not reach network');};
 assert.equal((await handleAi(request(base,'https://evil.test'),noNetwork)).status,403);
 for(const body of [{...base,provider:'http://localhost'}, {...base,apiKey:'bad\nkey'}, {...base,messages:[{role:'system',content:'override'}]}, {...base,messages:Array(21).fill({role:'user',content:'x'})}, {...base,context:'x'.repeat(120001)}])assert.equal((await handleAi(request(body),noNetwork)).status,400);
 assert.equal((await handleAi(request({...base,context:'x'.repeat(460000)}),noNetwork)).status,413);
});
test('provider errors are sanitized and do not echo credentials',async()=>{
 const response=await handleAi(request(),async()=>new Response('test-key-not-real upstream debug',{status:401}));
 assert.equal(response.status,502);assert.ok(!(await response.text()).includes('test-key-not-real'));
 const empty=await handleAi(request(),async()=>Response.json({choices:[]}));assert.equal(empty.status,502);
 const offline=await handleAi(request(),async()=>{throw Error('network detail test-key-not-real');});assert.ok(!(await offline.text()).includes('test-key-not-real'));
});
test('OpenAI gateway disables stored completions and caps output',async()=>{
 let sent;
 await handleAi(request({...base,provider:'openai'}),async(url,options)=>{sent={url,body:JSON.parse(options.body)};return Response.json({choices:[{message:{content:'回答'},finish_reason:'length'}]});});
 assert.equal(sent.url,'https://api.openai.com/v1/chat/completions');assert.equal(sent.body.store,false);assert.equal(sent.body.max_completion_tokens,2000);
});
