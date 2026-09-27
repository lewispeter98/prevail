import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement>;
const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
} as const;

export const WeightIcon = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
    <path d="M8.2 10a4.4 4.4 0 0 1 7.6 0" />
    <path d="M12 10.2l1.4-1.8" />
  </svg>
);

export const GoalsIcon = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.5" />
    <circle cx="12" cy="12" r=".8" fill="currentColor" />
  </svg>
);

export const ScriptIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 20h4.2L19.4 8.8a2.2 2.2 0 0 0-3.2-3.2L5 16.8z" />
    <path d="M14.5 7.3l2.2 2.2" />
  </svg>
);

export const JournalIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M6 3.5h11.5a1.5 1.5 0 0 1 1.5 1.5v15.5H7a2.5 2.5 0 0 1-2.5-2.5V5A1.5 1.5 0 0 1 6 3.5z" />
    <path d="M4.5 18A2.5 2.5 0 0 1 7 15.5h12" />
    <path d="M9 7.5h6" />
  </svg>
);

export const SettingsIcon = (p: P) => (
  <svg {...base} {...p}>
    <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
    <circle cx="16" cy="7" r="2" />
    <circle cx="10" cy="17" r="2" />
  </svg>
);

export const CheckIcon = (p: P) => (
  <svg {...base} strokeWidth={2.2} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);
