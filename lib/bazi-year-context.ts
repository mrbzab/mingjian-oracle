import { annualPillar, type BaZiResult } from './bazi.ts';
import { analyzeRelations, comparisonNodes } from './bazi-relations.ts';

const normalized = (value: string) => value.replace(' ', 'T');

export function buildYearContext(result: BaZiResult, year: number) {
  const flow = annualPillar(year, result.master);
  const start = normalized(flow.start), end = normalized(flow.end);
  const cycles = result.luck?.cycles ?? [];
  const cuts = [...new Set([start, end, ...cycles.flatMap((cycle) => [normalized(cycle.start), normalized(cycle.end)]).filter((time) => time > start && time < end)])].sort();
  return { year, pillar: flow.value, start, end,
    segments: cuts.slice(0, -1).map((from, i) => {
      const to = cuts[i + 1];
      const cycle = cycles.find((item) => normalized(item.start) <= from && normalized(item.end) >= to);
      return { start: from, end: to, luck: cycle?.value ?? null,
        note: cycle ? '仅在此重合时段适用' : result.luck ? '此段不在已列大运内，仅对照本命与流年' : '未提供起运资料，仅对照本命与流年',
        relations: analyzeRelations(comparisonNodes(result.pillars, cycle, flow)).filter((item) => !item.natal),
      };
    }),
  };
}

export type YearContext = ReturnType<typeof buildYearContext>;
