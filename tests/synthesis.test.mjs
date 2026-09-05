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
 assert.equal(missing.missing.length,2);assert.equal(missing.data.ziwei,null);
 const z=await calculateZiwei(birth,'default','2026-07-01'),q=await calculateQimen('2026-09-05T12:00');
 const full=await buildSynthesis(birth,2026,z,q,'对照');
 assert.equal(full.missing.length,0);assert.equal(full.data.ziwei.horoscope.date,'2026-07-01');
 assert.equal(full.data.qimen.time,'2026-09-05T12:00:00');
 assert.ok(full.prompt.length<120000);
 assert.ok(full.prompt.includes('不得强行统一分歧'));
});
