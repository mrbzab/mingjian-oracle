import type {BaZiResult} from './bazi.ts';
import type {ZiweiResult,QimenResult} from './metaphysics.ts';
import {buildYearContext} from './bazi-year-context.ts';
import {ziweiPalaceEvidence} from './metaphysics.ts';
export type ReportOptions={birth:boolean;details:boolean;ziwei:boolean;qimen:boolean};
export type ReportSection={title:string;lines:string[]};
export type ChartReport={title:string;subtitle:string;pillars:{label:string;value:string;detail:string}[];sections:ReportSection[]};
export function buildChartReport(result:BaZiResult,year:number,ziwei:ZiweiResult|null,qimen:QimenResult|null,options:ReportOptions):ChartReport {
 const context=buildYearContext(result,year);
 const sections:ReportSection[]=[];
 if(options.birth)sections.push({title:'出生资料',lines:[`公历 ${result.date} · ${result.input.unknownTime?'时刻未知':result.input.time} · ${result.input.city}`,`农历 ${result.lunarDate}`,...(result.clockDate?[`校正排盘时刻 ${result.clockDate.replace('T',' ')}`]:[])]});
 sections.push({title:'计算口径',lines:[`${result.input.timezone==='Asia/Shanghai'?'历史民用时间（处理夏令时）':'UTC+8 标准时间'} · ${result.input.clock==='apparent'?'真太阳时近似':'北京时间'} · ${result.input.daySect===1?'23:00':'00:00'} 换日`,`${result.input.gender==='unknown'?'未提供起运性别':result.input.gender==='male'?'男命':'女命'}口径 · 起运${result.input.yunSect===2?'按分钟':'按时辰'}折算`,...(!options.birth?['此报告已隐藏姓名、出生日期、出生时刻和地点；四柱仍属于个人命盘信息。']:result.warnings)]});
 sections.push({title:`${year} · ${context.pillar}岁运`,lines:[`${context.start.replace('T',' ')} 至 ${context.end.replace('T',' ')}（不含，UTC+8，立春年界）`,...context.segments.map(s=>`${s.luck?s.luck+'大运':'无对应大运'}：${s.start.replace('T',' ')}—${s.end.replace('T',' ')}。${s.note}`)]});
 if(options.details){
  sections.push({title:'藏干与十神',lines:result.pillars.flatMap((items,i)=>items.length?items.map(p=>`${['年柱','月柱','日柱','时柱'][i]} ${p.value}：${p.hidden.map(h=>h.gan+' '+h.element+' '+h.tenGod).join('；')}`):[`${['年柱','月柱','日柱','时柱'][i]}未知，不补造`])});
  for(const s of context.segments)sections.push({title:`岁运关系 · ${s.start.slice(0,10)}—${s.end.slice(0,10)}`,lines:s.relations.length?s.relations.map(r=>`${r.kind} · ${r.pattern}：${r.nodes.map(n=>n.label+' '+n.value).join(' ↔ ')}。${r.reading}`):['当前规则未检出岁运参与的关系，不代表不存在其他因素。']});
 }
 if(options.ziwei){if(!ziwei)sections.push({title:'紫微斗数',lines:['没有匹配当前出生资料、日期和流派的紫微命盘，请先生成。']});else{
  const soul=ziwei.chart.palaces.find(p=>p.earthlyBranch===ziwei.chart.earthlyBranchOfSoulPalace)!;const e=ziweiPalaceEvidence(ziwei,soul.index);
  sections.push({title:'紫微斗数',lines:[ziwei.rules,`运限日期 ${ziwei.horoscope?.date??'未计算'}（农历年界）`,`命宫 ${soul.heavenlyStem}${soul.earthlyBranch} · 主星 ${soul.majorStars.map(s=>s.name).join('、')||'无主星'}`,`三方四正 ${e.surrounded.map(p=>p.name+' '+p.earthlyBranch).join('、')}`,...e.yearly.map(r=>`流年 ${r.star}化${r.transformation} → ${r.palace}`)]});
  if(options.details)sections.push({title:'紫微十二宫',lines:ziwei.chart.palaces.map(p=>`${p.name} ${p.heavenlyStem}${p.earthlyBranch}：${[...p.majorStars,...p.minorStars].map(s=>s.name+(s.mutagen?'化'+s.mutagen:'')).join('、')||'无主辅星'}`)});
 }}
 if(options.qimen){if(!qimen)sections.push({title:'奇门遁甲',lines:['没有有效的独立起局结果，请先填写起局时刻并生成。']});else{sections.push({title:'奇门遁甲',lines:[qimen.time.replace('T',' ')+' UTC+8 · 独立起局',qimen.rules,`${qimen.chart.isYangDun?'阳遁':'阴遁'} ${qimen.chart.juShu} 局 · 值符 ${qimen.chart.zhiFu} · 值使 ${qimen.chart.zhiShi}`,...(options.details?qimen.chart.jiuGongGe.map(p=>`${p.name}：${p.renPan.door||'无门'} · ${p.tianPan.star||'无星'} · ${p.shenPan.god||'无神'} · 天盘 ${p.tianPan.stem||'—'} / 地盘 ${p.diPan.stem||'—'}`):[])]});}}
 sections.push({title:'来源与阅读说明',lines:['lunar-typescript 1.8.6；紫微/奇门采用 mingyu-core 0.2.1，紫微星盘采用 iztro 2.6.1。报告格式 v1。','八字立春年界、紫微农历年界与奇门独立时刻分开使用。报告整理盘面事实与传统关系，不构成事件预测。']});
 if(!options.birth){const dates=[...new Set([result.date,result.beijing?.slice(0,10),result.clockDate?.slice(0,10)].filter((v):v is string=>!!v))];const redact=(text:string)=>dates.reduce((value,date)=>value.replaceAll(date,'[出生日期已隐藏]'),text);for(const section of sections){section.title=redact(section.title);section.lines=section.lines.map(redact);}}
 return {title:options.birth&&result.input.name.trim()?result.input.name.trim()+'的命笺':'命笺 · 命盘报告',subtitle:`${year} 年 · 四柱与岁运`,pillars:result.pillars.map((items,i)=>({label:['年柱','月柱','日柱','时柱'][i],value:items.map(p=>p.value).join(' / ')||'未知',detail:items.map(p=>p.tenGod+' · '+p.naYin).join(' / ')})),sections};
}
