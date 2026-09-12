import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBaZi,DEFAULT_INPUT} from '../lib/bazi.ts';
import {readArchives,saveArchive,filterArchives} from '../lib/chart-archives.ts';
import {timelineWindow} from '../lib/luck-timeline.ts';
import {buildChartReport} from '../lib/chart-report.ts';
import {calculateZiwei} from '../lib/metaphysics.ts';
const input={...DEFAULT_INPUT,gender:'male',city:'上海',name:'隐私测试姓名'};
test('legacy archives migrate without dropping birth conventions; metadata edits preserve input',()=>{
 const raw=JSON.stringify([{id:'old',input}]);const s=readArchives(null,raw);
 assert.deepEqual(s.items[0].input,input);assert.equal(s.items[0].group,'历史记录');
 const edited=saveArchive(s,{...s.items[0],title:'工作案例',group:'研究',note:'复核出生时间'});
 assert.equal(edited.items.length,1);assert.deepEqual(edited.items[0].input,input);
 assert.equal(filterArchives(edited.items,'出生','研究').length,1);
 assert.equal(filterArchives(edited.items,'出生','家人').length,0);
 assert.deepEqual(readArchives(JSON.stringify(edited),null),edited);
 assert.throws(()=>readArchives('{broken',raw));
 assert.throws(()=>readArchives(JSON.stringify({version:3,items:[]}),raw));
 assert.throws(()=>readArchives(null,JSON.stringify([{id:'old',input},{id:'old',input}])));
});
test('timeline clamps both ends and partitions handover year without gaps',()=>{
 const r=calculateBaZi(input);
 assert.equal(timelineWindow(r,1901)[0].year,1901);
 assert.equal(timelineWindow(r,2199).at(-1).year,2199);
 const y=timelineWindow(r,2032).find(v=>v.year===2032);
 assert.equal(y.handover,true);assert.equal(y.segments[0].start,y.start);
 assert.equal(y.segments.at(-1).end,y.end);
 for(let i=1;i<y.segments.length;i++)assert.equal(y.segments[i-1].end,y.segments[i].start);
});
test('private report excludes raw birth identifiers even with detailed Ziwei; missing time remains unknown',async()=>{
 const r=calculateBaZi(input);const z=await calculateZiwei(r,'default','2032-07-01');
 const opts={birth:false,details:true,ziwei:true,qimen:true};
 const report=buildChartReport(r,2032,z,null,opts);const text=JSON.stringify(report);
 for(const secret of [input.name,r.date,input.city])assert.ok(!text.includes(secret),secret);
 assert.ok(!report.sections.some(s=>s.title==='出生资料'));assert.ok(text.includes('2032-07-01'));assert.ok(text.includes('没有有效的独立起局'));
 const full=JSON.stringify(buildChartReport(r,2032,z,null,{...opts,birth:true}));
 for(const secret of [input.name,r.date,input.city])assert.ok(full.includes(secret));
 const unknown=buildChartReport(calculateBaZi({...input,unknownTime:true}),2032,null,null,opts);
 assert.equal(unknown.pillars[3].value,'未知');
});

test('backup merge skips repeats, preserves conflicting records and rejects capacity overflow atomically',async()=>{
 const {mergeArchives}=await import('../lib/chart-archives.ts');
 const current=readArchives(null,JSON.stringify([{id:'a',input}]));
 assert.equal(mergeArchives(current,current).added,0);
 const changed={version:2,items:[{...current.items[0],note:'different'}]};
 const merged=mergeArchives(current,changed,()=> 'b');
 assert.equal(merged.conflicts,1);assert.equal(merged.store.items.length,2);
 assert.equal(merged.store.items.find(v=>v.id==='a').note,'');
 assert.equal(mergeArchives(merged.store,changed).added,0);
 const full={version:2,items:Array.from({length:500},(_,i)=>({...current.items[0],id:String(i),note:String(i)}))};
 assert.throws(()=>mergeArchives(full,changed),/500/);
 assert.equal(full.items.length,500);
});
