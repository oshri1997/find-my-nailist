````text
/make-plan Redesign the Nailistiot `/search` screen. Current design failed audit at 15/30 with critical gaps in principles #4 Understandable and #6 Honest.

Primary user: a Hebrew RTL client looking for a nailist in Israel.
Primary task: find a suitable nailist, understand availability, and open a profile to book.
Constraints: preserve the pink/plum Nailistiot brand, Next.js stack, all current discovery/booking data capabilities, responsive and accessible keyboard flow.

Verdict paragraph:
> REDESIGN — `/search` scores 15/30, with load-bearing clarity and honesty issues: the current filter structure and labels make primary behaviour harder to predict than it should be.

Preserve from current design:
- Pink/plum semantic brand tokens and the responsive result cards. Evidence: `src/app/globals.css:40-91`, `src/app/search/page.tsx:770-890`.
- Existing loading, error/retry, empty and load-more states. Evidence: `src/app/search/page.tsx:711-760,881-890`.

Discard:
- The all-at-once sticky filter bar with search, date, price, 14 service chips, view and sort as peers. Evidence: `src/app/search/page.tsx:444-709`. Caused failure on principle #10.
- The map toggle coupling view, geolocation, distance sort and refetch. Evidence: `src/app/search/page.tsx:663-688`. Caused failure on principle #4.

Top moves:
1. #4 Understandable: split “view the map” from “find near me”; map must never silently request location or change sort. Evidence: `src/app/search/page.tsx:663-688`.
2. #10 Less design: reduce the persistent strip to query + location + one “סינון” entry point; move service, date, price and sort into a progressive filter sheet with applied-filter chips and one clear-all. Evidence: `src/app/search/page.tsx:444-709`.
3. #6 Honest: use the API total or say “מציגות N תוצאות”; rename price caps to “מחיר התחלתי עד …”; replace raw map config text with a human recovery state. Evidence: `src/app/search/page.tsx:114-130,655-660,881-890`; `src/components/search/NailistMap.tsx:74-81`.
4. #8 Thorough: make date/price popovers real accessible dialogs/menus with Escape, focus return and a location-denied state. Evidence: `src/app/search/page.tsx:376-389,505-631`.
5. #3 Aesthetic: retain the pink/plum brand, but repair the white-on-primary CTA contrast and make cards the visual figure rather than a wall behind filters. Evidence: `src/app/search/page.tsx:499-504`.

Redesign principles in priority order:
1. Useful (#2) — a first-time user can search then filter progressively without scanning 23 controls.
2. Understandable (#4) — every visible label maps 1:1 to behaviour, particularly map and location.
3. As little design as possible (#10) — persistent chrome is query, location and filters; results lead the visual hierarchy.

Deliverables:
- New information architecture and labeled low-fi primary flow compared side-by-side to current.
- Token/spec decisions for type, spacing and accessible CTA contrast.
- Empty/loading/error/success/focus/disabled state checklist.
- Migration path and cutover criteria for replacing the old search surface.

Anti-patterns:
- Do not port the old control strip under new styling.
- Do not couple map view to geolocation.
- Do not add visual decoration before reducing interaction density.
- Do not claim a total count or price meaning the data cannot support.
````
