/**
 * The greeting line of the parent's home, by the time of day in Hanoi, with the Vietnamese beneath it
 * (docs/EXPERIENCE_DESIGN_BRIEF.md H1). Plain: it does not use the name of the person and it does not change the
 * colour of anything (the parent's screens never take Tide).
 */
import { FamilyBi } from "@/components/family/FamilyBi";
import type { FamilyCopyKey } from "@/lib/copy/family";

/** Hour of the day (0-23) on the Hanoi clock. */
function hanoiHour(now: Date): number {
  const h = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", hourCycle: "h23" }).format(now);
  return Number(h);
}

export function greetingKey(now: Date = new Date()): FamilyCopyKey {
  const h = hanoiHour(now);
  return h < 12 ? "greet.morning" : h < 17 ? "greet.afternoon" : "greet.evening";
}

export function FamilyGreeting({ className }: { className?: string }) {
  return (
    <p className={className ?? "text-hec-body font-medium text-hec-ink-soft"}>
      <FamilyBi k={greetingKey()} />
    </p>
  );
}
