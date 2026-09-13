import { annualPillar, type BaZiResult } from './bazi.ts';
import { analyzeRelations, comparisonNodes } from './bazi-relations.ts';

const normalized = (value: string) => value.replace(' ', 'T');

export function buildYearContext(result: BaZiResult, year: number) {
  const flow = annualPillar(year, result.master);
  const start = normalized(flow.start), end = normalized(flow.end);
  const cycles = result.luck?.cycles ?? [];
  const birth = result.beijing ?? result.date+'T00:00:00';
  const cuts = [...new Set([start, end, ...(birth>start&&birth<end?[birth]:[]), ...cycles.flatMap((cycle) => [normalized(cycle.start), normalized(cycle.end)]).filter((time) => time > start && time < end)])].sort();
  return { year, pillar: flow.value, start, end,
    segments: cuts.slice(0, -1).map((from, i) => {
      const to = cuts[i + 1];
      const cycle = cycles.find((item) => normalized(item.start) <= from && normalized(item.end) >= to);
      const beforeBirth=to<=birth;
      return { start: from, end: to, beforeBirth, luck: cycle?.value ?? null,
        note: beforeBirth ? '此段早于出生，不生成个人岁运关系' : cycle ? '仅在此重合时段适用' : result.luck ? '此段不在已列大运内，仅对照本命与流年' : '未提供起运资料，仅对照本命与流年',
        relations: beforeBirth ? [] : analyzeRelations(comparisonNodes(result.pillars, cycle, flow)).filter((item) => !item.natal),
      };
    }),
  };
}

export type YearContext = ReturnType<typeof buildYearContext>;
