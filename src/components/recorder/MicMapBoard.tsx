import { useEffect, useMemo, useState } from "react";
import { Check, Mic } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useMicMap } from "@/hooks/useMicMap";
import { byMic, MICS, setSeat, type Mic as MicN, type Seating } from "@/lib/micMap";

/**
 * Who sits at which Lark mic. Prefilled from the class's previous lesson; the
 * teacher taps a mic under each child and confirms (about 10 seconds). Skipping
 * is fine: a child with no seat is searched for in the whole class. Never
 * blocks recording.
 */
export function MicMapBoard({ sessionId, classId }: { sessionId: string; classId?: string }) {
  const map = useMicMap(sessionId, classId);
  const [draft, setDraft] = useState<Seating>({});
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skipped, setSkipped] = useState(false);

  const ids = useMemo(() => map.kids.map((k) => k.student_id), [map.kids]);
  // Start the draft from what was confirmed, else from last lesson's seating; keep what the teacher already tapped.
  useEffect(() => {
    setDraft((d) => Object.fromEntries(ids.map((id) => [id, id in d ? d[id] : (map.current[id] ?? map.suggested[id] ?? null)])));
  }, [ids, map.current, map.suggested]); // eslint-disable-line react-hooks/exhaustive-deps

  if (map.unavailable || map.loading || !ids.length) return null;
  const name = (id: string) => map.kids.find((k) => k.student_id === id)?.full_name ?? "a child";

  if (map.confirmed && !editing) {
    const g = byMic(ids, map.current);
    return (
      <section aria-labelledby="mm-h" className="space-y-2 rounded-hec-lg border border-hec-line p-3">
        <div className="flex items-center justify-between gap-2">
          <h3 id="mm-h" className="text-lg font-semibold flex items-center gap-2"><Mic className="h-5 w-5" aria-hidden /> Mic map</h3>
          <Button variant="outline" className="min-h-11" onClick={() => setEditing(true)}>Change</Button>
        </div>
        <ul className="text-sm text-hec-ink-soft space-y-0.5">
          {MICS.map((m) => <li key={m} className="break-words">Mic {m}: {g.mics[m].map(name).join(", ") || "nobody"}</li>)}
          {g.unseated.length ? <li className="break-words">No mic: {g.unseated.map(name).join(", ")}</li> : null}
        </ul>
      </section>
    );
  }
  if (skipped && !editing) {
    return <p className="text-sm text-hec-ink-soft">Mic map skipped. <button type="button" className="underline min-h-11" onClick={() => setSkipped(false)}>Set it now</button></p>;
  }

  // On a re-confirm only the children whose mic changed get a new row.
  const changed: Seating = Object.fromEntries(Object.entries(draft).filter(([id, m]) => m && map.current[id] !== m));
  const confirm = async () => {
    setBusy(true);
    const err = await map.confirm(editing ? changed : draft);
    setBusy(false);
    if (err) { toast.error(`Mic map not saved: ${err}`); return; }
    setEditing(false);
  };

  return (
    <section aria-labelledby="mm-h" className="space-y-3 rounded-hec-lg border border-hec-line p-3">
      <h3 id="mm-h" className="text-lg font-semibold flex items-center gap-2"><Mic className="h-5 w-5" aria-hidden /> Mic map</h3>
      <p className="text-sm text-hec-ink-soft">Tap the mic each child is sitting at, then confirm. Children you leave without a mic are still found.</p>
      <ul className="space-y-2">
        {map.kids.map((k) => (
          <li key={k.student_id} className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 flex-1 basis-32 break-words font-medium">{k.full_name}</span>
            <div className="flex gap-2" role="group" aria-label={`Mic for ${k.full_name}`}>
              {MICS.map((m) => (
                <button key={m} type="button" aria-pressed={draft[k.student_id] === m}
                  onClick={() => setDraft((d) => setSeat(d, k.student_id, m))}
                  className={cn("h-12 w-12 rounded-xl border-2 text-lg font-semibold touch-manipulation select-none",
                    draft[k.student_id] === m ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-muted")}>
                  {m}
                </button>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Button className="flex-1 min-h-12 text-base" disabled={busy || (editing && !Object.keys(changed).length)} onClick={() => void confirm()}>
          <Check className="h-5 w-5 mr-2" aria-hidden /> {editing ? "Save changes" : "Confirm"}
        </Button>
        <Button variant="outline" className="min-h-12" onClick={() => (editing ? setEditing(false) : setSkipped(true))}>{editing ? "Cancel" : "Skip"}</Button>
      </div>
    </section>
  );
}

/** "Moved to mic N": one tap on a child inserts a seat row at now. Rendered by the who's-speaking panel. */
export function MovedToMic({ sessionId, classId, childId, childName }: { sessionId: string; classId?: string; childId: string; childName: string }) {
  const map = useMicMap(sessionId, classId);
  const [busy, setBusy] = useState(false);
  if (map.unavailable) return null;
  const now = map.current[childId];
  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`${childName} moved to mic`}>
      <span className="text-sm text-hec-ink-soft">{childName} moved to mic</span>
      {MICS.map((m) => (
        <Button key={m} variant={now === m ? "default" : "outline"} className="min-h-11 min-w-11 px-3" disabled={busy || now === m}
          onClick={async () => { setBusy(true); const e = await map.moveTo(childId, m as MicN); setBusy(false); if (e) toast.error(`Not saved: ${e}`); else toast.success(`${childName} is at mic ${m}`); }}>
          {m}
        </Button>
      ))}
    </div>
  );
}
