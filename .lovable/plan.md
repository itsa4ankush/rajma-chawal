## Plan

Fix the Patient / Health Worker tab so filtered searches return facilities consistently and clearly show whether the data is live or demo.

### What I will change

1. Repair the live search API
- Update `/api/search-facilities` to stop selecting Databricks columns that do not exist in the table.
- The current failure is caused by `recommendation_reason`, which Databricks returns as an unresolved column error.
- Keep the response shape the frontend already expects by deriving a safe fallback recommendation reason in the route when the source column is missing.

2. Make the Patient search fallback behave clearly
- Keep the app from crashing when live search fails.
- Ensure the search UI shows a visible message that live Databricks is unavailable when it falls back.
- Preserve the existing “Demo data” label so users can tell the result source immediately.

3. Verify result rendering stays compatible with the existing cards
- Keep the same `FacilityCard` UI.
- Confirm each card still receives the fields it needs: facility name, city/state, PIN, selected-need capability, trust score, warning, recommendation reason, and View Details.

4. Tighten the no-results experience
- Make sure the empty state only appears for true zero-result searches, not for backend query failures that should be handled as demo fallback or surfaced as an error.

### Why this is happening

The Patient / Health Worker tab posts to `/api/search-facilities`, and the current network snapshot shows repeated `502` responses from Databricks. The query is still requesting `recommendation_reason`, which does not exist in the Databricks table. Because the live call fails, the tab falls back to local demo data. That demo dataset only covers a small subset of states/cities, so many dropdown selections still show zero results. The chatbot seems better only because it is already relying on that fallback path and the user likely asked about locations that happen to exist in demo data.

### Technical details

- File to update: `src/routes/api/search-facilities.ts`
- Remove or replace invalid selected columns from the SQL statement.
- In `rowsToFacilities`, populate `recommendation_reason` from available fields when present, otherwise use a deterministic fallback message based on trust score/capability.
- Keep frontend logic in `src/routes/index.tsx` largely intact, with only small messaging adjustments if needed.
- Do not edit `src/routeTree.gen.ts` manually.

### Expected outcome

- Searches from the Patient / Health Worker tab return live Databricks results again.
- If Databricks is down, the UI still works and clearly says live data is unavailable.
- Users can distinguish live results from demo results at all times.