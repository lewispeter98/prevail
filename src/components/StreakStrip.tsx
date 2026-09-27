import { getStreaks } from "@/lib/streaks";
import type { ModuleConfig } from "@/lib/modules";
import { StreakStripView } from "./StreakStripView";

/** The super streak plus this module's own streak. */
export async function StreakStrip({ module }: { module: ModuleConfig }) {
  const streaks = await getStreaks();
  return (
    <StreakStripView
      super={streaks.super}
      own={{ ...streaks[module.streak], kind: module.streak, label: module.streakLabel }}
      today={{
        weight: streaks.weight.doneToday,
        script: streaks.script.doneToday,
        journal: streaks.journal.doneToday,
      }}
    />
  );
}
