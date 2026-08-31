# Verdict

REDESIGN — `/search` scores 15/30, with load-bearing clarity and honesty issues: the current filter structure and labels make primary behaviour harder to predict than it should be.

Highest-leverage moves:

1. #4 Understandable: split “view the map” from “find near me”; map must never silently request location or change sort. Evidence: `src/app/search/page.tsx:663-688`.
2. #10 Less design: reduce the persistent strip to query + location + one “סינון” entry point; move service, date, price and sort into a progressive filter sheet with applied-filter chips and one clear-all. Evidence: `src/app/search/page.tsx:444-709`.
3. #6 Honest: use the API total or say “מציגות N תוצאות”; rename price caps to “מחיר התחלתי עד …”; replace raw map config text with a human recovery state. Evidence: `src/app/search/page.tsx:114-130,655-660,881-890`; `src/components/search/NailistMap.tsx:74-81`.
4. #8 Thorough: make date/price popovers real accessible dialogs/menus with Escape, focus return and a location-denied state. Evidence: `src/app/search/page.tsx:376-389,505-631`.
5. #3 Aesthetic: retain the pink/plum brand, but repair the white-on-primary CTA contrast and make cards the visual figure rather than a wall behind filters. Evidence: `src/app/search/page.tsx:499-504`.
