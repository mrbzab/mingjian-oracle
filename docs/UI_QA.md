# UI redesign and browser checks · 2026-09-03

Local preview only; no production publication. Existing calculation logic and user history preserved.

## Layout
- Neutral white/slate working surface with cinnabar emphasis on the day pillar.
- A four-column chart sheet replaces the dark nested cards, including at narrow widths.
- Two-column desktop layout; single-column at 800px and below.
- Five-element/hidden-stem details use the installed accessible Tabs primitive.
- Time correction and relationship detail lists remain available through disclosures.

## Checks performed
Codex in-app browser viewport simulation, not a physical phone or iOS Safari test.

- 320×740, 390×844, 768×1024, 1280×900: no document-level horizontal overflow.
- 390px: submit synthetic birth data, result heading receives focus; return-to-edit focuses form heading.
- 320px and 390px: term popover remains within viewport; Escape closes it.
- Switch result tabs by click; arrow key moves focus and Enter activates tab after hydration.
- Select fourth major cycle then year 2033: annual choices and relationship period update correctly.
- February 30 rejected; error is visible and focused. No invalid chart replaces the previous result.
- Set longitude 999 and collapse time rules: native validation reopens details and focuses the invalid field.
- Unknown-time option disables time input and does not fabricate an hour pillar or luck cycle.
- Solar/lunar toggle round-trip: June 18, 1996 → lunar May 3 → June 18.
- Restore the synthetic test record through history without creating another record.
- Fixed long native-select text wrapping/clipping at 320px with single-line ellipsis.
- Final reload and subsequent interactions: no new browser console errors. Earlier dependency hot-refresh errors did not recur after reload.
- 41 automated tests, TypeScript checking, scoped lint, and production build pass.

Temporary viewport overrides reset. Browser left on the local example preview. Two clearly named synthetic records (界面测试, 未知时刻测试) were added through the UI; existing records were not deleted.
