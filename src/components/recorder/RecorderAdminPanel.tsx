/**
 * Admin panel for the class recorder: the per-class switch (OFF by default),
 * the consent confirmation it needs, the children still missing permission,
 * the recordings with the server's verified duration and a deletion request,
 * and the audit of who did what.
 *
 * Every write is one of the migration's functions, called as the signed-in
 * admin: recorder_set_class_recording, recorder_record_child_consent and
 * recorder_request_deletion. The server re-checks everything; when it says
 * no, its own words are shown. No playback in this phase.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Power, PowerOff, ShieldCheck, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dayjs } from "@/lib/date";
import {
  auditActionLabel, consentGapText, consentGaps, durationWords, hanoiDate, recordingStatusLabel, retentionText, validReason, type ConsentGap,
} from "@/lib/recorderUi";
import { useRecorderDeps } from "./RecorderDeps";
import {
  fetchAdminClasses, fetchAudit, fetchConsents, fetchEnrolled, fetchPeople, fetchRecorderSettings, fetchRecordings,
  recordChildConsent, requestDeletion, setClassRecording, type AdminClass, type RecordingRow,
} from "./data";
import { Notice, Status } from "./pieces";

const when = (iso: string | null | undefined) => (iso ? dayjs(iso).tz().format("D MMM YYYY, HH:mm") : "");
const day = (iso: string | null | undefined) => (iso ? dayjs(iso).tz().format("D MMM YYYY") : "");

export function RecorderAdminPanel() {
  const { client, now } = useRecorderDeps();
  const qc = useQueryClient();
  const today = hanoiDate(now());
  const settings = useQuery({ queryKey: ["rec-admin-settings"], queryFn: () => fetchRecorderSettings(client) });
  const classes = useQuery({ queryKey: ["rec-admin-classes"], queryFn: () => fetchAdminClasses(client) });
  const consents = useQuery({ queryKey: ["rec-admin-consents"], queryFn: () => fetchConsents(client) });
  const kids = useQuery({
    queryKey: ["rec-admin-kids", today, (classes.data ?? []).map((c) => c.id).join(",")],
    enabled: !!classes.data,
    queryFn: () => fetchEnrolled(client, (classes.data ?? []).map((c) => c.id), today),
  });
  const recordings = useQuery({ queryKey: ["rec-admin-recordings"], queryFn: () => fetchRecordings(client) });
  const audit = useQuery({ queryKey: ["rec-admin-audit"], queryFn: () => fetchAudit(client) });
  const people = useQuery({
    queryKey: ["rec-admin-people", (classes.data ?? []).length, (audit.data ?? []).length, (recordings.data ?? []).length],
    enabled: !!classes.data && !!audit.data && !!recordings.data,
    queryFn: () => fetchPeople(client, [
      ...(classes.data ?? []).flatMap((c) => [c.switch?.consent_confirmed_by ?? "", c.switch?.disabled_by ?? ""]),
      ...(audit.data ?? []).map((a) => a.actor ?? ""),
      ...(recordings.data ?? []).map((r) => r.started_by ?? ""),
    ]),
  });
  const who = (id: string | null | undefined) => (id ? people.data?.get(id) ?? "An admin" : "The system");
  const className = (id: string | null) => classes.data?.find((c) => c.id === id)?.name ?? "A class";
  const refresh = () => { for (const k of ["rec-admin-classes", "rec-admin-consents", "rec-admin-recordings", "rec-admin-audit", "rec-admin-people"]) void qc.invalidateQueries({ queryKey: [k] }); };

  const wording = settings.data?.wordingVersion ?? null;
  const gapsBy = useMemo(() => {
    const m = new Map<string, ConsentGap[]>();
    for (const c of classes.data ?? []) {
      const enrolled = (kids.data ?? []).filter((k) => k.class_id === c.id);
      m.set(c.id, consentGaps(enrolled, consents.data ?? [], wording));
    }
    return m;
  }, [classes.data, kids.data, consents.data, wording]);

  return (
    <section aria-labelledby="rec-admin-h" className="space-y-4">
      <div className="space-y-1">
        <h2 id="rec-admin-h" className="text-2xl font-semibold">Recorder admin</h2>
        <p className="text-muted-foreground">Recording is off for every class until you switch it on here. Recordings are kept {settings.data?.retentionDays ?? 30} days, then deleted by themselves.</p>
      </div>
      <Tabs defaultValue="classes">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="classes" className="min-h-11">Classes</TabsTrigger>
          <TabsTrigger value="recordings" className="min-h-11">Recordings</TabsTrigger>
          <TabsTrigger value="audit" className="min-h-11">Who did what</TabsTrigger>
        </TabsList>

        <TabsContent value="classes" className="space-y-4 pt-2">
          <Notice tone="info" title={`Current consent wording: ${wording ?? "not set"}`}>
            Parents' permission counts only under this wording version. The wording text itself is the school's consent form for that version; if the wording changes, every class switches off until each child's permission is recorded again.
          </Notice>
          {classes.isLoading ? <Status line={{ tone: "info", text: "Loading classes..." }} live /> : null}
          {(classes.data ?? []).map((c) => (
            <ClassCard key={c.id} cls={c} gaps={gapsBy.get(c.id) ?? []} enrolledCount={(kids.data ?? []).filter((k) => k.class_id === c.id).length}
              wording={wording} who={who} onChanged={refresh} />
          ))}
        </TabsContent>

        <TabsContent value="recordings" className="space-y-3 pt-2">
          <p className="text-sm text-muted-foreground">Duration is what the server verified from the saved audio, not what the laptop claimed. There is no playback in this version.</p>
          {recordings.isLoading ? <Status line={{ tone: "info", text: "Loading recordings..." }} live /> : null}
          {recordings.data && !recordings.data.length ? <Status line={{ tone: "info", text: "No recordings yet." }} /> : null}
          <ul className="space-y-3">
            {(recordings.data ?? []).map((r) => <RecordingItem key={r.id} r={r} className={className(r.class_id)} by={who(r.started_by)} onChanged={refresh} />)}
          </ul>
        </TabsContent>

        <TabsContent value="audit" className="pt-2">
          {audit.data && !audit.data.length ? <Status line={{ tone: "info", text: "Nothing has happened yet." }} /> : null}
          <ol className="divide-y divide-border rounded-xl border border-border">
            {(audit.data ?? []).map((a) => (
              <li key={a.id} className="p-3 flex flex-col sm:flex-row sm:items-baseline gap-x-4 gap-y-0.5">
                <span className="text-sm text-muted-foreground tabular-nums sm:w-44 shrink-0">{when(a.at)}</span>
                <span className="min-w-0 break-words"><span className="font-medium">{who(a.actor)}</span> - {auditActionLabel(a.action)}{a.class_id ? ` - ${className(a.class_id)}` : ""}
                  {typeof a.detail?.note === "string" && a.detail.note ? <span className="text-muted-foreground"> ({String(a.detail.note)})</span> : null}
                  {typeof a.detail?.reason === "string" ? <span className="text-muted-foreground"> ({String(a.detail.reason)})</span> : null}
                </span>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>
    </section>
  );
}

function ClassCard({ cls, gaps, enrolledCount, wording, who, onChanged }: {
  cls: AdminClass; gaps: ConsentGap[]; enrolledCount: number; wording: string | null; who: (id: string | null) => string; onChanged: () => void;
}) {
  const { client } = useRecorderDeps();
  const on = cls.switch?.recording_enabled === true;
  const [openOn, setOpenOn] = useState(false);
  const [openOff, setOpenOff] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [note, setNote] = useState("");
  const [offNote, setOffNote] = useState("");
  const [serverSaid, setServerSaid] = useState<string | null>(null);
  const [consentFor, setConsentFor] = useState<ConsentGap | null>(null);

  const switchOn = useMutation({
    mutationFn: () => setClassRecording(client, cls.id, true, wording, note.trim()),
    onSuccess: () => { setOpenOn(false); setTicked(false); setNote(""); setServerSaid(null); onChanged(); },
    onError: (e: any) => setServerSaid(String(e?.message ?? e)),
  });
  const switchOff = useMutation({
    mutationFn: () => setClassRecording(client, cls.id, false, null, offNote.trim()),
    onSuccess: () => { setOpenOff(false); setOffNote(""); onChanged(); },
    onError: (e: any) => setServerSaid(String(e?.message ?? e)),
  });

  return (
    <article className="rounded-xl border border-border p-4 space-y-3" aria-labelledby={`cls-${cls.id}`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h3 id={`cls-${cls.id}`} className="text-lg font-semibold break-words">{cls.name}</h3>
          {on ? (
            <Status line={{ tone: "ok", text: `Recording is ON - confirmed by ${who(cls.switch!.consent_confirmed_by)} on ${when(cls.switch!.consent_confirmed_at)}, wording ${cls.switch!.consent_wording_version}` }} />
          ) : (
            <Status line={{ tone: "info", text: cls.switch?.disabled_at ? `Recording is OFF - switched off by ${who(cls.switch.disabled_by)} on ${when(cls.switch.disabled_at)}` : "Recording is OFF" }} />
          )}
          {on && cls.switch?.consent_note ? <p className="text-sm text-muted-foreground break-words">Signed forms: {cls.switch.consent_note}</p> : null}
        </div>
        {on ? (
          <Button variant="outline" className="min-h-11" onClick={() => { setServerSaid(null); setOpenOff(true); }}><PowerOff className="h-4 w-4 mr-2" aria-hidden /> Switch off</Button>
        ) : (
          <Button className="min-h-11" onClick={() => { setServerSaid(null); setOpenOn(true); }}><Power className="h-4 w-4 mr-2" aria-hidden /> Switch on...</Button>
        )}
      </div>

      {gaps.length ? (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 space-y-2">
          <p className="font-medium">{gaps.length} of {enrolledCount} {enrolledCount === 1 ? "child needs" : "children need"} parents' permission under wording {wording ?? "(not set)"} before this class can be recorded</p>
          <ul className="space-y-2">
            {gaps.map((g) => (
              <li key={g.student_id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium break-words min-w-0">{g.name}</span>
                <Badge variant="outline">{consentGapText(g)}</Badge>
                <Button variant="ghost" className="min-h-11 ml-auto" onClick={() => setConsentFor(g)}><UserCheck className="h-4 w-4 mr-2" aria-hidden /> Record permission</Button>
              </li>
            ))}
          </ul>
        </div>
      ) : enrolledCount ? (
        <Status line={{ tone: "ok", text: `All ${enrolledCount} children have permission under wording ${wording}.` }} />
      ) : null}

      <Dialog open={openOn} onOpenChange={setOpenOn}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Switch recording on for {cls.name}?</DialogTitle>
            <DialogDescription>The server checks every child's permission again before it agrees.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm">Consent wording version: <span className="font-semibold">{wording ?? "not set"}</span></p>
            {gaps.length ? <Status line={{ tone: "warn", text: `${gaps.length} ${gaps.length === 1 ? "child has" : "children have"} no permission on file under this wording. The server will refuse until that is recorded.` }} /> : null}
            <Label htmlFor={`tick-${cls.id}`} className="flex items-start gap-3 rounded-lg border border-border p-3 min-h-12 cursor-pointer font-normal">
              <Checkbox id={`tick-${cls.id}`} checked={ticked} onCheckedChange={(v) => setTicked(v === true)} className="mt-0.5" />
              <span>I confirm that signed parental permission for recording is on file for every child in this class, under wording {wording ?? "(not set)"}.</span>
            </Label>
            <div className="space-y-1.5">
              <Label htmlFor={`note-${cls.id}`}>Where are the signed forms kept?</Label>
              <Input id={`note-${cls.id}`} className="min-h-11" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: paper forms, office folder B" />
            </div>
            {serverSaid ? <Notice tone="error" title="The server said no" role="alert">{serverSaid}</Notice> : null}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setOpenOn(false)}>Cancel</Button>
            <Button className="min-h-11" disabled={!ticked || !validReason(note) || !wording || switchOn.isPending} onClick={() => switchOn.mutate()}>
              {switchOn.isPending ? <Loader2 className="h-4 w-4 mr-2 motion-safe:animate-spin" aria-hidden /> : <ShieldCheck className="h-4 w-4 mr-2" aria-hidden />} Switch on
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openOff} onOpenChange={setOpenOff}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Switch recording off for {cls.name}?</DialogTitle>
            <DialogDescription>A lesson being recorded now stops and saves what it has. Switching on again needs the consent confirmation again.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`offnote-${cls.id}`}>Why (optional)</Label>
            <Input id={`offnote-${cls.id}`} className="min-h-11" value={offNote} onChange={(e) => setOffNote(e.target.value)} />
          </div>
          {serverSaid ? <Notice tone="error" title="The server said no" role="alert">{serverSaid}</Notice> : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setOpenOff(false)}>Cancel</Button>
            <Button className="min-h-11 bg-foreground text-background hover:bg-foreground/90" disabled={switchOff.isPending} onClick={() => switchOff.mutate()}>Switch off</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConsentDialog gap={consentFor} wording={wording} onClose={() => setConsentFor(null)} onChanged={onChanged} />
    </article>
  );
}

function ConsentDialog({ gap, wording, onClose, onChanged }: { gap: ConsentGap | null; wording: string | null; onClose: () => void; onChanged: () => void }) {
  const { client } = useRecorderDeps();
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => recordChildConsent(client, gap!.student_id, "granted", note.trim()),
    onSuccess: () => { setNote(""); setErr(null); onClose(); onChanged(); },
    onError: (e: any) => setErr(String(e?.message ?? e)),
  });
  return (
    <Dialog open={!!gap} onOpenChange={(o) => { if (!o) { setErr(null); onClose(); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="break-words">Record permission for {gap?.name}</DialogTitle>
          <DialogDescription>Only when the parents have signed the form under wording {wording ?? "(not set)"}.</DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="consent-note">How did the parents answer?</Label>
          <Input id="consent-note" className="min-h-11" value={note} onChange={(e) => setNote(e.target.value)} placeholder="For example: signed form, 3 Nov" />
        </div>
        {err ? <Notice tone="error" title="The server said no" role="alert">{err}</Notice> : null}
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={onClose}>Cancel</Button>
          <Button className="min-h-11" disabled={!validReason(note) || m.isPending} onClick={() => m.mutate()}>Record permission</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecordingItem({ r, className, by, onChanged }: { r: RecordingRow; className: string; by: string; onChanged: () => void }) {
  const { client } = useRecorderDeps();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const m = useMutation({
    mutationFn: () => requestDeletion(client, r.id, reason.trim()),
    onSuccess: () => { setOpen(false); setReason(""); setErr(null); onChanged(); },
    onError: (e: any) => setErr(String(e?.message ?? e)),
  });
  const gone = r.status === "deleted" || !!r.audio_deleted_at;
  const requested = !!r.deletion_requested_at;
  return (
    <li className="rounded-xl border border-border p-4 space-y-2">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="font-semibold break-words">{className} - {day(r.scheduled_start)}</p>
          <p className="text-sm text-muted-foreground">Lesson {dayjs(r.scheduled_start).tz().format("HH:mm")}-{dayjs(r.scheduled_end).tz().format("HH:mm")}, recorded by {by}</p>
        </div>
        <Badge variant={r.status === "complete" && !requested ? "secondary" : "outline"}>{recordingStatusLabel(r.status, requested)}</Badge>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
        <div><dt className="text-muted-foreground inline">Verified: </dt><dd className="inline font-medium">{r.verified_audio_ms === null ? "not yet" : durationWords(r.verified_audio_ms)}</dd></div>
        <div><dt className="text-muted-foreground inline">Inside the lesson: </dt><dd className="inline font-medium">{r.verified_lesson_ms === null ? "not yet" : durationWords(r.verified_lesson_ms)}</dd></div>
        <div><dt className="sr-only">Retention</dt><dd>{retentionText(r, day)}</dd></div>
      </dl>
      {r.abandon_reason && r.status === "abandoned" ? <p className="text-sm text-muted-foreground break-words">Not finished: {r.abandon_reason}</p> : null}
      {requested && r.deletion_reason ? <p className="text-sm text-muted-foreground break-words">Deletion asked for: {r.deletion_reason}</p> : null}
      {!gone && !requested ? (
        <Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4 mr-2" aria-hidden /> Request deletion</Button>
      ) : null}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="break-words">Delete the recording of {className}, {day(r.scheduled_start)}?</DialogTitle>
            <DialogDescription>The audio is removed at the next nightly run and cannot be brought back. The recording then no longer counts as a lesson record. This is written in the log.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor={`reason-${r.id}`}>Reason (required)</Label>
            <Textarea id={`reason-${r.id}`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: a parent withdrew permission" />
          </div>
          {err ? <Notice tone="error" title="The server said no" role="alert">{err}</Notice> : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="min-h-11 bg-foreground text-background hover:bg-foreground/90" disabled={!validReason(reason) || m.isPending} onClick={() => m.mutate()}><Trash2 className="h-4 w-4 mr-2" aria-hidden /> Request deletion</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </li>
  );
}
