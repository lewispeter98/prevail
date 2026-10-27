"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const KEY = "prevail:launched";

/**
 * A home-screen app on iPhone reopens whichever page it was added from, not the
 * app's start page. So when Prevail is launched from the home screen, go to
 * Time once per launch. Navigating inside the app is never affected, and
 * neither is opening it in a normal browser tab.
 */
export function LaunchToTime() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (!standalone) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch {
      return;
    }
    if (pathname !== "/time") router.replace("/time");
    // Only on the first render of a launch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
