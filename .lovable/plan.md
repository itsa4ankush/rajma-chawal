# Wire Ask CareMap UI to the LLM intent route

## Current state

The previous turn was interrupted, but most of the work is already in place:

- ✅ `src/routes/api/ask-caremap.ts` — fully implemented: LLM intent parser (Lovable AI Gateway, `google/gemini-3-flash-preview`, structured tool-calling), 9-need capability mapping, Databricks query, top-5 by trust score, returns `{ understoodNeed, urgency, userExplanation, safetyMessage, dataLimitation, dataSourceError, facilities }`.
- ✅ `src/lib/facilities.ts` — `MedicalNeed` already extended to all 9 values, `facilityMatchesNeed` updated.
- ✅ `src/components/FacilityCard.tsx` — `NEED_TO_FIELD` already covers all 9 needs.
- ✅ Secrets `LOVABLE_API_KEY`, `DATABRICKS_API_KEY`, `DATABRICKS_WAREHOUSE_ID` are configured.

What's NOT done: the frontend (`ChatPanel.tsx`, `index.tsx`) still calls the old regex-parser path `/api/search-facilities` and never displays the LLM's safety message, urgency, or data limitation. That's the gap this plan closes.

## Changes

### 1. `src/components/ChatPanel.tsx` — call the LLM endpoint

- Remove the regex `parseQuery` helper and the `knownStates` fetch — no longer needed.
- Replace the `/api/search-facilities` call with `POST /api/ask-caremap` sending `{ message }` (state/city/pinCode left optional for now since the UI doesn't expose them in this tab).
- Update `EXAMPLES` to natural-language prompts that match the new parser:
  - "I was bitten by a dog, what hospitals are nearby?"
  - "My father has chest pain"
  - "Newborn baby is not breathing properly"
  - "Need dialysis near Patna"
- Extend `ChatPanelProps.onResults` callback signature to also pass the parsed intent fields:
  ```ts
  onResults?(facilities, selectedNeed, source, intent?: {
    understoodNeed: string;
    urgency: "emergency" | "urgent" | "routine";
    userExplanation: string;
    safetyMessage: string;
    dataLimitation: string;
  })
  ```
- Bot reply bubble shows a short confirmation: `**Understood:** {understoodNeed} · _{urgency}_` followed by the safety message and "Showing N facilities on the right →". The richer rendering lives in the right pane.
- On HTTP error from `/api/ask-caremap` (LLM down, Databricks down, etc.), show an error bubble — do NOT fall back to demo data through the LLM path. (Demo fallback would require re-implementing intent parsing client-side, which defeats the purpose. A clear error is better.)

### 2. `src/routes/index.tsx` — render intent on the right pane

- Add state for `intent` (the parsed LLM result) alongside existing `results` / `selectedNeed` / `dataSource`.
- Above the facility grid, render an "Understood as" panel when `intent` is set:
  - **Urgency badge** — color-coded: emergency = destructive, urgent = warning, routine = muted.
  - **Understood need** chip (e.g. "Vaccination / Post-exposure Care").
  - **Safety message** in a prominent alert (uses existing `Alert` component from shadcn).
  - **User explanation** as supporting text.
  - **Data limitation** alert when `intent.dataLimitation` is non-empty (shown for the Vaccination need where the dataset can't confirm vaccine stock).
- Keep the existing skeleton loading state, "ask a question" empty state, and "no matches" empty state.
- Keep the `FacilityCard` grid for results — `selectedNeed` will now be the LLM's `understoodNeed` so the card highlights the right capability.

### 3. No changes required elsewhere

- `src/routes/api/search-facilities.ts` stays as-is (still used by the Planner dashboard and remains a valid endpoint).
- `src/lib/facilities.ts`, `FacilityCard.tsx`, `routeTree.gen.ts` already updated.

## Safety behavior preserved

The LLM never invents hospital names — facility list only comes from Databricks. The system prompt in `ask-caremap.ts` already forbids diagnosis / medication / "wait" advice and forces emergency-style safety messaging for severe symptoms. The frontend just surfaces what the backend returns.

## Files touched

- `src/components/ChatPanel.tsx` (refactor)
- `src/routes/index.tsx` (render intent panel + safety alert)
