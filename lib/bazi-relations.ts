export type RelationNode = { id: string; label: string; value: string; source: 'birth' | 'luck' | 'year' };
export type Relation = { id: string; kind: string; term: string; pattern: string; nodes: RelationNode[]; reading: string; natal: boolean };

export function comparisonNodes(pillars: Array<Array<{ value: string }>>, luck: { value: string } | undefined, flow: { year: number; value: string }) {
  const nodes: RelationNode[] = pillars.flatMap((options, i) => options.length === 1 ? [{ id: `birth-${i}`, label: ['本命年柱', '本命月柱', '本命日柱', '本命时柱'][i], value: options[0].value, source: 'birth' as const }] : []);
  if (luck) nodes.push({ id: 'luck', label: '所选大运', value: luck.value, source: 'luck' });
  nodes.push({ id: 'year', label: `${flow.year}流年`, value: flow.value, source: 'year' });
  return nodes;
}

// Traditional matching tables: San Ming Tong Hui, volume 2 (public domain).
// https://zh.wikisource.org/wiki/三命通會/卷二
// This is structural matching only: no strength, distance, transformation, or event prediction.
const PAIRS = [
  { kind: '地支六破', at: 1, pairs: ['子酉', '丑辰', '寅亥', '卯午', '巳申', '未戌'], reading: '传统相破配对，按命语六破表识别。合与破可以同时存在，不据单一关系推断婚姻、事业或财务结果。' },
  { kind: '天干五合', at: 0, pairs: ['甲己', '乙庚', '丙辛', '丁壬', '戊癸'], reading: '传统上以“合”讨论联结或牵制；本页未判断合化条件，不能据此断为吉。' },
  { kind: '地支六合', at: 1, pairs: ['子丑', '寅亥', '卯戌', '辰酉', '巳申', '午未'], reading: '传统上用来讨论支之间的配合或牵连；有合不等于和睦，也不自动合化。' },
  { kind: '地支六冲', at: 1, pairs: ['子午', '丑未', '寅申', '卯酉', '辰戌', '巳亥'], reading: '传统上用来讨论相对或变动；仅凭这一组不能判断搬迁、分离或其他事件。' },
  { kind: '地支六害', at: 1, pairs: ['子未', '丑午', '寅巳', '卯辰', '申亥', '酉戌'], reading: '传统上用来讨论配合中的牵碍；不表示现实中必有人加害或发生损失。' },
  { kind: '子卯相刑', at: 1, pairs: ['子卯'], reading: '这是传统相刑关系名称，不用于判断品行，也不直接推断吉凶。' },
  { kind: '自刑', at: 1, pairs: ['辰辰', '午午', '酉酉', '亥亥'], reading: '这里只表示两个不同柱位出现同一自刑支，不指心理问题、自我伤害或必有灾祸。' },
];

export function analyzeRelations(nodes: RelationNode[]): Relation[] {
  const usable = nodes.filter((node) => /^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(node.value));
  const result: Relation[] = [];
  function add(kind: string, term: string, pattern: string, matched: RelationNode[], reading: string) {
    result.push({ id: `${kind}:${matched.map((node) => node.id).sort().join(':')}`, kind, term, pattern, nodes: matched, reading, natal: matched.every((node) => node.source === 'birth') });
  }
  for (let i = 0; i < usable.length; i++) for (let j = i + 1; j < usable.length; j++) {
    const a = usable[i]; const b = usable[j];
    if (a.id === b.id) continue;
    for (const rule of PAIRS) {
      const pattern = rule.pairs.find((pair) => pair === a.value[rule.at] + b.value[rule.at] || pair === b.value[rule.at] + a.value[rule.at]);
      if (pattern) add(rule.kind, rule.kind, pattern, [a, b], rule.reading);
    }
    for (const group of ['寅巳申', '丑戌未']) {
      if (a.value[1] === b.value[1] || !group.includes(a.value[1]) || !group.includes(b.value[1])) continue;
      const natalPair = a.source === 'birth' && b.source === 'birth';
      const scope = natalPair ? usable.filter((node) => node.source === 'birth') : usable;
      if (group.split('').every((branch) => scope.some((node) => node.value[1] === branch))) continue;
      add('三刑·两支', '三刑', a.value[1] + b.value[1], [a, b], `属于${group}组中的两支，${natalPair ? '本命内部' : '当前对照中'}尚缺${group.split('').filter((branch) => branch !== a.value[1] && branch !== b.value[1]).join('')}。是否两支即论刑，各家处理不同；此处不标为三支齐全。`);
    }
  }
  for (const group of ['申子辰', '亥卯未', '寅午戌', '巳酉丑', '寅巳申', '丑戌未']) {
    const sets = group.split('').map((branch) => usable.filter((node) => node.value[1] === branch));
    for (const a of sets[0]) for (const b of sets[1]) for (const c of sets[2]) {
      if (new Set([a.id, b.id, c.id]).size !== 3) continue;
      const isPunishment = group === '寅巳申' || group === '丑戌未';
      add(isPunishment ? '三刑·三支齐全' : '地支三合', isPunishment ? '三刑' : '地支三合', group, [a, b, c], isPunishment ? '该组的三种地支均已出现；这里只确认齐全，不将名称直接解释为灾祸。' : '三种地支齐全。传统上讨论其协同关系；本页不分析月令与其他成局条件，不宣称已经合化。');
    }
  }
  return result;
}
