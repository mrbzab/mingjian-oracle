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

## Bug regression — 2026-09-13

- Reproduced native date/time input state mismatches: DOM displayed a new value while calculation kept the old controlled value. Added input-event handling for birth time, both comparison candidates, Ziwei target date and Qimen datetime.
- Browser verified birth 10:30:00 produces a 10:30 corrected Ziwei chart; target date 2027-07-01 is reflected in the horoscope; manual Qimen 2026-09-13 09:00 enables generation and appears in its result.
- Verified 09:00/11:00 comparison differences, clearing stale comparison after editing, identical 11:00 candidates with explicit no-differences text, and adopting candidate A.
- Verified topic switch, material generation and invalidation after switching topics. At a 390x844 viewport the synthesis page has no horizontal document overflow (client/scroll width both 375 CSS px). No captured console errors in the tested flows.
- Regression tests cover opt-in Qimen missing statuses, transformation palace differences and hiding birth-boundary timestamps in exported reports.
- Validation: 76 tests passed; TypeScript check and production build passed. Browser coverage is local Chromium; no physical device/Safari claim.
