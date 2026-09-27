"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced save. Call `schedule()` after every change; the latest values are
 * saved once typing pauses, on blur via `flush()`, and before the page unloads.
 */
export function useAutosave(save: () => Promise<{ ok: boolean }>, delay = 800) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef(save);
  const dirty = useRef(false);

  useEffect(() => {
    saveRef.current = save;
  });

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (!dirty.current) return;
    dirty.current = false;
    setStatus("saving");
    try {
      const res = await saveRef.current();
      setStatus(res.ok ? "saved" : "error");
    } catch {
      setStatus("error");
    }
  }, []);

  const schedule = useCallback(() => {
    dirty.current = true;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  }, [delay, flush]);

  useEffect(() => {
    const onHide = () => void flush();
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("pagehide", onHide);
      void flush();
    };
  }, [flush]);

  return { status, schedule, flush };
}

export const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: "",
  saving: "Saving…",
  saved: "Saved",
  error: "Not saved. Check your connection.",
};
