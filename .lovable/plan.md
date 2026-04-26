## Problem

Map markers don't respond to clicks (single marker click does nothing; numbered markers don't open popups or zoom). The previous z-index fix set `.leaflet-pane { z-index: auto !important }`, which collapses Leaflet's internal pane stacking — the overlay pane ends up swallowing pointer events meant for markers.

## Fix

Replace the pane override with `isolation: isolate` on `.leaflet-container`. This creates a new stacking context, so Leaflet's internal z-indexes (markers 600, popups 700, controls 800) stay scoped inside the map and can never escape above the shadcn Dialog's `z-50` overlay — while preserving the natural pane order that makes markers clickable.

## Edit

**`src/styles.css`** (lines 217–227): replace the current `.leaflet-container` block + pane/control overrides with:

```css
.leaflet-container {
  font-family: var(--font-serif);
  background: var(--color-paper);
  z-index: 0;
  isolation: isolate;
}
```

Remove the `.leaflet-pane`, `.leaflet-top`, `.leaflet-bottom`, and `.leaflet-control` z-index overrides — `isolation: isolate` handles containment without breaking marker hit-testing.

## Verification

1. Click a numbered marker → popup opens with facility details.
2. Single-result map → marker is clickable.
3. Open "View Full Audit" → dialog still cleanly covers map (no markers/controls bleeding through).