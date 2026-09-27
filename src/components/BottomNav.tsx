"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GoalsIcon, JournalIcon, WeightIcon } from "./icons";

const ITEMS = [
  { href: "/weight", label: "Weight", Icon: WeightIcon },
  { href: "/goals", label: "Goals", Icon: GoalsIcon },
  { href: "/journal", label: "Journal", Icon: JournalIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/90 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <div className="mx-auto grid max-w-[440px] grid-cols-3">
        {ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative flex flex-col items-center gap-[3px] pt-2.5 pb-3 text-[11px] font-semibold uppercase tracking-[0.1em] ${
                active ? "text-ink" : "text-faint"
              }`}
            >
              {active && <span className="absolute top-0 h-0.5 w-[22px] rounded-sm bg-camel" />}
              <Icon width={22} height={22} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
