import type {BaZiResult} from './bazi.ts';
import {buildYearContext} from './bazi-year-context.ts';
import {ziweiPalaceEvidence,type ZiweiResult,type QimenResult} from './metaphysics.ts';
export const TOPICS={career:{title:'事业与学习',gods:['正官','七杀','正印','偏印','食神','伤官'],palaces:['官禄','财帛','迁移'],focus:'规则与责任、学习支持、表达和工作环境'},relationship:{title:'关系与相处',gods:['比肩','劫财','食神','伤官'],palaces:['夫妻','福德','迁移'],focus:'自我边界、表达方式与相处需求'},growth:{title:'自我成长',gods:['正印','偏印','比肩','劫财'],palaces:['命宫','福德','迁移'],focus:'学习方式、自主性与环境适应'}} as const;
export type Topic=keyof typeof TOPICS;
const meaning:Record<string,string>={正官:'传统上用于观察规范、责任与约束',七杀:'传统上用于观察压力与应对方式',正印:'传统上用于观察学习与支持',偏印:'传统上用于观察独立学习与思考',食神:'传统上用于观察表达与产出',伤官:'传统上用于观察表达与规则之间的张力',比肩:'传统上用于观察自主性与同伴关系',劫财:'传统上用于观察协作与资源边界'};
export function buildTopicReading(result:BaZiResult,year:number,ziwei:ZiweiResult|null,qimen:QimenResult|null,topic:Topic,question='',includeQimen=false){
 const config=TOPICS[topic],context=buildYearContext(result,year);
 const labels=['年柱','月柱','日柱','时柱'];
 const bazi=result.pillars.flatMap((options,i)=>options.length===1?options.flatMap(p=>[
  ...((config.gods as readonly string[]).includes(p.tenGod)?[{source:labels[i]+' '+p.value+' · 透干 '+p.tenGod,reading:meaning[p.tenGod]}]:[]),
  ...p.hidden.filter(h=>(config.gods as readonly string[]).includes(h.tenGod)).map(h=>({source:labels[i]+' '+p.value+' · 藏干 '+h.gan+' '+h.tenGod,reading:meaning[h.tenGod]+'；藏干不等同于透干，也不代表实际行为'}))
 ]):[]);
 const palaces=ziwei?ziwei.chart.palaces.filter(p=>(config.palaces as readonly string[]).includes(p.name)).map(p=>{
  const e=ziweiPalaceEvidence(ziwei,p.index);
  return {name:p.name+' '+p.heavenlyStem+p.earthlyBranch,stars:p.majorStars.map(s=>s.name).join('、')||'无主星',surrounded:e.surrounded.map(s=>s.name+' '+s.earthlyBranch).join('、'),natal:e.natal.filter(r=>r.palace===p.name),decadal:e.decadal.filter(r=>r.palace===p.name),yearly:e.yearly.filter(r=>r.palace===p.name)};
 }):[];
 const relevantIndices=result.pillars.flatMap((ps,i)=>ps.length===1&&((topic==='relationship'&&i===2)||(config.gods as readonly string[]).some(g=>ps[0].tenGod===g||ps[0].hidden.some(h=>h.tenGod===g)))?[i]:[]);
 const timing=context.segments.map(s=>({...s,relations:s.relations.filter(r=>r.nodes.some(n=>relevantIndices.some(i=>n.id==='birth-'+i)))}));
 const qimenIncluded=includeQimen&&!!question.trim()&&!!qimen;
 return {topic,title:config.title,focus:config.focus,bazi,palaces,timing,ziweiDate:ziwei?.horoscope?.date??null,
  overview:bazi.length?`当前按${config.title}主题整理出 ${bazi.length} 条透干或藏干线索，可围绕${config.focus}对照阅读。`:'请补充出生资料后查看主题线索。',
  limits:[...(result.input.unknownTime?['出生时刻未知，仅列唯一确定的柱位，缺少时柱；不能据此认定完整格局。']:[]),...(!ziwei?['紫微资料未同步，暂不作跨体系对照。']:[]),'十神主题映射只用于组织传统解读，不等于性格测量；关系专题不按性别指定配偶星，也不预测婚姻结果。','不同体系没有统一量纲，不计算一致率。相合与相冲、化禄与化忌可同时存在，需分别保留；未出现某项不代表不存在相关现实问题。'],
  qimen:qimenIncluded?{time:qimen!.time,rules:qimen!.rules,question:question.trim(),patterns:qimen!.chart.classicPatterns.map(p=>p.name+'：'+p.summary)}:null,
  qimenNote:qimenIncluded?'奇门只对应所填问题及独立起局时刻。':includeQimen?'需填写具体问题并生成有效奇门盘，才纳入本专题。':'奇门默认不纳入出生盘专题，可在有具体问题时单独启用。'};
}
