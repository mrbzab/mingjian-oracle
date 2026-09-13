import {calculateBaZi,type BirthInput,type BaZiResult} from './bazi.ts';
import {calculateZiwei,type ZiweiResult} from './metaphysics.ts';
export type ComparisonCandidate={birth:BaZiResult;ziwei:ZiweiResult|null;ziweiStatus:string};
export type ComparisonRow={label:string;a:string;b:string;changed:boolean};
const row=(label:string,a:string,b:string):ComparisonRow=>({label,a,b,changed:a!==b});
export async function compareBirthTimes(input:BirthInput,timeA:string,timeB:string,targetDate:string,algorithm:'default'|'zhongzhou'='default'){
 const births=[calculateBaZi({...input,time:timeA,unknownTime:false}),calculateBaZi({...input,time:timeB,unknownTime:false})];
 const candidates:ComparisonCandidate[]=[];
 // Keep global upstream school configuration isolated by finishing each calculation in order.
 for(const birth of births){let ziwei:ZiweiResult|null=null,ziweiStatus='已计算';try{ziwei=await calculateZiwei(birth,algorithm,targetDate);}catch(e){ziweiStatus=e instanceof Error?e.message:'紫微未生成';}candidates.push({birth,ziwei,ziweiStatus});}
 const [a,b]=candidates;
 const rows=[...['年柱','月柱','日柱','时柱'].map((label,i)=>row(label,a.birth.pillars[i].map(p=>p.value).join('/'),b.birth.pillars[i].map(p=>p.value).join('/'))),row('日主',a.birth.master??'未提供',b.birth.master??'未提供'),row('校正后时刻',a.birth.clockDate??'未提供',b.birth.clockDate??'未提供'),row('起运方向',a.birth.luck?(a.birth.luck.forward?'顺行':'逆行'):'未提供性别口径',b.birth.luck?(b.birth.luck.forward?'顺行':'逆行'):'未提供性别口径'),row('起运时刻',a.birth.luck?.start??'未生成',b.birth.luck?.start??'未生成')];
 const palaceRows:ComparisonRow[]=[];
 if(a.ziwei&&b.ziwei){
  const describe=(z:ZiweiResult,name:string)=>{const p=z.chart.palaces.find(p=>p.name===name);return p?p.heavenlyStem+p.earthlyBranch+' · '+[...p.majorStars,...p.minorStars].map(s=>s.name+(s.mutagen?'化'+s.mutagen:'')).join('、'):'未提供';};
  for(const p of a.ziwei.chart.palaces)palaceRows.push(row(p.name,describe(a.ziwei,p.name),describe(b.ziwei,p.name)));
  const scope=(z:ZiweiResult,key:'decadal'|'yearly')=>{const s=z.horoscope?.[key];return s?s.heavenlyStem+s.earthlyBranch+' · '+s.mutagen.map((name,i)=>{const p=z.chart.palaces.find(p=>[...p.majorStars,...p.minorStars].some(star=>star.name===name));return name+'化'+['禄','权','科','忌'][i]+' → '+(p?'本命'+p.name+' '+p.earthlyBranch+' / '+s.name+s.palaceNames[p.index]:'未定位');}).join('、'):'未生成';};
  palaceRows.push(row('所选日期大限',scope(a.ziwei,'decadal'),scope(b.ziwei,'decadal')),row('所选日期流年',scope(a.ziwei,'yearly'),scope(b.ziwei,'yearly')));
 }
 return {candidates,rows,palaceRows,targetDate,algorithm,changedPillars:rows.slice(0,4).filter(r=>r.changed).length};
}
export type TimeComparison=Awaited<ReturnType<typeof compareBirthTimes>>;
export function comparisonText(data:TimeComparison){return ['命笺 · 双时辰对照',`出生日期：${data.candidates[0].birth.date}；紫微运限日期：${data.targetDate}`,`候选 A：${data.candidates[0].birth.input.time}；候选 B：${data.candidates[1].birth.input.time}`,...[...data.rows,...data.palaceRows].map(r=>`${r.label}【${r.changed?'不同':'相同'}】\nA：${r.a}\nB：${r.b}`),...data.candidates.map((c,i)=>`${i?'B':'A'} 紫微状态：${c.ziweiStatus}`)].join('\n\n');}
