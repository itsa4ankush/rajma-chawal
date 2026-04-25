## Goal
Restructure the **Patient / Health Worker** tab into a two-pane chat-driven search experience, and remove the now-redundant **Ask CareMap** tab.

## Final tab structure
1. **Patient / Health Worker** — chat (left) + facility results (right)
2. **NGO / Planner** — unchanged

## Layout (Patient / Health Worker tab)

Two-column responsive grid:
- **Left pane (≈40% width on `lg`, full width stacked on mobile)**: `ChatPanel` — same parsing + `/api/search-facilities` logic it has today, including the demo-data fallback and disclaimer messaging.
- **Right pane (≈60% width on `lg`)**: facility result cards (`FacilityCard` grid) + the existing "Live Databricks data / Demo data" badge and any fallback alerts.

On screens narrower than `lg`, the chat stacks above the results pane.

## Behavioral changes

**Removed from this tab**
- State / City / Medical Need `Select` dropdowns
- Search button + `runSearch` form
- `state`, `city`, `need`, `locationsLoading`, `citiesByState`, `cityOptions`, `runSearch`, `runDemoSearch`, location-fetch `useEffect` — all unused once filters are gone
- Imports for `Label`, `Select*`, `Search` icon, `INDIAN_STATES`, `MEDICAL_NEEDS`, `facilityMatchesNeed`, `Input`

**Removed entirely**
- The `chat` tab (`<TabsTrigger value="chat">` and its `<TabsContent>`)
- `TabsList` becomes `grid-cols-2`

**Chat ↔ results wiring**
- `ChatPanel` is refactored to **lift its result state up** via two new optional props:
  - `onResults?: (facilities: Facility[], selectedNeed: MedicalNeed | "", source: "live" | "demo") => void`
  - `onSearchStart?: () => void`
- Inside `ChatPanel`, after each successful (or fallback) query, call `onResults(...)` with the **full** facility list (not just top 3) so the right pane can show all matches.
- The chat bubbles **no longer render `FacilityCard`s inline**. They keep the conversational text + disclaimer only ("Top N facilities for X — see results on the right →" type wording). The `BotMessage.facilities` field and the inline grid in `ChatPanel` are removed.
- Existing example chips, parsing, "Searching Databricks…" loader, and demo fallback messaging remain.

**Right pane states**
- **Initial** (no query yet): friendly empty-state card — "Ask a question on the left to see matching facilities here." (per your answer).
- **Loading**: same skeleton grid currently used during search.
- **Results**: `FacilityCard` grid (2 cols on `md+`, 1 on mobile within the right pane). `selectedNeed` comes from the chat's parsed need.
- **Empty** (query returned 0): "No matching facilities for that question."
- **Source badge**: keep the existing "Live Databricks data" / "Demo data" pill above the grid; drive it from the `source` value the chat passes up.
- **Multi-query**: each new question **replaces** the right pane (no accumulation).

## Files to change

1. **`src/routes/index.tsx`**
   - Remove dropdown form, related state/handlers/imports.
   - Change `TabsList` to `grid-cols-2`; remove the `chat` `TabsTrigger` + `TabsContent`.
   - Replace the `search` `TabsContent` body with a `grid lg:grid-cols-5` layout: `ChatPanel` (`lg:col-span-2`) on the left, results section (`lg:col-span-3`) on the right.
   - Hold `chatResults`, `chatNeed`, `chatSource`, `chatLoading` state at this level; pass `onSearchStart` / `onResults` into `ChatPanel`; render the right pane from this state.

2. **`src/components/ChatPanel.tsx`**
   - Add optional `onResults` and `onSearchStart` props.
   - Drop the inline `FacilityCard` rendering and the `facilities` field on `BotMessage` (chat bubbles become text-only).
   - On every send: call `onSearchStart()` before the fetch; call `onResults(facilities, need, "live" | "demo")` after.
   - Update the bot reply text to point users to the right pane (e.g. "Found N facilities for **ICU + Oxygen** in **Bihar** — showing them on the right.").
   - Remove the now-unused `FacilityCard` import.

3. *(No changes)* `src/components/FacilityCard.tsx`, API routes, `PlannerDashboard`, `DatabricksStatusCard`.

## Acceptance check
- Patient / Health Worker tab shows chat on the left, empty-state card on the right initially.
- Asking "ICU in Maharashtra" populates the right pane with `FacilityCard`s and a Live/Demo badge; chat shows a short text confirmation only.
- Asking a second question fully replaces the right-pane results.
- Only two tabs are visible; `Ask CareMap` is gone.
- On mobile, chat stacks above results; nothing overflows.
