/**
 * Profile > Look (docs/EXPERIENCE_DESIGN_BRIEF.md F3, G5): how this child's page looks. "Playful" is the page made
 * for their age, "Classic" the one for the next age up; the band's own name is never shown. Also whether Pip shows
 * (a teenager's page has none unless they choose him) and, from junior up, Vietnamese under the English.
 * Remembered on this device: per child for the look and for Pip, per device for the language.
 */
import { cn } from "@/lib/utils";
import { useAgeBand, type Look } from "@/hooks/useAgeBand";
import { Bi } from "@/components/student/band/Bi";
import { FOCUS } from "@/components/student/nova/ivory";

const OPTION =
  "inline-flex min-h-hec-target items-center justify-center rounded-hec-md border px-4 text-hec-body font-medium transition-colors duration-hec-1 ease-hec";

function Switch({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("flex min-h-hec-target w-full items-center justify-between gap-4 rounded-hec-md px-1 text-left text-hec-body text-hec-ink", FOCUS)}
    >
      <span>{children}</span>
      <span aria-hidden className={cn("flex h-7 w-12 shrink-0 items-center rounded-full px-1 transition-colors duration-hec-1", checked ? "justify-end bg-hec-ink" : "justify-start bg-hec-sunken")}>
        <span className="h-5 w-5 rounded-full bg-hec-surface shadow-hec-1" />
      </span>
    </button>
  );
}

export function LookChoice() {
  const { look, setLook, natural, showPip, setShowPip, viSwitch, setViSwitch, band } = useAgeBand();
  const canGrow = natural.band !== "teen"; // Classic is the next band up; a teenager's own page is already the oldest
  const ageLocksLanguage = band === "early" || band === "young";
  return (
    <section aria-labelledby="look-title" className="space-y-4 rounded-hec-lg border border-hec-line bg-hec-surface p-4 sm:p-6">
      <div className="space-y-1">
        <h3 id="look-title" className="font-display text-hec-h3 font-medium text-hec-ink">
          <Bi k="look.title" />
        </h3>
        <p className="text-hec-small text-hec-ink-soft">
          <Bi k="look.help" />
        </p>
      </div>
      {canGrow && (
        <div role="radiogroup" aria-labelledby="look-title" className="grid grid-cols-2 gap-2">
          {(["playful", "classic"] as Look[]).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={look === value}
              onClick={() => setLook(value)}
              className={cn(
                OPTION,
                FOCUS,
                look === value ? "border-hec-ink bg-hec-action text-hec-on-action" : "border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
              )}
            >
              <Bi k={value === "playful" ? "look.playful" : "look.classic"} />
            </button>
          ))}
        </div>
      )}
      <div className="space-y-1">
        <Switch checked={showPip} onChange={setShowPip}>
          <Bi k="look.pip" />
        </Switch>
        {!ageLocksLanguage && (
          <Switch checked={viSwitch} onChange={setViSwitch}>
            <Bi k="look.vi" />
          </Switch>
        )}
      </div>
    </section>
  );
}
