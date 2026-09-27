"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ModuleTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="mt-[18px] flex gap-1 rounded-full bg-pill p-1" aria-label="Sections">
      {tabs.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={`flex-1 rounded-full px-1.5 py-[9px] text-center text-[13.5px] ${
              active ? "bg-surface font-semibold text-ink shadow-[0_1px_2px_rgba(43,33,27,.08)]" : "font-medium text-muted"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
