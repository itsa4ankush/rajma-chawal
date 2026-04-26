import { lazy, Suspense, useEffect, useState } from "react";
import type { ComponentProps } from "react";
import type { FacilitiesMap as FacilitiesMapType } from "./FacilitiesMap";

// Leaflet touches `window` at import time, which breaks SSR. Load the real
// map module only in the browser.
const LazyMap = lazy(() =>
  import("./FacilitiesMap").then((m) => ({ default: m.FacilitiesMap })),
);

type Props = ComponentProps<typeof FacilitiesMapType>;

export function FacilitiesMapClient(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className="rounded-2xl border border-hairline bg-card shadow-[var(--shadow-clay)]"
        style={{ height: props.height ?? 400 }}
      />
    );
  }

  return (
    <Suspense
      fallback={
        <div
          className="rounded-2xl border border-hairline bg-card shadow-[var(--shadow-clay)]"
          style={{ height: props.height ?? 400 }}
        />
      }
    >
      <LazyMap {...props} />
    </Suspense>
  );
}
