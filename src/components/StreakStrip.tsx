import { getStreaks } from "@/lib/streaks";
import type { ModuleConfig } from "@/lib/modules";
import { Crest } from "./Crest";
import { JournalIcon, ScriptIcon, WeightIcon } from "./icons";

const ICONS = { weight: WeightIcon, script: ScriptIcon, journal: JournalIcon };

/** The super streak plus this module's own streak. */
export async function StreakStrip({ module }: { module: ModuleConfig }) {
  const streaks = await getStreaks();
  const sup = streaks.super;
  const own = streaks[module.streak];
  const Icon = ICONS[module.streak];

  return (
    <div className="mt-4 flex gap-2">
      <div
        className={`flex flex-1 items-center gap-2.5 rounded-[14px] border py-2 pr-3 pl-2 ${
          sup.doneToday ? "super-lit border-transparent bg-green text-on-green" : "border-line bg-surface"
        }`}
        aria-label={`Super streak: ${sup.count} days${sup.doneToday ? "" : ", not complete today"}`}
      >
        <span className={sup.doneToday ? "" : "opacity-55 grayscale-50"}>
          <Crest size={40} />
        </span>
        <div>
          <div className={`num text-2xl leading-none font-semibold ${sup.doneToday ? "text-brass-light" : ""}`}>
            {sup.count}
          </div>
          <small
            className={`mt-[3px] block text-[10px] font-semibold uppercase tracking-[0.12em] ${
              sup.doneToday ? "text-brass" : "text-muted"
            }`}
          >
            {sup.doneToday ? "Super streak" : "Super · at risk"}
          </small>
        </div>
      </div>

      <div
        className="flex flex-1 items-center gap-3 rounded-[14px] border border-line bg-surface px-3.5 py-2"
        aria-label={`${module.streakLabel}: ${own.count} days${own.doneToday ? "" : ", not done today"}`}
      >
        <Icon width={24} height={24} className={own.doneToday ? "text-green-ink" : "text-muted"} />
        <div>
          <div className="num text-2xl leading-none font-semibold">{own.count}</div>
          <small
            className={`mt-[3px] block text-[10px] font-semibold uppercase tracking-[0.12em] ${
              own.doneToday ? "text-muted" : "text-camel"
            }`}
          >
            {own.doneToday ? module.streakLabel : "Not done today"}
          </small>
        </div>
      </div>
    </div>
  );
}
