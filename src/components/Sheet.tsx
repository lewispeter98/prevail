"use client";

import { useEffect, type ReactNode } from "react";

/** A bottom sheet. Tap outside or press Escape to close. */
export function Sheet({ onClose, label, children }: { onClose: () => void; label: string; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-[rgba(28,23,20,.45)]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="max-h-[90dvh] w-full max-w-[440px] overflow-y-auto rounded-t-3xl bg-bg px-5 pt-2.5"
        style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom, 0px))" }}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded bg-line" />
        {children}
      </div>
    </div>
  );
}
