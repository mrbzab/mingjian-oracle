'use client';

import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TermHelp } from '@/components/term-help';
import type { BaZiResult } from '@/lib/bazi';

export function ChartSheet({ result, isExample, onCopy }: { result: BaZiResult; isExample: boolean; onCopy: () => void }) {
  return <article className="chart-sheet">
    <div className="sheet-heading"><div><p className="eyebrow">{isExample ? '示例命盘' : '本命四柱'}<span className="mx-2">/</span>{result.input.city}</p><h2>{result.input.name.trim() || '未署名'}<span>的八字</span></h2></div><Button variant="outline" onClick={onCopy} className="min-h-11 rounded-lg"><Copy />复制命盘</Button></div>
    <p className="sheet-date">公历 {result.date}{!result.input.unknownTime && ` · ${result.input.time}`}<span>农历 {result.lunarDate}</span></p>
    <div className="pillars-sheet">
      {result.pillars.map((options, index) => <section key={index} className={index === 2 ? 'pillar-cell day-master' : 'pillar-cell'}>
        <h3>{['年柱', '月柱', '日柱', '时柱'][index]}</h3>
        {options.length ? options.map((pillar) => <div key={pillar.value}><p className="pillar-characters"><span>{pillar.stem}</span><span>{pillar.branch}</span></p><p className="pillar-god"><TermHelp term={pillar.tenGod} /></p><p className="pillar-meta">{pillar.elements}<span>{pillar.naYin}</span></p></div>) : <div className="pillar-unknown"><span>—</span><p>时刻未知</p></div>}
        {options.length > 1 && <p className="mt-2 text-sm text-primary">候选柱</p>}
      </section>)}
    </div>
    <div className="sheet-foot"><p><TermHelp term="日主" /> <strong>{result.master || '待确认'}</strong></p><span>点击带 ⓘ 的术语查看解释</span></div>
    {!result.input.unknownTime && <details className="time-detail"><summary>出生时间校正</summary><div className="mt-3 text-sm leading-7 text-muted-foreground"><p>统一北京时间：{result.beijing?.replace('T', ' ')}（UTC+8）</p><p>日时排盘时间：{result.clockDate?.replace('T', ' ')}{result.input.clock === 'apparent' ? ` · 真太阳时近似，调整 ${result.adjustment >= 0 ? '+' : ''}${result.adjustment.toFixed(2)} 分钟` : ' · 北京时间'}</p></div></details>}
  </article>;
}
