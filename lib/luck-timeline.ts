import {type BaZiResult} from './bazi.ts';
import {buildYearContext} from './bazi-year-context.ts';
export function timelineWindow(result:BaZiResult,center:number) {
 const start=Math.max(1901,Math.min(2191,center-4));
 return Array.from({length:9},(_,i)=>{const year=start+i,context=buildYearContext(result,year);return {year,pillar:context.pillar,start:context.start,end:context.end,segments:context.segments.map(s=>({start:s.start,end:s.end,luck:s.luck,note:s.note})),handover:context.segments.length>1};});
}
