import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Film, Loader2, Trash2, Upload } from "lucide-react";
import Layout from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherClasses } from "@/hooks/useLanguageSupport";
import { videoExt } from "@/lib/receptionMedia";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BUCKET = "class-highlights";
const MAX_BYTES = 41943040; // the bucket's 40 MB
const MAX_SECONDS = 90;

type Row = {
  id: string; class_id: string; storage_path: string; title: string | null; status: "pending" | "approved" | "rejected";
  reject_reason: string | null; duration_seconds: number | null; created_at: string; classes?: { name: string } | null;
};

/** Read a video's length in the browser; null when the browser cannot tell. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.preload = "metadata";
    const done = (n: number | null) => { URL.revokeObjectURL(url); resolve(n); };
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? Math.round(v.duration) : null);
    v.onerror = () => done(null);
    v.src = url;
  });
}

const STATUS_LABEL: Record<Row["status"], string> = { pending: "Waiting for approval", approved: "Approved", rejected: "Not approved" };

/**
 * Class highlights: a teacher or TA uploads a short clip of children from a
 * lesson; an admin approves it (Admin > Reception) before the reception TV
 * may show it. The database decides who may add what (class_highlights RLS).
 */
export default function TeacherHighlights() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: classes = [] } = useTeacherClasses();
  const fileRef = useRef<HTMLInputElement>(null);

  const [classId, setClassId] = useState("");
  const [sessionId, setSessionId] = useState("none");
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [captionVi, setCaptionVi] = useState("");
  const [captionEn, setCaptionEn] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [consent, setConsent] = useState(false);

  const sessions = useQuery({
    queryKey: ["highlight-sessions", classId],
    enabled: !!classId,
    queryFn: async () => {
      const since = new Date(Date.now() - 21 * 86400000).toISOString().slice(0, 10);
      const { data } = await supabase.from("sessions").select("id, date, start_time")
        .eq("class_id", classId).neq("status", "Canceled").gte("date", since).lte("date", new Date().toISOString().slice(0, 10))
        .order("date", { ascending: false }).limit(15);
      return data ?? [];
    },
  });

  const kids = useQuery({
    queryKey: ["highlight-kids", classId],
    enabled: !!classId,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { data } = await supabase.from("enrollments").select("student_id, students!inner(id, full_name)")
        .eq("class_id", classId).lte("start_date", today).or(`end_date.is.null,end_date.gte.${today}`);
      const seen = new Map<string, string>();
      for (const r of (data ?? []) as any[]) seen.set(r.students.id, r.students.full_name);
      return [...seen].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
    },
  });

  const mine = useQuery({
    queryKey: ["my-highlights", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Row[]> => {
      const { data, error } = await supabase.from("class_highlights" as any)
        .select("id, class_id, storage_path, title, status, reject_reason, duration_seconds, created_at, classes(name)")
        .eq("uploaded_by", user!.id).order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  async function pick(f: File | undefined) {
    if (!f) return;
    const ext = videoExt(f);
    if (!ext) return toast.error("Use an MP4, MOV (iPhone) or WebM video. Dùng video MP4, MOV hoặc WebM.");
    if (f.size > MAX_BYTES) return toast.error("Clip too big: keep it under 45 seconds. Clip quá lớn, hãy quay dưới 45 giây.");
    const d = await readDuration(f);
    if (d != null && d > MAX_SECONDS) {
      return toast.error(`That clip is ${d} seconds. Keep it under ${MAX_SECONDS} (15 to 45 is best). Clip dài ${d} giây, hãy giữ dưới ${MAX_SECONDS} giây.`);
    }
    setFile(f);
    setDuration(d);
  }

  const send = useMutation({
    mutationFn: async () => {
      if (!file || !classId) throw new Error("Choose a class and a video.");
      const ext = videoExt(file)!;
      const type = ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : "video/mp4";
      const path = `${classId}/${crypto.randomUUID()}.${ext}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: type, upsert: false });
      if (up.error) throw new Error(up.error.message);
      const { error } = await supabase.from("class_highlights" as any).insert({
        class_id: classId,
        session_id: sessionId === "none" ? null : sessionId,
        storage_path: path,
        title: title.trim() || null,
        caption_vi: captionVi.trim() || null,
        caption_en: captionEn.trim() || null,
        student_ids: picked,
        duration_seconds: duration && duration > 0 ? duration : null,
        uploaded_by: user!.id,
      });
      if (error) {
        await supabase.storage.from(BUCKET).remove([path]); // do not leave a file nobody points at
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      toast.success("Sent for approval. Đã gửi chờ duyệt.");
      setFile(null); setDuration(null); setTitle(""); setCaptionVi(""); setCaptionEn(""); setPicked([]); setConsent(false); setSessionId("none");
      if (fileRef.current) fileRef.current.value = "";
      qc.invalidateQueries({ queryKey: ["my-highlights"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Could not send the video."),
  });

  const remove = useMutation({
    mutationFn: async (r: Row) => {
      const { error } = await supabase.from("class_highlights" as any).delete().eq("id", r.id);
      if (error) throw new Error(error.message);
      await supabase.storage.from(BUCKET).remove([r.storage_path]);
    },
    onSuccess: () => { toast.success("Deleted."); qc.invalidateQueries({ queryKey: ["my-highlights"] }); },
    onError: (e: any) => toast.error(e.message ?? "Could not delete."),
  });

  const ready = !!file && !!classId && consent && !send.isPending;
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <Layout title="Class highlights">
      <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Film className="h-6 w-6 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Class highlights</h1>
            <p className="text-hec-small text-hec-ink-soft">
              A short clip of your class for the reception TV. It shows only after an admin approves it. Clip ngắn của lớp cho TV ở sảnh, chỉ hiện sau khi được duyệt.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>New clip</CardTitle>
            <CardDescription>15 to 45 seconds is best, 90 at most. Landscape (phone on its side) looks best on the TV.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSessionId("none"); setPicked([]); }}>
                  <SelectTrigger><SelectValue placeholder="Choose a class" /></SelectTrigger>
                  <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Lesson (optional)</Label>
                <Select value={sessionId} onValueChange={setSessionId} disabled={!classId}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No lesson</SelectItem>
                    {(sessions.data ?? []).map((s: any) => <SelectItem key={s.id} value={s.id}>{s.date}{s.start_time ? ` ${String(s.start_time).slice(0, 5)}` : ""}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Video</Label>
              <input ref={fileRef} type="file" accept="video/mp4,video/quicktime,video/webm" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" />{file ? "Choose another" : "Record or choose a video"}
                </Button>
                {file && <span className="text-hec-small text-hec-ink-soft">{file.name} · {(file.size / 1048576).toFixed(1)} MB{duration ? ` · ${duration}s` : ""}</span>}
              </div>
              <p className="text-hec-small text-hec-ink-soft">
                iPhone: Settings &gt; Camera &gt; Formats &gt; Most Compatible, so the reception TV can play it. / iPhone: Cài đặt &gt; Camera &gt; Định dạng &gt; Tương thích nhất.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hl-title">Title (optional)</Label>
              <Input id="hl-title" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="hl-vi">Caption, Vietnamese (optional)</Label>
                <Textarea id="hl-vi" maxLength={300} rows={2} value={captionVi} onChange={(e) => setCaptionVi(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="hl-en">Caption, English (optional)</Label>
                <Textarea id="hl-en" maxLength={300} rows={2} value={captionEn} onChange={(e) => setCaptionEn(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Children in the clip</Label>
              {!classId ? <p className="text-hec-small text-hec-ink-soft">Choose a class first.</p>
                : kids.isLoading ? <Loader2 className="h-4 w-4 animate-spin" />
                : (kids.data ?? []).length === 0 ? <p className="text-hec-small text-hec-ink-soft">No children are enrolled in this class now.</p>
                : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(kids.data ?? []).map((k) => (
                      <label key={k.id} className="flex cursor-pointer items-center gap-2 rounded-hec-md border border-hec-line px-3 py-2 text-hec-small">
                        <Checkbox checked={picked.includes(k.id)} onCheckedChange={() => toggle(k.id)} />
                        {k.name}
                      </label>
                    ))}
                  </div>
                )}
            </div>

            <label className="flex cursor-pointer items-start gap-2 text-hec-small">
              <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} className="mt-0.5" />
              <span>Every child in the clip is happy to be filmed. Mọi bé trong clip đều đồng ý được quay.</span>
            </label>

            <Button disabled={!ready} onClick={() => send.mutate()}>
              {send.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {send.isPending ? "Uploading, keep this page open..." : "Send for approval"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>My clips</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {mine.isLoading ? <Loader2 className="h-4 w-4 animate-spin" />
              : (mine.data ?? []).length === 0 ? <p className="text-hec-small text-hec-ink-soft">Nothing sent yet.</p>
              : (mine.data ?? []).map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-hec-md border border-hec-line px-3 py-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-hec-body text-hec-ink">{r.title || "Untitled clip"}</div>
                    <div className="text-hec-small text-hec-ink-soft">
                      {r.classes?.name ?? ""} · {new Date(r.created_at).toLocaleDateString()}{r.duration_seconds ? ` · ${r.duration_seconds}s` : ""}
                      {r.status === "rejected" && r.reject_reason ? ` · ${r.reject_reason}` : ""}
                    </div>
                  </div>
                  <Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{STATUS_LABEL[r.status]}</Badge>
                  {r.status === "pending" && (
                    <Button size="icon" variant="ghost" aria-label="Delete" disabled={remove.isPending}
                      onClick={() => { if (window.confirm("Delete this clip?")) remove.mutate(r); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
