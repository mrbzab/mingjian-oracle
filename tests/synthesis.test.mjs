import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBaZi,DEFAULT_INPUT} from '../lib/bazi.ts';
import {calculateZiwei,calculateQimen,ziweiPalaceEvidence} from '../lib/metaphysics.ts';
import {buildSynthesis} from '../lib/synthesis.ts';


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
 assert.equal(missing.missing.length,1);assert.equal(missing.data.ziwei,null);
 const z=await calculateZiwei(birth,'default','2026-07-01'),q=await calculateQimen('2026-09-05T12:00');
 const full=await buildSynthesis(birth,2026,z,q,'对照','career',true);
 assert.equal(full.missing.length,0);assert.equal(full.data.ziwei.horoscope.date,'2026-07-01');
 assert.equal(full.data.qimen.time,'2026-09-05T12:00:00');
 assert.ok(full.prompt.length<120000);
 assert.ok(full.prompt.includes('不得强行统一分歧'));
});
import { summarizeSynthesis } from '../lib/synthesis.ts';
import { resolveZiweiDate, matchingZiwei, matchingQimen } from '../lib/workspace-state.ts';

test('workspace date selection preserves explicit dates and does not silently change a requested year',()=>{
 assert.equal(resolveZiweiDate('1990-10-12',2026,null),'2026-07-01');
 assert.equal(resolveZiweiDate('1990-10-12',1990,null),'1990-10-12');
 assert.equal(resolveZiweiDate('1990-10-12',1989,null),'1989-07-01');
 assert.equal(resolveZiweiDate('1990-10-12',2026,'2026-02-01'),'2026-02-01');
 assert.equal(resolveZiweiDate('1990-10-12',2027,'2026-02-01'),'2027-07-01');
 assert.equal(resolveZiweiDate('1990-10-12',2026,''),'');
});
test('workspace excludes mismatched birth, date, school and Qimen time snapshots',async()=>{
 const birth=calculateBaZi({...DEFAULT_INPUT,gender:'male'});
 const data=await calculateZiwei(birth,'default','2026-07-01');
 const key=JSON.stringify(birth.input),snapshot={birthKey:key,data};
 assert.equal(matchingZiwei(snapshot,key,'2026-07-01','default'),data);
 assert.equal(matchingZiwei(snapshot,'changed','2026-07-01','default'),null);
 assert.equal(matchingZiwei(snapshot,key,'2026-07-02','default'),null);
 assert.equal(matchingZiwei(snapshot,key,'2026-07-01','zhongzhou'),null);
 const q=await calculateQimen('2026-09-05T12:00');
 assert.equal(matchingQimen(q,'2026-09-05T12:00'),q);
 assert.equal(matchingQimen(q,'2026-09-05T12:01'),null);
 assert.equal(matchingQimen(q,''),null);
});
test('readable summary preserves source facts and independent temporal boundaries',async()=>{
 const birth=calculateBaZi({...DEFAULT_INPUT,gender:'male'});
 const z=await calculateZiwei(birth,'default','2026-07-01');
 const q=await calculateQimen('2025-09-05T12:00');
 const summary=summarizeSynthesis(birth,2026,z,q);
 assert.deepEqual(summary.groups.map(g=>g.system),['八字','紫微','奇门']);
 assert.equal(summary.missing.length,0);
 assert.ok(summary.groups[0].period.includes('立春'));
 assert.ok(summary.groups[1].period.includes('2026-07-01'));
 assert.ok(summary.groups[2].period.includes('2025-09-05'));
 assert.ok(summary.groups[2].facts[0].includes(q.chart.zhiFu));
 assert.ok(summary.groups[1].relations.every(r=>r.startsWith('流年 ')));
 assert.ok(summary.groups.every(g=>g.relations.length<=6));
 const incomplete=summarizeSynthesis(calculateBaZi({...DEFAULT_INPUT,unknownTime:true}),2026,null,null);
 assert.equal(incomplete.groups.length,1);assert.equal(incomplete.missing.length,3);
 assert.ok(incomplete.groups[0].facts[0].includes('时柱 未知'));
 assert.ok(incomplete.groups[0].relations.every(r=>!r.includes('本命时柱')));
});
