import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBaZi,DEFAULT_INPUT} from '../lib/bazi.ts';
import {calculateQimen,calculateZiwei} from '../lib/metaphysics.ts';
import {buildYearContext} from '../lib/bazi-year-context.ts';
import {compareBirthTimes} from '../lib/time-comparison.ts';
import {buildTopicReading} from '../lib/topic-reading.ts';
const input={...DEFAULT_INPUT,gender:'male',timezone:'+08:00'};
test('invalid leap seconds are rejected rather than silently clamped',async()=>{
 assert.throws(()=>calculateBaZi({...input,time:'12:30:60'}));
 await assert.rejects(calculateQimen('2026-09-13T12:30:60'));
 assert.throws(()=>calculateBaZi(null),/资料格式/);
});
test('birth-year relations begin at birth and keep gap-free annual coverage',()=>{
 const r=calculateBaZi(input),c=buildYearContext(r,1996);
 assert.equal(c.segments[0].beforeBirth,true);assert.deepEqual(c.segments[0].relations,[]);
 assert.equal(c.segments[0].end,r.beijing);
 assert.equal(c.segments[1].start,r.beijing);assert.equal(c.segments[1].beforeBirth,false);
 assert.ok(buildYearContext(r,1995).segments.every(s=>s.beforeBirth&&!s.relations.length));
});
test('time comparison preserves original input and detects late Zi day boundary by school',async()=>{
 const base={...input,year:1988,month:2,day:15,daySect:1};const original=JSON.stringify(base);
 const c=await compareBirthTimes(base,'22:59:59','23:00:00','2026-07-01');
 assert.equal(c.rows.find(r=>r.label==='日柱').changed,true);assert.equal(c.rows.find(r=>r.label==='年柱').changed,false);
 assert.equal(c.candidates[0].ziwei.input.timeIndex,11);assert.equal(c.candidates[1].ziwei.input.timeIndex,12);
 assert.equal(JSON.stringify(base),original);assert.ok(c.palaceRows.length>=12);
 const d=await compareBirthTimes({...base,daySect:2},'22:59:59','23:00:00','2026-07-01');
 assert.equal(d.rows.find(r=>r.label==='日柱').changed,false);
 const same=await compareBirthTimes(input,'12:00:00','12:00:00','2026-07-01');
 assert.ok([...same.rows,...same.palaceRows].every(r=>!r.changed));
});
test('topic sources preserve separate four-transformation scopes and require an explicit Qimen question',async()=>{
 const r=calculateBaZi(input),z=await calculateZiwei(r,'default','2032-07-01'),q=await calculateQimen('2026-09-13T12:00:00');
 const c=buildTopicReading(r,2032,z,q,'career');assert.equal(c.qimen,null);
 assert.ok(c.palaces.some(p=>p.name.startsWith('官禄')));assert.equal(c.ziweiDate,'2032-07-01');
 assert.ok(c.bazi.every(e=>e.source.includes('柱')));
 assert.equal(buildTopicReading(r,2032,z,q,'career','',true).qimen,null);
 assert.equal(buildTopicReading(r,2032,z,q,'career','项目如何推进',true).qimen.time,q.time);
 const unknown=buildTopicReading(calculateBaZi({...input,unknownTime:true}),2032,null,null,'relationship');
 assert.ok(unknown.bazi.every(e=>!e.source.startsWith('时柱')));assert.equal(unknown.palaces.length,0);
});

test('birth-year private export redacts the new birth-boundary cut',async()=>{
 const {buildChartReport}=await import('../lib/chart-report.ts');
 const r=calculateBaZi(input);
 const report=buildChartReport(r,1996,null,null,{birth:false,details:true,ziwei:false,qimen:false});
 assert.ok(!JSON.stringify(report).includes(r.date));
 assert.ok(JSON.stringify(report).includes('出生日期已隐藏'));
});
