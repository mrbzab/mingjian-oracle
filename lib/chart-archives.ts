import { calculateBaZi, type BirthInput } from './bazi.ts';
export const ARCHIVE_KEY='mingjian-archives-v2';
export const LEGACY_KEY='mingjian-bazi-v1';
export type ChartArchive={id:string;title:string;group:string;note:string;input:BirthInput;createdAt:string;updatedAt:string};
export type ArchiveStore={version:2;items:ChartArchive[]};
export function readArchives(raw:string|null,legacy:string|null):ArchiveStore {
 const value:unknown=JSON.parse(raw??legacy??'[]');
 const source=raw ? (value as ArchiveStore)?.items : value;
 if(raw && (value as ArchiveStore)?.version!==2)throw Error('档案版本不受支持，原始数据未改动。');
 if(!Array.isArray(source)||source.length>500)throw Error('档案格式无效或超过 500 份，原始数据未改动。');
 const ids=new Set<string>();
 const items=source.map((item):ChartArchive=>{
  if(!item||typeof item.id!=='string'||!item.id||ids.has(item.id))throw Error('档案编号无效，原始数据未改动。');
  ids.add(item.id);const input=calculateBaZi(item.input).input;
  if(raw && (typeof item.title!=='string'||item.title.length>60||typeof item.group!=='string'||item.group.length>30||typeof item.note!=='string'||item.note.length>3000||typeof item.createdAt!=='string'||typeof item.updatedAt!=='string'||!Number.isFinite(Date.parse(item.createdAt))||!Number.isFinite(Date.parse(item.updatedAt))))throw Error('档案内容无效，原始数据未改动。');
  return raw?{id:item.id,title:item.title,group:item.group,note:item.note,input,createdAt:item.createdAt,updatedAt:item.updatedAt}:{id:item.id,title:input.name.trim()||'未署名命盘',group:'历史记录',note:'',input,createdAt:'1970-01-01T00:00:00.000Z',updatedAt:'1970-01-01T00:00:00.000Z'};
 });
 return {version:2,items};
}
export function saveArchive(store:ArchiveStore,item:ChartArchive):ArchiveStore {
 const exists=store.items.some(v=>v.id===item.id);
 if(!exists&&store.items.length>=500)throw Error('当前设备最多保存 500 份命盘，请先整理已有档案。');
 const next={version:2 as const,items:[item,...store.items.filter(v=>v.id!==item.id)]};
 return readArchives(JSON.stringify(next),null);
}
export function filterArchives(items:ChartArchive[],query:string,group:string) {
 const normalize=(value:string)=>value.toLocaleLowerCase().replace(/(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})日?/g,(_,y,m,d)=>`${y}/${Number(m)}/${Number(d)}`);
 const term=normalize(query.trim());
 return items.filter(v=>(!group||v.group===group)&&(!term||normalize([v.title,v.group,v.note,v.input.name,`${v.input.year}/${v.input.month}/${v.input.day}`].join(' ')).includes(term)));
}

// Validate the entire backup before merging; never overwrite an existing archive.
export function mergeArchives(current:ArchiveStore,incoming:ArchiveStore,newId:()=>string=()=>crypto.randomUUID()) {
 const validated=readArchives(JSON.stringify(incoming),null);
 const stable=(value:unknown):unknown=>value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,stable(item)])):value;
 const signature=({id,...record}:ChartArchive)=>JSON.stringify(stable(record));
 const signatures=new Set(current.items.map(signature));
 const ids=new Set(current.items.map(v=>v.id));
 const additions:ChartArchive[]=[];let skipped=0,conflicts=0;
 for(const item of validated.items){
  const sig=signature(item);
  if(signatures.has(sig)){skipped++;continue;}
  let id=item.id;
  if(ids.has(id)){id=newId();if(ids.has(id)||!id)throw Error('无法生成唯一档案编号，请重试。');conflicts++;}
  ids.add(id);signatures.add(sig);additions.push({...item,id});
 }
 if(current.items.length+additions.length>500)throw Error('合并后超过 500 份档案，本次未导入。请先整理档案。');
 return {store:{version:2 as const,items:[...additions,...current.items]},added:additions.length,skipped,conflicts};
}
