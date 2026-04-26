## Goal
When a user asks Ask CareMap about facilities without including a location, the bot should ask for one before searching. Once a location is provided, results should be sorted by proximity to that location.

## 1. Backend — extend LLM intent parser to extract & require location

**`src/routes/api/ask-caremap.ts`**

- Extend the LLM tool schema (`parse_medical_intent`) with new fields:
  - `locationMentioned: boolean` — true if the user named any place (city, state, area, PIN).
  - `extractedState: string | null` — canonical Indian state if detectable (e.g. "Bihar").
  - `extractedCity: string | null` — city/town if detectable (e.g. "Patna").
  - `extractedPinCode: string | null` — 6-digit PIN if present.
- Update `SYSTEM_PROMPT` so the LLM:
  - Recognizes Indian states, major cities, and 6-digit PINs in the user message.
  - Sets `locationMentioned=false` only when nothing place-like is mentioned.
- After parsing, in the POST handler:
  - Merge location: prefer values from `body.state/city/pinCode` (sent from prior turn or context); otherwise use the LLM-extracted ones.
  - If the **final merged location is empty** (no state, city, or PIN from either source), short-circuit BEFORE querying Databricks and return:
    ```json
    {
      "needsLocation": true,
      "understoodNeed": "...",
      "urgency": "...",
      "userExplanation": "...",
      "safetyMessage": "...",
      "promptForLocation": "To find the nearest facilities, please share your location — a city, district, state, or 6-digit PIN code works.",
      "facilities": []
    }
    ```
  - Otherwise proceed with the Databricks query as today, passing the resolved state/city/pinCode.

## 2. Backend — proximity sorting

**`src/routes/api/ask-caremap.ts` (`searchFacilities`)**

- If a PIN code was provided, geocode it to a center point by querying Databricks first for `latitude, longitude` of any facility matching that PIN; fallback to the city/state centroid via averaging matching rows.
- If only city/state is provided, compute the centroid by averaging `latitude/longitude` of facilities in that city (or state) in a small preliminary query (`LIMIT 50`).
- Update the main query to compute Haversine distance directly in SQL and sort by it instead of (or in addition to) trust score:
  ```sql
  SELECT ..., 
    (6371 * acos(
      cos(radians(:lat)) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(:lng)) +
      sin(radians(:lat)) * sin(radians(latitude))
    )) AS distance_km
  FROM ...
  WHERE ... AND latitude IS NOT NULL AND longitude IS NOT NULL
  ORDER BY distance_km ASC, trust_score DESC
  LIMIT 5
  ```
- Widen the `WHERE` slightly when sorting by distance — keep the state filter but drop the strict city filter so genuinely closer facilities in neighboring cities can surface (configurable: keep city filter if PIN/city explicitly given AND ≥5 matches exist; otherwise broaden to state).
- Include `distance_km` in the returned facility object so the UI can show "X km away".
- If lat/lng resolution fails entirely, fall back to the current trust-score sort (no regression).

## 3. Frontend — conversational location follow-up

**`src/components/ChatPanel.tsx`**

- Extend `ParsedIntent` and the response handling to recognize the new `needsLocation: true` response and a new `pendingIntent` state on the component:
  - When `needsLocation` is true:
    - Render the bot reply containing `safetyMessage` (if any) and the `promptForLocation` text.
    - Do NOT call `onResults` with empty results / do NOT clear the right pane — keep prior results/intent in place, and show a "Waiting for your location…" pill in the chat header area.
    - Store the original `message` and parsed `intent` in `pendingIntent` state.
  - On the next user message while `pendingIntent` is set:
    - POST to `/api/ask-caremap` with `{ message: originalMessage, state/city/pinCode: parsedFromNewMessage }`.
    - Use a tiny client-side parser (regex for 6-digit PIN; match against `OFFICIAL_STATE_NAMES` from `src/lib/location-normalization.ts`; treat the rest as `city`) to split the user's location reply into state/city/pinCode fields.
    - Clear `pendingIntent` once a successful search returns.
- Add 1–2 example "location" suggestion chips that appear only when awaiting location (e.g. "Patna, Bihar", "800001").

## 4. Frontend — show distance on facility cards

**`src/components/FacilityCard.tsx`**

- If `facility.distance_km` is present, render a small badge ("4.2 km away") next to the city/state line.
- No layout change otherwise.

**`src/lib/facilities.ts`**

- Add optional `distance_km?: number` to the `Facility` type so TS stays happy across the API → card flow.

## 5. Edge cases & safety

- Emergencies: still surface the LLM's `safetyMessage` (call emergency services) BEFORE asking for location, in the same bot bubble — never delay safety guidance behind a location prompt.
- If the user replies with something that doesn't look like a location, the chat asks once more (max 1 retry), then proceeds with state-only fallback if any state was detectable, otherwise tells the user we couldn't resolve a location and to try again with a city or PIN.
- Validation: ignore non-Indian PINs / >1000 char replies (already enforced).

## Files touched
- `src/routes/api/ask-caremap.ts` — schema, location extraction, gating, Haversine sort.
- `src/components/ChatPanel.tsx` — pending-location flow, client-side location parsing.
- `src/components/FacilityCard.tsx` — distance badge.
- `src/lib/facilities.ts` — `distance_km?` on `Facility`.
- `src/routes/index.tsx` — minor: keep prior results visible while awaiting location (small tweak to `onResults` callback contract; no visual redesign).