'use client';

import { Popover, PopoverTrigger, PopoverContent, PopoverTitle, PopoverDescription } from '@/components/ui/popover';
import { BAZI_TERMS } from '@/lib/bazi-terms';

export function TermHelp({ term }: { term: string }) {
  const description = BAZI_TERMS[term];
  if (!description) return <>{term}</>;
  return <Popover>
    <PopoverTrigger type="button" className="term-help" aria-label={`查看${term}的解释`}>{term}<span aria-hidden="true" className="ml-1 text-[0.75em]">ⓘ</span></PopoverTrigger>
    <PopoverContent className="max-w-[calc(100vw-2rem)] p-4 text-base leading-7">
      <PopoverTitle className="text-base">{term}</PopoverTitle>
      <PopoverDescription className="text-base leading-7">{description}</PopoverDescription>
    </PopoverContent>
  </Popover>;
}
