"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { PrefetchKind } from "next/dist/client/components/router-reducer/router-reducer-types";
import { MODULES } from "@/lib/modules";

const ROUTES = Object.values(MODULES).flatMap((m) => m.tabs.map((t) => t.href));
// Fetch the whole screen (data included), not just its loading state.
const FULL = "full" as PrefetchKind;

/**
 * Loads every module and tab in the background as soon as the app opens, so
 * switching is instant. When saved changes make a prefetch stale, it's fetched again.
 */
export function Prefetcher() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    const prefetch = (href: string) =>
      router.prefetch(href, {
        kind: FULL,
        onInvalidate: () => {
          if (!cancelled) prefetch(href);
        },
      });
    // Let the current screen finish first.
    const t = setTimeout(() => ROUTES.forEach(prefetch), 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [router]);

  return null;
}
