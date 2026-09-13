import type {ChartReport} from './chart-report';

type ImageLine={text:string;x:number;y:number;size:number;color:string};
export function chartImageLayout(report:ChartReport,measure:(text:string,size:number)=>number) {
 const lines:ImageLine[]=[];
 function line(text:string,x:number,y:number,size=28,color='#252932'){lines.push({text,x,y,size,color});}
 function wrap(text:string,x:number,y:number,width:number,size=25){let row='';for(const ch of text){if(ch==='\n'||(row&&measure(row+ch,size)>width)){line(row,x,y,size);row='';y+=size*1.6;if(ch==='\n')continue;}row+=ch;}if(row)line(row,x,y,size);return y+size*1.6;}
 let y=wrap(report.title,70,105,1060,44);line(report.subtitle,70,y+12,26,'#646873');y+=75;
 const cardTop=y;
 const bottoms=report.pillars.map((p,i)=>{const x=70+i*270;line(p.label,x+25,cardTop+45,28);let bottom=wrap(p.value,x+25,cardTop+115,200,p.value.includes('/')?28:44);return wrap(p.detail,x+25,bottom+25,200,21);});
 const cardHeight=Math.max(255,...bottoms.map(bottom=>bottom-cardTop+15));
 y=cardTop+cardHeight+50;
 const birth=report.sections.find(s=>s.title==='出生资料');if(birth)for(const text of birth.lines)y=wrap(text,70,y,1060,25);
 const rules=report.sections.find(s=>s.title==='计算口径');if(rules)for(const text of rules.lines.slice(0,2))y=wrap(text,70,y+6,1060,24);
 const footer=Math.max(1005,y+45);
 line('命笺 · 四柱图片',70,footer,25,'#943e32');line('岁运及完整资料请使用报告的打印 / PDF 导出。',70,footer+45,23,'#646873');
 return {width:1200,height:Math.ceil(footer+95),cardTop,cardHeight,lines};
}
export async function downloadChartImage(report:ChartReport) {
 await document.fonts.ready;
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('此浏览器无法生成图片，请使用打印导出。');
 const font=(size:number)=>`${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;
 const layout=chartImageLayout(report,(text,size)=>{ctx.font=font(size);return ctx.measureText(text).width;});
 canvas.width=layout.width;canvas.height=layout.height;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#943e32';ctx.fillRect(0,0,canvas.width,16);
 ctx.fillStyle='#f8f4f1';for(let i=0;i<4;i++)ctx.fillRect(70+i*270,layout.cardTop,250,layout.cardHeight);
 for(const line of layout.lines){ctx.font=font(line.size);ctx.fillStyle=line.color;ctx.fillText(line.text,line.x,line.y);}
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片生成失败，请重试。')),'image/png'));
 return URL.createObjectURL(blob);
}
