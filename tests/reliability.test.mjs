import test from 'node:test';
import assert from 'node:assert/strict';
import {calculateBaZi,DEFAULT_INPUT} from '../lib/bazi.ts';
import {calculateZiwei} from '../lib/metaphysics.ts';
import {readArchives,filterArchives,mergeArchives} from '../lib/chart-archives.ts';
import {buildChartReport} from '../lib/chart-report.ts';
import {chartImageLayout} from '../lib/chart-image.ts';
const input={...DEFAULT_INPUT,gender:'male',time:'23:30:00'};

test('parallel Ziwei schools match isolated chart and horoscope results; rejection releases queue',async()=>{
 const birth=calculateBaZi(input);
 const specs=[['default','2030-07-01'],['zhongzhou','2030-07-01'],['default','2032-07-01'],['zhongzhou','2032-07-01']];
 const expected=[];for(const [school,date] of specs)expected.push(JSON.stringify(await calculateZiwei(birth,school,date)));
 const actual=await Promise.all(specs.map(([school,date])=>calculateZiwei(birth,school,date)));
 actual.forEach((value,i)=>assert.equal(JSON.stringify(value),expected[i]));
 await assert.rejects(calculateZiwei(birth,'default','invalid'));
 assert.equal(JSON.stringify(await calculateZiwei(birth,...specs[0])),expected[0]);
});

test('archive backup identity ignores object property order and date search accepts common formats',()=>{
 const current=readArchives(null,JSON.stringify([{id:'a',input}]));
 const reverse=value=>value&&typeof value==='object'?Object.fromEntries(Object.entries(value).reverse().map(([k,v])=>[k,reverse(v)])):value;
 const incoming={version:2,items:[reverse(current.items[0])]};
 assert.equal(mergeArchives(current,incoming).added,0);
 for(const query of ['1996-06-18','1996/6/18','1996年6月18日'])assert.equal(filterArchives(current.items,query,'').length,1,query);
 for(const bad of [2026,null,{},[]])assert.throws(()=>readArchives(JSON.stringify({version:2,items:[{...current.items[0],updatedAt:bad}]}),null));
});

test('long image content grows canvas and keeps pillar details and footer separated',()=>{
 const report=buildChartReport(calculateBaZi({...input,name:'长'.repeat(30),city:'地'.repeat(60)}),2032,null,null,{birth:true,details:true,ziwei:false,qimen:false});
 report.sections.find(s=>s.title==='计算口径').lines[0]+='规则'.repeat(100);
 const layout=chartImageLayout(report,(text,size)=>[...text].length*size);
 assert.ok(layout.height>1100);
 for(const line of layout.lines)assert.ok(line.y<layout.height-20);
 const footer=layout.lines.at(-2);assert.ok(footer.y>Math.max(...layout.lines.slice(0,-2).map(v=>v.y))+25);
 const details=layout.lines.filter(v=>v.x===95&&v.size===21);assert.ok(details.every(v=>v.y<layout.cardTop+layout.cardHeight));
});

test('Ziwei report preserves natal, decadal and yearly transformations separately',async()=>{
 const birth=calculateBaZi(input);const ziwei=await calculateZiwei(birth,'default','2032-07-01');
 const report=buildChartReport(birth,2032,ziwei,null,{birth:false,details:true,ziwei:true,qimen:false});
 const lines=report.sections.find(s=>s.title==='紫微斗数').lines;
 for(const layer of ['本命','大限','流年'])assert.equal(lines.filter(line=>line.startsWith(layer+' ')&&line.includes(' → ')).length,4,layer);
});


test('undo merge never overwrites an archive reintroduced with newer content in another tab',()=>{
 const removed=readArchives(null,JSON.stringify([{id:'restore-id',input}])).items[0];
 const current={version:2,items:[{...removed,note:'newer edit'}]};
 const restored=mergeArchives(current,{version:2,items:[removed]},()=> 'restored-copy');
 assert.equal(restored.conflicts,1);
 assert.equal(restored.store.items.find(item=>item.id==='restore-id').note,'newer edit');
 assert.equal(restored.store.items.find(item=>item.id==='restored-copy').note,removed.note);
});
