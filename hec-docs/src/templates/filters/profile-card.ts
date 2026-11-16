// Exact ports of the app helpers the profile share card uses.

// src/lib/levelUtils.ts
const LEVEL_TITLES: Record<number, string> = {
  1: "Rookie Explorer",
  2: "Rising Star",
  3: "Knowledge Seeker",
  4: "Quiz Warrior",
  5: "Scholar Knight",
  6: "Brain Master",
  7: "Wisdom Wizard",
  8: "Grand Champion",
  9: "Elite Legend",
  10: "Supreme Scholar",
};

/** getLevelTitle(level) */
function levelTitle(level: number): string {
  if (level >= 10) return LEVEL_TITLES[10];
  return LEVEL_TITLES[level] || LEVEL_TITLES[1];
}

// src/components/student/ProfileShareCard.tsx: the avatar fallback initials.
function avatarInitials(name: string): string {
  return String(name ?? "").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

export const filters = { levelTitle, avatarInitials };
