import type { StreakKind } from "./streaks";

export type ModuleKey = "weight" | "goals" | "journal";

export type ModuleConfig = {
  key: ModuleKey;
  label: string;
  streak: StreakKind;
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
};
