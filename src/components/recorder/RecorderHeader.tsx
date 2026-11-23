/**
 * The recorder page's header. On a phone the title and its line sit on their
 * own row and the buttons wrap below them (C2 review 5: at 375 px the line was
 * squeezed into a one-word column beside the buttons). Rendered in
 * scripts/recorder/screens.test.mjs.
 */
import { Mic, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function RecorderHeader({ showMicrophones, isAdmin, adminView, onMicrophones, onToggleAdmin }: {
  showMicrophones: boolean; isAdmin: boolean; adminView: boolean; onMicrophones: () => void; onToggleAdmin: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center" data-recorder-header="">
      <div className="flex items-center gap-3 min-w-0 flex-1" data-header-title="">
        <div className="h-11 w-11 shrink-0 rounded-hec-lg bg-hec-sunken flex items-center justify-center"><Mic className="h-6 w-6 text-hec-ink-soft" aria-hidden /></div>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold break-words">Class recorder</h1>
          <p className="text-sm text-hec-ink-soft break-words">Records your lesson with two microphones. It only records; nothing is analysed here.</p>
        </div>
      </div>
      {showMicrophones || isAdmin ? (
        <div className="flex flex-wrap gap-2" data-header-actions="">
          {showMicrophones ? (
            <Button variant="outline" className="min-h-11" onClick={onMicrophones}><Settings2 className="h-4 w-4 mr-2" aria-hidden /> Microphones</Button>
          ) : null}
          {isAdmin ? (
            <Button variant="outline" className="min-h-11" onClick={onToggleAdmin}>{adminView ? "Teacher screen" : "Admin panel"}</Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
