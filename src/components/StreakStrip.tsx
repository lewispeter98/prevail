import { db } from "@/lib/db";
import type { ModuleConfig } from "@/lib/modules";
import { getStreaks } from "@/lib/streaks";
import { getTimeStreak } from "@/lib/time";
import { StreakStripView } from "./StreakStripView";

/** The super streak plus this module's own streak. */
export async function StreakStrip({ module }: { module: ModuleConfig }) {
  const [streaks, time] = await Promise.all([
    getStreaks(),
    module.streak === "time" ? getTimeStreak(await db()) : null,
  ]);
  const own = module.streak === "time" ? time! : streaks[module.streak];
  return (
    <StreakStripView
      super={streaks.super}
      own={{ ...own, kind: module.streak, label: module.streakLabel }}
      today={{
        weight: streaks.weight.doneToday,
        script: streaks.script.doneToday,
        journal: streaks.journal.doneToday,
      }}
    />
  );
}
