/**
 * Audit clips: pick a child, add their videos. Admin only.
 *
 * Files go to the private `audit-clips` bucket in the school's own Supabase
 * project, under a code (S01, S02 ...) with no name in the path. A child is
 * added to the audit only after the admin records how the parents consented.
 * Nothing here sends a clip anywhere else; analysis is a separate step.
 */
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, FileVideo, Loader2, Play, ShieldCheck, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ACCEPTED_TYPES,
  AUDIT_BUCKET,
  exportName,
  extFor,
  formatBytes,
  isAcceptedClip,
  isExpired,
  keyFileText,
  storagePathFor,
} from "@/lib/auditClips";

// The tables are newer than the generated types.
const db = supabase as any;
const KEY = ["audit-clips"] as const;
const today = () => new Date().toISOString().slice(0, 10);

type Student = { id: string; full_name: string };
type Subject = { student_id: string; code: string; consent_note: string | null; consent_confirmed_at: string };
type Clip = {
  id: string; student_id: string; clip_no: number; storage_path: string; original_name: string | null;
  mime_type: string | null; size_bytes: number | null; source_note: string | null;
  delete_after: string | null; uploaded_at: string;
};

export default function AuditClipsTab() {
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [consentNote, setConsentNote] = useState("");
  const [sourceNote, setSourceNote] = useState("");
  const [deleteAfter, setDeleteAfter] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: [...KEY, "all"],
    retry: false,
    queryFn: async () => {
      const [s, sub, c] = await Promise.all([
        db.from("students").select("id, full_name").order("full_name"),
        db.from("audit_clip_subjects").select("student_id, code, consent_note, consent_confirmed_at"),
        db.from("audit_clips").select("*").order("clip_no"),
      ]);
      const err = s.error || sub.error || c.error;
      if (err) throw err;
      return { students: s.data as Student[], subjects: sub.data as Subject[], clips: c.data as Clip[] };
    },
  });

  const subjectOf = useMemo(() => new Map((data?.subjects ?? []).map((s) => [s.student_id, s])), [data]);
  const clipsOf = useMemo(() => {
    const m = new Map<string, Clip[]>();
    for (const c of data?.clips ?? []) m.set(c.student_id, [...(m.get(c.student_id) ?? []), c]);
    return m;
  }, [data]);

  const students = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.students ?? []).filter((s) => !q || s.full_name.toLowerCase().includes(q));
  }, [data, search]);

  const student = data?.students.find((s) => s.id === selected) ?? null;
  const subject = student ? subjectOf.get(student.id) : undefined;
  const clips = student ? clipsOf.get(student.id) ?? [] : [];
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  const enrol = async () => {
    if (!student) return;
    setBusy("enrol");
    try {
      const { data: code, error } = await db.rpc("audit_clip_enrol", { p_student: student.id, p_consent_note: consentNote });
      if (error) throw error;
      toast.success(`Added as ${code}.`);
      setConsentNote("");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not add this child.");
    } finally {
      setBusy(null);
    }
  };

  const upload = async (files: FileList | null) => {
    if (!student || !subject || !files?.length) return;
    setBusy("upload");
    const { data: u } = await supabase.auth.getUser();
    let done = 0;
    for (const file of Array.from(files)) {
      if (!isAcceptedClip(file.type)) {
        toast.error(`${file.name}: not a video or audio type this store accepts (${ACCEPTED_TYPES.join(", ")}).`);
        continue;
      }
      const id = crypto.randomUUID();
      const path = storagePathFor(subject.code, id, extFor(file.type, file.name));
      // The row first: the database numbers the clip, and refuses a child with no consent on record.
      const ins = await db.from("audit_clips").insert({
        id, student_id: student.id, storage_path: path, original_name: file.name, mime_type: file.type,
        size_bytes: file.size, source_note: sourceNote.trim() || null, delete_after: deleteAfter || null,
        uploaded_by: u.user?.id ?? null,
      });
      if (ins.error) { toast.error(`${file.name}: ${ins.error.message}`); continue; }
      const up = await supabase.storage.from(AUDIT_BUCKET).upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) {
        await db.from("audit_clips").delete().eq("id", id);
        toast.error(`${file.name}: ${up.error.message}`);
        continue;
      }
      done++;
    }
    if (fileInput.current) fileInput.current.value = "";
    setBusy(null);
    if (done) toast.success(`${done} clip${done > 1 ? "s" : ""} saved for ${subject.code}.`);
    await refresh();
  };

  const signed = async (c: Clip, asDownload: boolean) => {
    const ext = extFor(c.mime_type, c.original_name);
    const { data: s, error } = await supabase.storage.from(AUDIT_BUCKET).createSignedUrl(
      c.storage_path, 300, asDownload ? { download: exportName(subject!.code, c.clip_no, ext) } : undefined);
    if (error || !s) { toast.error(error?.message ?? "Could not open the file."); return null; }
    return s.signedUrl;
  };

  const download = async (c: Clip) => {
    const url = await signed(c, true);
    if (url) window.location.assign(url);
  };
  const play = async (c: Clip) => {
    if (playing?.id === c.id) { setPlaying(null); return; }
    const url = await signed(c, false);
    if (url) setPlaying({ id: c.id, url });
  };

  const removeFiles = async (paths: string[]) => {
    if (!paths.length) return;
    const { error } = await supabase.storage.from(AUDIT_BUCKET).remove(paths);
    if (error) throw error;
  };

  const deleteClip = async (c: Clip) => {
    if (!confirm(`Delete clip ${c.clip_no} for ${subject?.code}? This cannot be undone.`)) return;
    setBusy(c.id);
    try {
      await removeFiles([c.storage_path]);
      const { error } = await db.from("audit_clips").delete().eq("id", c.id);
      if (error) throw error;
      if (playing?.id === c.id) setPlaying(null);
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not delete.");
    } finally {
      setBusy(null);
    }
  };

  const deleteExpired = async () => {
    const expired = (data?.clips ?? []).filter((c) => isExpired(c.delete_after, today()));
    if (!expired.length) return;
    if (!confirm(`Delete ${expired.length} clip(s) past their delete-after date? This cannot be undone.`)) return;
    setBusy("expired");
    try {
      await removeFiles(expired.map((c) => c.storage_path));
      const { error } = await db.from("audit_clips").delete().in("id", expired.map((c) => c.id));
      if (error) throw error;
      toast.success("Expired clips deleted.");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not delete.");
    } finally {
      setBusy(null);
    }
  };

  const withdraw = async () => {
    if (!student || !subject) return;
    if (!confirm(`Withdraw ${subject.code} from the audit and delete all ${clips.length} clip(s)? This cannot be undone.`)) return;
    setBusy("withdraw");
    try {
      await removeFiles(clips.map((c) => c.storage_path));
      const { error } = await db.from("audit_clip_subjects").delete().eq("student_id", student.id);
      if (error) throw error;
      setPlaying(null);
      toast.success("Withdrawn, and every clip deleted.");
      await refresh();
    } catch (e: any) {
      toast.error(e.message ?? "Could not withdraw.");
    } finally {
      setBusy(null);
    }
  };

  // key.txt is built here and saved by the admin; it is never stored.
  const downloadKey = () => {
    const rows = (data?.subjects ?? []).map((s) => ({
      code: s.code, name: data?.students.find((x) => x.id === s.student_id)?.full_name ?? "?",
    }));
    const url = URL.createObjectURL(new Blob([keyFileText(rows)], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url; a.download = "key.txt"; a.click();
    URL.revokeObjectURL(url);
  };

  if (error) {
    return (
      <Card><CardContent className="p-6 text-sm">
        This page needs the migration <code>20261111090000_audit_voice_clips.sql</code> pasted into the Supabase SQL editor.
        <div className="mt-2 text-muted-foreground">{(error as any).message}</div>
      </CardContent></Card>
    );
  }

  const expiredCount = (data?.clips ?? []).filter((c) => isExpired(c.delete_after, today())).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Audit clips</h1>
        <p className="text-sm text-muted-foreground">
          Private to admins. Stored in this school's own Supabase project under a code, never a name.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-[18rem_1fr]">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Students</CardTitle>
            <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search students" />
          </CardHeader>
          <CardContent className="max-h-[60vh] space-y-1 overflow-y-auto">
            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
            {students.map((s) => {
              const sub = subjectOf.get(s.id);
              const n = clipsOf.get(s.id)?.length ?? 0;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelected(s.id); setPlaying(null); }}
                  className={`flex min-h-11 w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-muted ${selected === s.id ? "bg-muted font-medium" : ""}`}
                >
                  <span className="truncate">{s.full_name}</span>
                  {sub && <Badge variant="secondary">{sub.code} · {n}</Badge>}
                </button>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          {!student && (
            <Card><CardContent className="p-6 text-sm text-muted-foreground">Pick a student to add their videos.</CardContent></Card>
          )}

          {student && !subject && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck className="h-4 w-4" />{student.full_name}</CardTitle>
                <CardDescription>
                  Before any video is saved, record how this child's parents consented to voice analysis. It is kept with their code.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Label htmlFor="consent">How did the parents consent?</Label>
                <Input id="consent" placeholder='For example: "written, Zalo message 3 Nov"' value={consentNote} onChange={(e) => setConsentNote(e.target.value)} />
                <Button onClick={enrol} disabled={!consentNote.trim() || busy === "enrol"}>
                  {busy === "enrol" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Add to the audit
                </Button>
              </CardContent>
            </Card>
          )}

          {student && subject && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                    {student.full_name} <Badge>{subject.code}</Badge>
                  </CardTitle>
                  <CardDescription>Consent: {subject.consent_note} ({new Date(subject.consent_confirmed_at).toLocaleDateString("en-GB")})</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="src">Where did these come from? (optional)</Label>
                      <Input id="src" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} placeholder="Parent sent on Zalo" />
                    </div>
                    <div>
                      <Label htmlFor="exp">Delete after (optional)</Label>
                      <Input id="exp" type="date" value={deleteAfter} onChange={(e) => setDeleteAfter(e.target.value)} />
                    </div>
                  </div>
                  <input ref={fileInput} type="file" multiple accept={ACCEPTED_TYPES.join(",")} className="hidden"
                    onChange={(e) => upload(e.target.files)} aria-label="Choose video files" />
                  <Button onClick={() => fileInput.current?.click()} disabled={busy === "upload"} className="min-h-11">
                    {busy === "upload" ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Add videos for {student.full_name}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Clips ({clips.length})</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {!clips.length && <p className="text-sm text-muted-foreground">No clips yet.</p>}
                  {clips.map((c) => (
                    <div key={c.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <FileVideo className="h-4 w-4 shrink-0" />
                        <span className="font-mono text-sm">{exportName(subject.code, c.clip_no, extFor(c.mime_type, c.original_name))}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(c.size_bytes)}</span>
                        {c.delete_after && (
                          <Badge variant={isExpired(c.delete_after, today()) ? "destructive" : "outline"}>
                            delete after {c.delete_after}
                          </Badge>
                        )}
                        <div className="ml-auto flex gap-1">
                          <Button size="icon" variant="ghost" aria-label="Play" onClick={() => play(c)}><Play className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Download" onClick={() => download(c)}><Download className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" aria-label="Delete" disabled={busy === c.id} onClick={() => deleteClip(c)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                      {c.source_note && <p className="mt-1 text-xs text-muted-foreground">{c.source_note}</p>}
                      {playing?.id === c.id && <video src={playing.url} controls className="mt-2 max-h-72 w-full rounded" />}
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="text-destructive" onClick={withdraw} disabled={busy === "withdraw"}>
                    Withdraw {subject.code} and delete every clip
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={downloadKey} disabled={!data?.subjects.length}>
              Download key.txt (codes → names)
            </Button>
            {expiredCount > 0 && (
              <Button variant="destructive" size="sm" onClick={deleteExpired} disabled={busy === "expired"}>
                Delete {expiredCount} expired clip{expiredCount > 1 ? "s" : ""}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
