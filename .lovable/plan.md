## Problem

When opening the **CareMap Audit Report** dialog, the page's Leaflet map (markers `01–05`, zoom controls, and tile layer) bleeds through the dialog overlay and visually overlaps the dialog header, trust score, and capabilities sections.

## Root Cause

**Z-index conflict between Leaflet and shadcn Dialog:**

- `shadcn/ui` Dialog overlay & content use `z-50` (z-index: 50).
- Leaflet assigns very high z-indexes to its internal panes by default:
  - `.leaflet-pane` → 400
  - `.leaflet-marker-pane` → 600
  - `.leaflet-tooltip-pane` → 650
  - `.leaflet-popup-pane` → 700
  - `.leaflet-control` (zoom, attribution) → 800+

Since 400–800 ≫ 50, the map's markers and controls render *above* the dialog overlay, even though the dialog content is correctly portaled.

## Fix

Add a single CSS scope override in `src/styles.css` to clamp Leaflet's internal stacking below the dialog layer (`z-50` = 50). The map container itself gets `z-0`, and all internal panes/controls are reset to small values that stay well below the modal.

```css
/* Keep Leaflet below shadcn Dialog (z-50) and other portaled overlays. */
.leaflet-container { z-index: 0; }
.leaflet-pane,
.leaflet-top,
.leaflet-bottom { z-index: auto !important; }
.leaflet-control { z-index: 1 !important; }
```

This preserves Leaflet's *internal* relative stacking (markers still sit above tiles, popups above markers) because the panes still respect their natural DOM order — we only collapse the absolute z-index values so they can't escape the modal's stacking context.

## Files to Edit

- **`src/styles.css`** — append the Leaflet z-index clamp near the existing `.leaflet-container` block (around line 217).

## Verification

1. Open a search result → click "View Full Audit" on a card.
2. Dialog opens with the dark overlay covering the map cleanly.
3. No `01/02/03` markers, zoom +/−, or "Leaflet | © OSM © CARTO" attribution visible over the dialog.
4. Closing the dialog returns the map to fully interactive state.

No component logic, no dependency, no layout changes — pure CSS fix.