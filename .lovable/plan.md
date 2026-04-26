# Add a Map View to "Ask CareMap"

## Goal

Give users a geographic view of returned facilities **alongside** the existing editorial cards — without making the page feel cramped. Map and cards should reinforce each other (shared numbering, hover sync) rather than compete for attention.

## Recommended layout: "Map on top, cards below" + a view toggle

After looking at the current right-column layout (intent panel → facility cards), the cleanest way to add a map without congestion is:

- **Map sits above the cards in the same right column** as a fixed-height panel (~400px desktop, ~280px mobile). No horizontal split = no cramped side-by-side feel.
- **Cards stay exactly as they are below** — full editorial weight preserved.
- A small **Map · List · Both** segmented control in the "Facilities" ribbon header lets the user collapse the map or hide the cards if they want one or the other full-size. Default = **Both**.

This keeps the editorial reading rhythm (kicker → headline → deck → cards) intact while adding spatial context above the fold.

## Why this approach over alternatives

| Option | Trade-off |
|---|---|
| Side-by-side map + cards | Cramped on the 7-col right column; cards lose editorial weight |
| Tabs (Map XOR List) | Clean, but you can't read about a hospital while seeing where it is |
| **Map above + cards below + toggle** | Both views available; toggle handles "I just want the map" cases; preserves editorial layout |

## Map library: Leaflet + CartoDB Positron tiles

- **Leaflet** (`react-leaflet` + `leaflet`) — lightweight (~40kb), no API key, free forever, MIT licensed.
- **CartoDB Positron tile layer** — clean black/white/light-gray tiles that match the WIRED grayscale aesthetic perfectly. Free, no token. (Default OSM tiles would clash — too colorful.)
- Avoids Mapbox/Google overhead (API keys, billing, attribution clutter, color palette fights).

Bundle impact: ~50kb gzipped total — acceptable for a feature this central.

## WIRED-styled markers

Markers will visually echo the numbered cards below — same "Most Popular" numerical treatment:

- **Default marker**: 28×28px square (no radius), 2px black border, paper-white fill, black mono number `01`, `02`, `03`…
- **Hover/active marker**: inverts to black fill, white number.
- Numbers match the card index, so users instantly map "marker 03" → "card 03".

A small marker for the **resolved query location** (the city/PIN the user mentioned) will be a black circle with a white center dot — visually distinct from facility markers, anchoring the search context.

## Marker popup (on click)

Small popup, WIRED-styled (square corners, hairline border, mono kicker):

```
CAPABILITY · HIGH
Patna Medical College Hospital
Trust 84/100  ·  4.2 KM AWAY
[ View Full Audit ]   ← opens existing FacilityDetailsDialog
```

## Hover sync (subtle, not distracting)

- Hovering a **card** → its marker on the map inverts (black fill).
- Hovering a **marker** → its card gets a 2px left border accent (`border-l-link`) to draw the eye, no scroll-jump.
- Clicking a marker's "View Full Audit" or a card's "View Full Audit" both open the same existing audit dialog — no duplicate UI.

## Auto-fit behavior

- On new results, `map.fitBounds()` to all facility coordinates + the resolved query center, with sensible padding. So whether the user asked about Mumbai or Patna, the map always frames the right region.
- If a facility has no coordinates, it's still in the card list but skipped on the map (silently — the card list is the source of truth).
- If **no** facilities have coordinates (rare), the map panel is hidden and only the card list renders. No empty map.

## Files to add / change

**Add:**
- `src/components/FacilitiesMap.tsx` — Leaflet map component, accepts `facilities`, `centerHint` (resolved lat/lng), and optional `activeId` + `onMarkerHover/onMarkerClick` callbacks.

**Change:**
- `src/routes/index.tsx` — In the results column, add a `Map · List · Both` toggle next to the "Facilities" ribbon count, render `<FacilitiesMap />` above the cards when view ≠ "list". Pass shared `activeId` state down to both map and cards for hover sync.
- `src/components/FacilityCard.tsx` — Add optional `onHover` / `isActive` props for the hover-sync accent (a thin `border-l-2 border-link` when active). No structural change to the card.
- `src/routes/api/ask-caremap.ts` — Tiny addition: also return the resolved `center { lat, lng }` from `resolveCenter()` in the API response, so the map can place the query-location marker. (Currently `center` is computed but only used internally for sorting.)
- `src/styles.css` — A small block of overrides for Leaflet's default popup chrome so it matches WIRED (square corners, 2px black border, no shadow, mono kicker font). Leaflet ships its own CSS that we'll import once and then override.
- `package.json` — Add `leaflet` + `react-leaflet` + `@types/leaflet`.

## Responsive behavior

- **Desktop (≥1024px)**: Map ~400px tall above cards.
- **Tablet (768–1023px)**: Map ~340px tall above cards.
- **Mobile (<768px)**: Map ~280px tall, toggle defaults to **List** (map is one tap away via the toggle, but doesn't dominate the small screen).

## Things explicitly NOT in this change

- No clustering (with ≤5 facilities returned per query, clustering adds complexity for no visual gain).
- No directions/routing (out of scope; the audit dialog already covers "act on this facility").
- No map for the planner/NGO dashboard tab — this change is scoped to the Patient · Health Worker tab. The dashboard can get its own map later.
- No geolocation prompt ("use my location") — out of scope; the chat flow already collects a location, which is the source of truth.

## Open question (optional)

Default view = **Both**, or default to **Map** since you mentioned wanting it as the main view? My recommendation is **Both** so first-time users see the editorial card detail immediately and discover the map naturally. Easy to flip to "Map" default if you'd rather lead with geography. Let me know — otherwise I'll ship with **Both** as default.
