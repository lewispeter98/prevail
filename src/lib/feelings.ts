/** The "How are you feeling?" chips, with their quiet monochrome marks. */
export const FEELINGS: { name: string; mark: string }[] = [
  { name: "Grateful", mark: "✦" },
  { name: "Energised", mark: "◈" },
  { name: "Calm", mark: "○" },
  { name: "Focused", mark: "◎" },
  { name: "Anxious", mark: "◇" },
  { name: "Tired", mark: "◑" },
  { name: "Sad", mark: "▪" },
  { name: "Overwhelmed", mark: "△" },
  { name: "Hopeful", mark: "☆" },
  { name: "Frustrated", mark: "▵" },
  { name: "Happy", mark: "◉" },
  { name: "Excited", mark: "✧" },
  { name: "Stressed", mark: "◪" },
  { name: "Tense", mark: "▷" },
  { name: "Lonely", mark: "◌" },
  { name: "Content", mark: "◐" },
  { name: "Proud", mark: "◆" },
  { name: "Restless", mark: "◁" },
  { name: "Inspired", mark: "✶" },
  { name: "Numb", mark: "□" },
];

const NAMES = new Set(FEELINGS.map((f) => f.name));
export const isFeeling = (name: string) => NAMES.has(name);
