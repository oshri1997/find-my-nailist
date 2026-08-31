# Evidence — `/search`

## Structural

- `SearchPage` is one 631-line client component with 23 persistent controls: input, location, search, date, price, 14 service chips, view toggle and three sort controls. Calendar and price popovers add more controls. `src/app/search/page.tsx:66-81,444-709`.
- Result cards combine a custom `role=link`, favourite button and optional WhatsApp link; the primary DOM reaches roughly seven nesting levels. `src/app/search/page.tsx:771-890`.
- The map switch also requests geolocation, changes sort and refetches nearby results rather than only changing view. `src/app/search/page.tsx:663-688`.

## Visual and states

- The page uses a broad spacing scale (4–96px) and type scale (10–18px), with 23 authored colour values/18 semantic roles. `src/app/search/page.tsx:439-890`, `src/app/globals.css:40-91`.
- Loading, error/retry, filtered and unfiltered empty, result, disabled and load-more states exist. `src/app/search/page.tsx:711-760,770-890`; route fallback: `src/app/search/loading.tsx:3-8`.
- White text on the primary CTA is 4.07:1 in light mode and 3.31:1 in dark mode, below normal-text AA. `src/app/search/page.tsx:499-504`, `src/app/globals.css:39-93`.
- Map misconfiguration exposes an environment-variable name to users. `src/components/search/NailistMap.tsx:74-81`.

## Copy and behaviour

- UI says “נמצאו {n} נייליסטיות” but displays only the currently loaded client items while a “טעני עוד” control remains; the API returns a total that the page discards. `src/app/search/page.tsx:226,655-660,881-890`; `src/app/api/nailists/route.ts:187-191,221-225`.
- “עד ₪100/200/350” filters by starting price, not necessarily the selected treatment’s price. `src/app/search/page.tsx:114-130`.
- Service chips include 14 specialist terms with no explainer, and “תור קרוב” is an ambiguous sort label. `src/app/search/page.tsx:66-81,692-705`.
- The location control has no visible denied-permission state. `src/app/search/page.tsx:376-389`.

## Weight and accessibility

- Initial view makes at least `/api/nailists`; logged-in visitors also request favourites. The map is dynamically imported and deferred until map view. `src/app/search/page.tsx:13-15,208-226,318-330,762-768`.
- Cover images are preloaded with a 2.5-second ceiling; live inspection found two idle animations and zero initial modals/notifications. `src/app/search/page.tsx:285-316`.
- The global navbar is the only explicit landmark. No skip link or page `<main>` exists. `src/components/layout/navbar.tsx:49`; `src/app/search/page.tsx:436-894`.
- The date/price triggers advertise dialog/menu semantics but their popovers lack the matching roles, Escape handling and focus restoration. `src/app/search/page.tsx:505-631`.
