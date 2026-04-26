import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Facility, MedicalNeed } from "@/lib/facilities";

/**
 * WIRED-styled facility map.
 * - CartoDB Positron tiles (clean B&W, matches editorial palette).
 * - Square numbered markers echoing the card numerals (01, 02, 03…).
 * - Active marker inverts (black fill, white number).
 * - Auto-fits bounds to all facilities + the resolved query center.
 */

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

function makeNumberedIcon(index: number, active: boolean): L.DivIcon {
  const num = String(index).padStart(2, "0");
  const bg = active ? "#000000" : "#ffffff";
  const fg = active ? "#ffffff" : "#000000";
  return L.divIcon({
    className: "caremap-marker",
    html: `<div style="
      width:30px;height:30px;
      background:${bg};
      color:${fg};
      border:1px solid #000;
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-family:'Space Mono',ui-monospace,Menlo,monospace;
      font-weight:700;font-size:12px;letter-spacing:0.04em;
      box-sizing:border-box;
      box-shadow:0 1px 2px rgba(0,0,0,0.15);
    ">${num}</div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    popupAnchor: [0, -16],
  });
}

function makeCenterIcon(): L.DivIcon {
  return L.divIcon({
    className: "caremap-center-marker",
    html: `<div style="
      width:18px;height:18px;
      background:#000;
      border:2px solid #fff;
      box-shadow:0 0 0 2px #000;
      display:flex;align-items:center;justify-content:center;
      box-sizing:border-box;
      border-radius:50%;
    "><div style="width:4px;height:4px;background:#fff;border-radius:50%;"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export interface FacilitiesMapProps {
  facilities: Facility[];
  selectedNeed?: MedicalNeed | "";
  centerHint?: { lat: number; lng: number } | null;
  activeId?: string | null;
  onMarkerHover?: (id: string | null) => void;
  onMarkerClick?: (id: string) => void;
  height?: number;
}

export function FacilitiesMap({
  facilities,
  centerHint,
  activeId,
  onMarkerHover,
  onMarkerClick,
  height = 400,
}: FacilitiesMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerLayerRef = useRef<L.LayerGroup | null>(null);
  const markersById = useRef<Map<string, L.Marker>>(new Map());

  // Filter to facilities with valid coordinates.
  const placed = useMemo(
    () =>
      facilities
        .map((f, i) => ({ f, index: i + 1 }))
        .filter(
          ({ f }) =>
            Number.isFinite(f.latitude) &&
            Number.isFinite(f.longitude) &&
            !(f.latitude === 0 && f.longitude === 0),
        ),
    [facilities],
  );

  // Init map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, {
      zoomControl: true,
      scrollWheelZoom: false,
      attributionControl: true,
      // India default view
      center: [22.0, 79.0],
      zoom: 5,
    });
    L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map);
    mapRef.current = map;
    markerLayerRef.current = L.layerGroup().addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markerLayerRef.current = null;
      markersById.current.clear();
    };
  }, []);

  // Render markers when facilities or centerHint change.
  useEffect(() => {
    const map = mapRef.current;
    const layer = markerLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    markersById.current.clear();

    // Facility markers
    placed.forEach(({ f, index }) => {
      const marker = L.marker([f.latitude, f.longitude], {
        icon: makeNumberedIcon(index, f.id === activeId),
        riseOnHover: true,
      });

      const trustText = `${f.trust_score}/100`;
      const distText =
        typeof f.distance_km === "number" && Number.isFinite(f.distance_km)
          ? f.distance_km < 1
            ? `${Math.round(f.distance_km * 1000)} m away`
            : `${f.distance_km.toFixed(1)} km away`
          : "";
      const cap = f.matchedCapability || "";

      const popupHtml = `
        <div style="font-family:'Source Serif 4',Georgia,serif;min-width:200px;">
          <div style="font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.1em;font-size:10px;font-weight:700;color:#757575;margin-bottom:6px;">
            ${String(index).padStart(2, "0")} · ${cap || "Facility"}
          </div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-weight:900;font-size:16px;line-height:1.15;color:#000;margin-bottom:6px;">
            ${escapeHtml(f.name)}
          </div>
          <div style="font-size:13px;color:#1a1a1a;margin-bottom:8px;">
            ${escapeHtml(f.address_city)}, ${escapeHtml(f.address_stateOrRegion)}
          </div>
          <div style="display:flex;gap:8px;align-items:center;font-family:'JetBrains Mono',monospace;text-transform:uppercase;letter-spacing:0.08em;font-size:10px;font-weight:700;color:#000;border-top:1px solid #e2e8f0;padding-top:6px;">
            <span>Trust ${trustText}</span>
            ${distText ? `<span style="color:#757575;">·</span><span>${distText}</span>` : ""}
          </div>
          <button data-caremap-open="${escapeHtml(f.id)}" style="
            margin-top:10px;width:100%;
            font-family:'Space Mono',ui-monospace,Menlo,monospace;text-transform:uppercase;letter-spacing:0.08em;
            font-size:11px;font-weight:700;
            background:#000;color:#fff;border:1px solid #000;border-radius:8px;
            padding:6px 10px;cursor:pointer;
          ">View Full Audit</button>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        closeButton: true,
        autoPan: true,
        className: "caremap-popup",
      });

      marker.on("mouseover", () => onMarkerHover?.(f.id));
      marker.on("mouseout", () => onMarkerHover?.(null));
      marker.on("popupopen", () => {
        // Wire up "View Full Audit" button inside popup
        const root = (marker.getPopup()?.getElement() as HTMLElement | undefined) ?? null;
        const btn = root?.querySelector<HTMLButtonElement>(
          `[data-caremap-open="${cssEscape(f.id)}"]`,
        );
        btn?.addEventListener("click", () => {
          onMarkerClick?.(f.id);
          marker.closePopup();
        });
      });

      marker.addTo(layer);
      markersById.current.set(f.id, marker);
    });

    // Center hint marker
    if (centerHint && Number.isFinite(centerHint.lat) && Number.isFinite(centerHint.lng)) {
      const cm = L.marker([centerHint.lat, centerHint.lng], {
        icon: makeCenterIcon(),
        interactive: false,
        keyboard: false,
      });
      cm.addTo(layer);
    }

    // Fit bounds
    const points: L.LatLngExpression[] = placed.map(({ f }) => [f.latitude, f.longitude]);
    if (centerHint) points.push([centerHint.lat, centerHint.lng]);
    if (points.length === 1) {
      map.setView(points[0] as L.LatLngTuple, 12, { animate: true });
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points as L.LatLngTuple[]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13, animate: true });
    }
    // Force size recalc in case container just appeared.
    setTimeout(() => map.invalidateSize(), 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placed, centerHint?.lat, centerHint?.lng]);

  // Update active marker styling without re-rendering all markers.
  useEffect(() => {
    placed.forEach(({ f, index }) => {
      const marker = markersById.current.get(f.id);
      if (!marker) return;
      marker.setIcon(makeNumberedIcon(index, f.id === activeId));
      if (f.id === activeId) marker.setZIndexOffset(1000);
      else marker.setZIndexOffset(0);
    });
  }, [activeId, placed]);

  if (placed.length === 0) {
    return (
      <div
        className="rounded-2xl border border-hairline bg-card flex items-center justify-center shadow-[var(--shadow-clay)]"
        style={{ height }}
      >
        <div className="text-center px-6">
          <span className="font-mono uppercase tracking-[0.1em] text-[10px] font-bold text-caption">
            Map Unavailable
          </span>
          <p className="mt-2 text-sm text-page-ink">
            No coordinates for these facilities.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="rounded-2xl border border-hairline bg-card overflow-hidden shadow-[var(--shadow-clay)]"
      style={{ height, width: "100%" }}
      aria-label="Map of matching facilities"
      role="application"
    />
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function cssEscape(s: string): string {
  return s.replace(/(["\\])/g, "\\$1");
}
