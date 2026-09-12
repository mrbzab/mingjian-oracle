import type {ChartReport} from './chart-report';
export async function downloadChartImage(report:ChartReport) {
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=1100;
 const context=canvas.getContext('2d');if(!context)throw Error('此浏览器无法生成图片，请使用打印导出。'); const ctx:CanvasRenderingContext2D=context;
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,1200,1100);ctx.fillStyle='#943e32';ctx.fillRect(0,0,1200,16);
 function line(text:string,x:number,y:number,size=28,color='#252932'){ctx.font=`${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;ctx.fillStyle=color;ctx.fillText(text,x,y);}
 function wrap(text:string,x:number,y:number,width:number,size=25){ctx.font=`${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;let row='';for(const ch of text){if(ctx.measureText(row+ch).width>width){line(row,x,y,size);row='';y+=size*1.6;}row+=ch;}if(row)line(row,x,y,size);return y+size*1.6;}
 let y=wrap(report.title,70,105,1060,44);line(report.subtitle,70,y+12,26,'#646873');y+=75;
 for(let i=0;i<4;i++){const x=70+i*270;ctx.fillStyle='#f8f4f1';ctx.fillRect(x,y,250,255);line(report.pillars[i].label,x+25,y+45,28);wrap(report.pillars[i].value,x+25,y+115,200,report.pillars[i].value.includes('/')?28:44);wrap(report.pillars[i].detail,x+25,y+195,200,21);}
 y+=305;const birth=report.sections.find(s=>s.title==='出生资料');if(birth)for(const text of birth.lines)y=wrap(text,70,y,1060,25);
 const rules=report.sections.find(s=>s.title==='计算口径');if(rules)for(const text of rules.lines.slice(0,2))y=wrap(text,70,y+6,1060,24);
 line('命笺 · 四柱图片',70,1005,25,'#943e32');line('岁运及完整资料请使用报告的打印 / PDF 导出。',70,1050,23,'#646873');
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('图片生成失败，请重试。')),'image/png'));
 return URL.createObjectURL(blob);
}
