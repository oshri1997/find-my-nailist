# Scorecard — `/search`

1. Good design is innovative — Score: 2/3
   Evidence: grid/map and availability-aware sort add useful variation, but map view is coupled to geolocation. `01-evidence.md#structural`.
   Justification: It refreshes a conventional finder pattern but does not introduce a restrained new interaction.

2. Good design makes a product useful — Score: 2/3
   Evidence: discovery and profile actions are direct, but 23 persistent controls compete before a result is chosen. `01-evidence.md#structural`.
   Justification: The task completes, but adjacent controls add detours.

3. Good design is aesthetic — Score: 2/3
   Evidence: card and token language is coherent, while CTA contrast is below AA. `01-evidence.md#visual-and-states`.
   Justification: The visual system is mostly coherent with one significant execution flaw.

4. Good design is understandable — Score: 1/3
   Evidence: 14 unexplained specialist chips, ambiguous “תור קרוב”, and a map toggle that changes location/sort. `01-evidence.md#copy-and-behaviour`.
   Justification: Several primary controls need explanation or behave unlike their label.

5. Good design is unobtrusive — Score: 1/3
   Evidence: the sticky bar presents search, date, price, 14 services, view and sort as parallel chrome. `01-evidence.md#structural`.
   Justification: Decoration is restrained, but control density competes with results.

6. Good design is honest — Score: 1/3
   Evidence: result count and price labels overstate their underlying data, and map configuration jargon reaches users. `01-evidence.md#copy-and-behaviour`.
   Justification: There are no dark patterns, but multiple labels fail a one-to-one behaviour match.

7. Good design is long-lasting — Score: 2/3
   Evidence: semantic brand tokens are durable; glass/blur and motion lift are trend markers. `01-evidence.md#visual-and-states`.
   Justification: The system should age reasonably with a small amount of trend residue.

8. Good design is thorough down to the last detail — Score: 2/3
   Evidence: major data states exist, but location denial, map error copy and popover focus semantics are rough. `01-evidence.md#visual-and-states`, `01-evidence.md#weight-and-accessibility`.
   Justification: One-to-three important interaction states remain unfinished.

9. Good design is environmentally friendly — Score: 1/3
   Evidence: deferred map is a good mitigation, but client fetching, image preloading and idle motion remain; no reduced-motion proof exists. `01-evidence.md#weight-and-accessibility`.
   Justification: Measurable byte/TTI data is unavailable, so the conservative score follows the always-on motion and work on initial view.

10. Good design is as little design as possible — Score: 1/3
   Evidence: duplicated clear affordances and many parallel filter modes are removable complexity. `01-evidence.md#structural`, `01-evidence.md#copy-and-behaviour`.
   Justification: The screen is dominated by controls before the user can evaluate a result.

Total: 15/30
