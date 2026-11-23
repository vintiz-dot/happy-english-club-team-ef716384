/**
 * A visible speaker button on the home of the two youngest bands (docs/EXPERIENCE_DESIGN_BRIEF.md J3): sound on or
 * off for this device. It writes the setting the sound manager already keeps (`sound-enabled`), and follows it.
 * Nothing plays until the child has tapped something on this visit, and the stored volume is never exceeded.
 */
import { useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { soundManager } from "@/lib/soundManager";
import { useCopy } from "@/lib/copy/useCopy";
import { FOCUS } from "@/components/student/nova/ivory";
import { cn } from "@/lib/utils";

export function SoundToggle() {
  const { en } = useCopy();
  const on = useSyncExternalStore(soundManager.subscribe, () => soundManager.isEnabled(), () => false);
  const label = en(on ? "sound.on" : "sound.off");
  return (
    <div className="flex justify-end">
      <button
        type="button"
        aria-pressed={on}
        aria-label={label}
        title={label}
        onClick={() => {
          // switching it on is the one place a small click confirms it (the tap has happened by now)
          if (soundManager.toggle()) soundManager.play("click");
        }}
        className={cn(
          "inline-flex min-h-hec-target min-w-hec-target items-center justify-center rounded-hec-md border border-hec-line-strong bg-hec-raised text-hec-ink hover:bg-hec-sunken",
          FOCUS,
        )}
      >
        {on ? <Volume2 className="h-5 w-5" aria-hidden /> : <VolumeX className="h-5 w-5" aria-hidden />}
      </button>
    </div>
  );
}
