# Browser workflow QA — 2026-09-12

Validated in the local in-app Chromium browser at 1440×900, 390×844 and 320×740. These are browser viewport checks, not physical phone or Safari tests.

- Changed birth details; dirty status appeared and one-click update refreshed the chart.
- Selected a new year; Ziwei became unavailable until regenerated while Qimen retained its independent time.
- Entered Qimen time using the current-time control, generated a chart, opened and switched palace details.
- Opened Ziwei details, switched transformation layers, moved to adjacent palaces and returned. Focus returns to the selected palace; one selected and three related palaces remain highlighted.
- Verified mobile auto/list and compact Ziwei chart, full-width detail sheet, and no document horizontal overflow at tested widths.
- Verified mobile one-click update collapses birth details and reveals results.
- Copied full synthesis material through the actual button and checked the clipboard JSON: BaZi year 2028, Ziwei date 2028-07-01, independent Qimen timestamp in 2026. The page reported successful copy.
- Verified long material stays in a bounded scrolling textarea and the copy button remains reachable.
- Captured browser console contained no errors during the final checks.

Fixes: removed obstructive sticky context placement; used dialog finalFocus instead of racing focus restoration; replaced immediately validated year typing with a select; cleared stale notices after source edits; removed persistent in-progress wording; bounded all interpretation editors; made mobile one-click refresh reveal results consistently.
