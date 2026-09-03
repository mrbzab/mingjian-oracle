'use client';

import { useMemo } from 'react';
import type { BaZiResult } from '@/lib/bazi';
import { analyzeRelations, comparisonNodes } from '@/lib/bazi-relations';
import { TermHelp } from '@/components/term-help';

export function RelationsPanel({ result, luck, flow, period }: { result: BaZiResult; luck?: { value: string }; flow: { value: string; year: number }; period: string }) {
  const nodes = useMemo(() => comparisonNodes(result.pillars, luck, flow), [result.pillars, luck, flow]);
  const relations = useMemo(() => analyzeRelations(nodes), [nodes]);
  const omitted = result.pillars.flatMap((options, i) => options.length !== 1 ? [['年柱', '月柱', '日柱', '时柱'][i]] : []);
  return <details className="relations-disclosure" aria-label="干支关系分析">
    <summary>干支关系分析<span>{relations.length} 组关系 · 展开查看</span></summary>
    <p className="mt-2 text-sm leading-7 text-muted-foreground">范围：{luck ? '本命四柱＋所选大运＋流年' : '已知本命柱＋流年'}。{period}</p>
    {omitted.length > 0 && <p className="mt-2 rounded-lg bg-muted p-3 text-sm leading-7">{omitted.join('、')}未知或有多个候选，暂不参与关系分析；以下不是完整命盘结论。</p>}
    <p className="mt-2 text-sm leading-7 text-muted-foreground">仅识别明干、地支的五合、六合、三合、六冲、刑、六害；不分析藏干暗合、半合、合化或关系强弱。不同关系可以同时存在，不互相抵消。</p>
    {(['岁运参与', '本命内部'] as const).map((group) => {
      const items = relations.filter((item) => item.natal === (group === '本命内部'));
      return <div key={group} className="mt-5"><h5 className="font-medium">{group} · {items.length} 组</h5>
        {!items.length ? <p className="mt-2 text-sm leading-7 text-muted-foreground">在本页覆盖的规则和已知柱位中，未检测到组合；这不表示“无吉凶”。</p> : <ul className="mt-3 space-y-3">{items.map((item) => <li key={item.id} className="rounded-xl border bg-background p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-medium"><TermHelp term={item.term} />{item.kind.includes('·') && <span className="ml-2 text-sm text-muted-foreground">{item.kind.split('·')[1]}</span>}</p><p className="font-serif text-xl text-primary">{item.pattern}</p></div>
          <p className="mt-2 text-sm leading-7"><span className="text-muted-foreground">检测到的组合：</span>{item.nodes.map((node) => `${node.label} ${node.value}`).join(' ↔ ')}</p>
          <details className="mt-2"><summary className="cursor-pointer text-sm text-primary">传统解释（非事件预测）</summary><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.reading}</p></details>
        </li>)}</ul>}
      </div>;
    })}
    <p className="mt-4 text-sm leading-7 text-muted-foreground">关系表参考<a className="source-link" href="https://zh.wikisource.org/wiki/三命通會/卷二" target="_blank" rel="noreferrer">《三命通会》卷二</a>，用于传统术语核对，不作为命运预测有效性的证据。</p>
  </details>;
}
