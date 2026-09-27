import Link from "next/link";
import { Suspense } from "react";
import { greeting, longDay, today } from "@/lib/day";
import { MODULES, type ModuleKey } from "@/lib/modules";
import { ModuleTabs } from "./ModuleTabs";
import { StreakStrip } from "./StreakStrip";
import { SettingsIcon } from "./icons";

export function ModuleHeader({ module: key }: { module: ModuleKey }) {
  const config = MODULES[key];
  const title = key === "journal" ? greeting() : config.label;
  return (
    <header>
      <div className="flex items-center justify-between gap-3">
        <span className="font-serif text-[22px] font-semibold tracking-[0.01em]">
          Prevail<span className="text-camel">.</span>
        </span>
        <Link
          href={`/${key}/settings`}
          aria-label={`${config.label} settings, import and export`}
          className="grid size-[38px] place-items-center rounded-full border border-line bg-surface text-muted"
        >
          <SettingsIcon width={18} height={18} />
        </Link>
      </div>
      <div className="mt-[18px]">
        <div className="label">{longDay(today())}</div>
        <h1 className="mt-1 font-serif text-[40px] leading-[1.05] font-medium text-balance">{title}</h1>
      </div>
      <Suspense fallback={<div className="mt-4 h-[58px]" />}>
        <StreakStrip module={config} />
      </Suspense>
      <ModuleTabs tabs={config.tabs} />
    </header>
  );
}
