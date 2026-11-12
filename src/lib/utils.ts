import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// The "Ivory" design system's own class names (tailwind.config.ts), registered
// so tailwind-merge knows what each one is. Without this it reads
// `text-hec-body` (a SIZE) as a text colour and silently drops it whenever a
// `text-hec-ink` follows, and lets `rounded-hec-md` and `rounded-full` both
// through. Presentation only.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["hec-display", "hec-h1", "hec-h2", "hec-h3", "hec-body", "hec-small", "hec-caption"] }],
      rounded: [{ rounded: ["hec-sm", "hec-md", "hec-lg"] }],
      shadow: [{ shadow: ["hec-1", "hec-2", "hec-3"] }],
      "min-h": [{ "min-h": ["hec-target"] }],
      "min-w": [{ "min-w": ["hec-target"] }],
      duration: [{ duration: ["hec-1", "hec-2", "hec-3"] }],
      ease: [{ ease: ["hec", "hec-in-out"] }],
      "font-family": [{ font: ["display"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
