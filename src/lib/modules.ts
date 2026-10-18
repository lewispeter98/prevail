import type { StreakKind } from "./streaks";

export type ModuleKey = "weight" | "goals" | "journal" | "time";

/** The core daily streaks plus Time, which sits outside the super streak. */
export type OwnStreakKind = StreakKind | "time";

export type ModuleConfig = {
  key: ModuleKey;
  label: string;
  streak: OwnStreakKind;
  streakLabel: string;
  tabs: { href: string; label: string }[];
};

export const MODULES: Record<ModuleKey, ModuleConfig> = {
  weight: {
    key: "weight",
    label: "Weight",
    streak: "weight",
    streakLabel: "Weight streak",
    tabs: [
      { href: "/weight", label: "Today" },
      { href: "/weight/trends", label: "Trends" },
      { href: "/weight/history", label: "History" },
    ],
  },
  goals: {
    key: "goals",
    label: "Goals",
    streak: "script",
    streakLabel: "Script streak",
    tabs: [
      { href: "/goals", label: "Script" },
      { href: "/goals/objectives", label: "Objectives" },
      { href: "/goals/record", label: "Record" },
    ],
  },
  journal: {
    key: "journal",
    label: "Journal",
    streak: "journal",
    streakLabel: "Journal streak",
    tabs: [
      { href: "/journal", label: "Today" },
      { href: "/journal/reflections", label: "Reflections" },
      { href: "/journal/history", label: "History" },
    ],
  },
  time: {
    key: "time",
    label: "Time",
    streak: "time",
    streakLabel: "Time streak",
    tabs: [
      { href: "/time", label: "Now" },
      { href: "/time/breakdown", label: "Breakdown" },
      { href: "/time/insights", label: "Insights" },
    ],
  },
};
