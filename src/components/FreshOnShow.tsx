"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Shows a prefetched screen instantly, then refreshes it in the background if
 * it was rendered more than a moment ago (e.g. before you logged an activity).
 */
export function FreshOnShow({ renderedAt, maxAgeMs = 2000 }: { renderedAt: number; maxAgeMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    if (Date.now() - renderedAt > maxAgeMs) router.refresh();
  }, [renderedAt, maxAgeMs, router]);
  return null;
}
