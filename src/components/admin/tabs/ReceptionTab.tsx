/**
 * Admin > Reception: what the reception TV shows.
 *
 * Content   - announcements, awards, success figures, events, photos and
 *             extra programme cards (reception_items).
 * Feedback  - what families send from the QR form. Only messages the sender
 *             agreed to show AND an admin approved reach the screen.
 * Screen    - timing, which sections play, the QR links, the display token
 *             and a live preview of the screen.
 *
 * The leaderboards, champions, courses and figures are live from HEC; nothing
 * here prices or ranks anything. The TV reads it all through reception-feed.
 */
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CheckCircle2, Copy, Eye, EyeOff, Film, Images, ImagePlus, Loader2, MonitorPlay, Pencil, Plus, RefreshCw, Star, Trash2, Tv, Upload, Volume2, VolumeX, Youtube, Power, PowerOff } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { MAX_VIDEO_BYTES, VIDEO_BUCKET, looksLikeDriveLink, uploadForTv, uploadPhotoForTv, videoExt } from "@/lib/receptionMedia";
import { parseYoutubeId } from "@/lib/auditClips";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// The tables are newer than the generated types.
const db = supabase as any;
const KEY = ["reception"] as const;

type Kind = "announcement" | "award" | "course" | "success" | "event" | "photo" | "album" | "video";
type AlbumImage = { url: string; caption?: string | null };
type VideoSource = "upload" | "drive" | "youtube";
type Item = {
  id: string; kind: Kind; title_en: string; title_vi: string | null; body_en: string | null; body_vi: string | null;
  stat_value: string | null; image_url: string | null; student_id: string | null; starts_on: string | null;
  ends_on: string | null; sort_order: number; is_active: boolean; created_at: string;
  images: AlbumImage[]; video_source: VideoSource | null; video_url: string | null; youtube_id: string | null;
  source_url: string | null; play_seconds: number | null; sound: boolean;
};
type Feedback = {
  id: string; name: string | null; relation: string; rating: number | null; message: string; contact: string | null;
  may_show: boolean; approved_at: string | null; created_at: string;
};
type Settings = {
  display_token: string; feedback_url: string | null; zalo_url: string; google_review_url: string;
  scene_seconds: number; sections: Record<string, boolean>; last_seen_at: string | null; youtube_every_minutes: number;
  // Power buttons (migration 20261121090000); absent until it is pasted.
  tv_command?: "on" | "off" | "show" | null; tv_command_at?: string | null; tv_command_done_at?: string | null;
  tv_command_result?: string | null; helper_seen_at?: string | null;
};

const KINDS: { value: Kind; label: string; hint: string }[] = [
  { value: "announcement", label: "Announcement", hint: "News for families: a holiday, a showcase, a new class." },
  { value: "event", label: "Event", hint: "Something with a date: set the start date and it shows the day." },
  { value: "award", label: "Student award", hint: "Pick the student; their name and photo appear with the award." },
  { value: "success", label: "Success figure", hint: "A big number and what it means, e.g. 21 - Summer Camp campers." },
  { value: "album", label: "Picture album", hint: "Several pictures played as a slideshow with a slow pan, each with its own caption." },
  { value: "video", label: "Video", hint: "Upload a video, copy one from Google Drive, or link a YouTube video." },
  { value: "photo", label: "Photo", hint: "A full-screen photo with a caption. Needs an image." },
  { value: "course", label: "Programme feature", hint: "A spotlight card for a programme, on top of the live class list." },
];
const SECTIONS: { key: string; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "parents", label: "For parents (why HEC, Zalo, short messages)" },
  { key: "leaderboard", label: "Centre leaderboard" },
  { key: "classes", label: "Class stars" },
  { key: "awards", label: "Champions & awards" },
  { key: "success", label: "Our success" },
  { key: "courses", label: "Programmes" },
  { key: "albums", label: "Picture albums" },
  { key: "videos", label: "Videos" },
  { key: "photos", label: "Photos" },
  { key: "announcements", label: "News & events" },
  { key: "feedback", label: "Feedback & QR codes" },
];

const blank = (): Partial<Item> => ({ kind: "announcement", title_en: "", title_vi: "", body_en: "", body_vi: "", stat_value: "", image_url: null, student_id: null, starts_on: null, ends_on: null, sort_order: 0, is_active: true, images: [], video_source: "upload", video_url: null, youtube_id: null, source_url: null, play_seconds: null, sound: false });
const newToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
const nullIfBlank = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export default function ReceptionTab() {
  const qc = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: [...KEY, "all"],
    retry: false,
    queryFn: async () => {
      const [items, feedback, settings, students] = await Promise.all([
        db.from("reception_items").select("*").order("kind").order("sort_order").order("created_at", { ascending: false }),
        db.from("reception_feedback").select("*").order("created_at", { ascending: false }).limit(200),
        db.from("reception_settings").select("*").eq("id", true).maybeSingle(),
        db.from("students").select("id, full_name").eq("is_active", true).order("full_name"),
      ]);
      const err = items.error || feedback.error || settings.error || students.error;
      if (err) throw err;
      return {
        items: items.data as Item[],
        feedback: feedback.data as Feedback[],
        settings: settings.data as Settings | null,
        students: students.data as { id: string; full_name: string }[],
      };
    },
  });

  if (isLoading) return <div className="flex items-center gap-2 text-muted-foreground p-6"><Loader2 className="h-4 w-4 animate-spin" /> Loading reception…</div>;
  if (error || !data) {
    const msg = (error as any)?.message ?? "";
    return (
      <Card><CardHeader><CardTitle>Reception display</CardTitle>
        <CardDescription>
          {/schema cache|does not exist/i.test(msg)
            ? "The reception tables are not installed yet. Paste supabase/migrations/20261116090000_reception_display.sql into the Supabase SQL editor."
            : `Could not load: ${msg}`}
        </CardDescription></CardHeader></Card>
    );
  }

  const pending = data.feedback.filter((f) => !f.approved_at).length;
  const refresh = () => qc.invalidateQueries({ queryKey: KEY });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Tv className="h-6 w-6" /> Reception display</h1>
          <p className="text-muted-foreground text-sm">What the TV in reception shows. Leaderboards, champions, programmes and figures update on their own from HEC.</p>
        </div>
        <ScreenStatus settings={data.settings} />
      </div>
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="feedback">Feedback {pending > 0 && <Badge className="ml-2" variant="destructive">{pending}</Badge>}</TabsTrigger>
          <TabsTrigger value="screen">Screen</TabsTrigger>
        </TabsList>
        <TabsContent value="content"><ContentPanel items={data.items} students={data.students} onChange={refresh} /></TabsContent>
        <TabsContent value="feedback"><FeedbackPanel feedback={data.feedback} onChange={refresh} /></TabsContent>
        <TabsContent value="screen" className="space-y-6">
          {data.settings && <TvPowerCard settings={data.settings} onChange={refresh} />}
          {data.settings && <ScreenPanel settings={data.settings} onChange={refresh} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScreenStatus({ settings }: { settings: Settings | null }) {
  const seen = settings?.last_seen_at ? new Date(settings.last_seen_at) : null;
  const minutes = seen ? Math.round((Date.now() - seen.getTime()) / 60000) : null;
  const live = minutes !== null && minutes <= 10;
  return (
    <Badge variant={live ? "default" : "secondary"} className="gap-1.5 py-1">
      <span className={`h-2 w-2 rounded-full ${live ? "bg-green-400" : "bg-muted-foreground"}`} />
      {seen ? (live ? "Screen on now" : `Screen last checked in ${minutes! < 120 ? `${minutes} min` : seen.toLocaleString()} ago`) : "Screen has not checked in yet"}
    </Badge>
  );
}

// ------------------------------------------------------------------ content
function ContentPanel({ items, students, onChange }: { items: Item[]; students: { id: string; full_name: string }[]; onChange: () => void }) {
  const [editing, setEditing] = useState<Partial<Item> | null>(null);
  const studentName = useMemo(() => new Map(students.map((s) => [s.id, s.full_name])), [students]);
  const today = new Date().toISOString().slice(0, 10);

  const toggle = useMutation({
    mutationFn: async (i: Item) => {
      const { error } = await db.from("reception_items").update({ is_active: !i.is_active, updated_at: new Date().toISOString() }).eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: onChange,
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (i: Item) => {
      const { error } = await db.from("reception_items").delete().eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removed from the screen."); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Content</CardTitle>
          <CardDescription>Each item plays as its own scene (news and events three at a time). Dated items show only between their dates.</CardDescription>
        </div>
        <Button onClick={() => setEditing(blank())}><Plus className="h-4 w-4 mr-1" /> Add</Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing added yet. The screen still plays the live leaderboards, champions, programmes and figures.</p>}
        {items.map((i) => {
          // Same rule as reception-feed: an event shows until its day (or "show until") has passed.
          const last = i.kind === "event" ? i.ends_on ?? i.starts_on : i.ends_on;
          const out = (last && last < today) || (i.kind !== "event" && i.starts_on && i.starts_on > today);
          return (
            <div key={i.id} className="flex items-center gap-3 rounded-lg border p-3">
              {(i.image_url || i.images?.[0]?.url)
                ? <img src={i.image_url || i.images[0].url} alt="" className="h-12 w-16 rounded object-cover" />
                : <div className="h-12 w-16 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">
                    {i.kind === "video" ? (i.video_source === "youtube" ? <Youtube className="h-5 w-5" /> : <Film className="h-5 w-5" />) : i.stat_value || KINDS.find((k) => k.value === i.kind)?.label.split(" ")[0]}
                  </div>}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium truncate">{i.title_en}</span>
                  <Badge variant="outline">{KINDS.find((k) => k.value === i.kind)?.label}</Badge>
                  {!i.is_active && <Badge variant="secondary">Hidden</Badge>}
                  {i.is_active && out && <Badge variant="secondary">Outside its dates</Badge>}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {[i.student_id ? studentName.get(i.student_id) : null,
                    i.kind === "album" ? `${i.images.length} picture${i.images.length === 1 ? "" : "s"}` : null,
                    i.kind === "video" ? `${i.video_source === "youtube" ? "YouTube" : i.video_source === "drive" ? "from Drive" : "uploaded"} · ${i.play_seconds ? `${i.play_seconds}s` : "to the end"} · ${i.sound ? "sound on" : "muted"}` : null,
                    i.title_vi, i.starts_on && `from ${i.starts_on}`, i.ends_on && `until ${i.ends_on}`].filter(Boolean).join(" · ")}
                </div>
              </div>
              <Button size="icon" variant="ghost" title={i.is_active ? "Hide" : "Show"} onClick={() => toggle.mutate(i)}>{i.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</Button>
              <Button size="icon" variant="ghost" title="Edit" onClick={() => setEditing(i)}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" title="Delete" onClick={() => { if (confirm(`Delete "${i.title_en}"?`)) remove.mutate(i); }}><Trash2 className="h-4 w-4" /></Button>
            </div>
          );
        })}
      </CardContent>
      {editing && <ItemDialog item={editing} students={students} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); onChange(); }} />}
    </Card>
  );
}

function ItemDialog({ item, students, onClose, onSaved }: { item: Partial<Item>; students: { id: string; full_name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<Partial<Item>>(item);
  const [uploading, setUploading] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const set = (k: keyof Item, v: any) => setF((x) => ({ ...x, [k]: v }));
  const kind = KINDS.find((k) => k.value === f.kind)!;

  // Pictures are shrunk to TV size in the browser first (src/lib/receptionMedia.ts).
  const upload = async (picked: File) => {
    setUploading(true);
    try {
      set("image_url", await uploadPhotoForTv(picked));
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      if (!f.title_en?.trim()) throw new Error("An English title is needed.");
      if (f.kind === "photo" && !f.image_url) throw new Error("A photo item needs an image.");
      if (f.kind === "award" && !f.student_id) throw new Error("Pick the student for this award.");
      if (f.kind === "album" && !(f.images?.length)) throw new Error("Add at least one picture to the album.");
      if (f.kind === "video") {
        if (f.video_source === "youtube" && !f.youtube_id) throw new Error("Paste the YouTube link.");
        if (f.video_source === "youtube" && !f.play_seconds) throw new Error("For a YouTube video, enter how many seconds to play (the TV cannot tell when it ends).");
        if (f.video_source !== "youtube" && !f.video_url) throw new Error(f.video_source === "drive" ? "Copy the video from Drive first." : "Upload the video first.");
      }
      const isVideo = f.kind === "video";
      const row = {
        kind: f.kind, title_en: f.title_en.trim(), title_vi: nullIfBlank(f.title_vi), body_en: nullIfBlank(f.body_en), body_vi: nullIfBlank(f.body_vi),
        stat_value: nullIfBlank(f.stat_value), image_url: f.image_url ?? null, student_id: f.kind === "award" ? f.student_id : null,
        starts_on: f.starts_on || null, ends_on: f.ends_on || null, sort_order: Number(f.sort_order) || 0, is_active: f.is_active ?? true,
        images: f.kind === "album" ? (f.images ?? []).map((m) => ({ url: m.url, caption: nullIfBlank(m.caption ?? null) })) : [],
        video_source: isVideo ? f.video_source : null,
        video_url: isVideo && f.video_source !== "youtube" ? f.video_url : null,
        youtube_id: isVideo && f.video_source === "youtube" ? f.youtube_id : null,
        source_url: isVideo ? nullIfBlank(f.source_url) : null,
        play_seconds: isVideo && f.play_seconds ? Number(f.play_seconds) : null,
        sound: isVideo ? !!f.sound : false,
        updated_at: new Date().toISOString(),
      };
      const { error } = f.id
        ? await db.from("reception_items").update(row).eq("id", f.id)
        : await db.from("reception_items").insert(row);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved. The screen picks it up within 3 minutes."); onSaved(); },
    onError: (e: any) => toast.error(e.message),
  });

  const matches = students.filter((s) => s.full_name.toLowerCase().includes(studentSearch.toLowerCase())).slice(0, 50);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{f.id ? "Edit" : "Add to the screen"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={f.kind} onValueChange={(v) => set("kind", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{KINDS.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}</SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{kind.hint}</p>
          </div>
          {f.kind === "award" && (
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Input placeholder="Search a name…" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} />
              <Select value={f.student_id ?? ""} onValueChange={(v) => set("student_id", v)}>
                <SelectTrigger><SelectValue placeholder="Choose the student" /></SelectTrigger>
                <SelectContent>{matches.map((s) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Title (English)</Label><Input maxLength={120} value={f.title_en ?? ""} onChange={(e) => set("title_en", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Title (Tiếng Việt)</Label><Input maxLength={160} value={f.title_vi ?? ""} onChange={(e) => set("title_vi", e.target.value)} /></div>
          </div>
          {f.kind === "success" ? (
            <div className="space-y-1.5"><Label>The figure</Label><Input maxLength={24} placeholder="e.g. 21, 360+, 95%" value={f.stat_value ?? ""} onChange={(e) => set("stat_value", e.target.value)} /></div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Text (English)</Label><Textarea maxLength={600} rows={4} value={f.body_en ?? ""} onChange={(e) => set("body_en", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Text (Tiếng Việt)</Label><Textarea maxLength={800} rows={4} value={f.body_vi ?? ""} onChange={(e) => set("body_vi", e.target.value)} /></div>
            </div>
          )}
          {f.kind === "album" && <AlbumEditor images={f.images ?? []} onChange={(v) => set("images", v)} />}
          {f.kind === "video" && <VideoEditor f={f} set={set} />}
          {f.kind !== "success" && f.kind !== "album" && f.kind !== "video" && (
            <div className="space-y-1.5">
              <Label>Image {f.kind === "photo" ? "" : "(optional)"}</Label>
              <div className="flex items-center gap-3">
                {f.image_url && <img src={f.image_url} alt="" className="h-20 w-32 rounded object-cover border" />}
                <input ref={file} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                <Button type="button" variant="outline" disabled={uploading} onClick={() => file.current?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ImagePlus className="h-4 w-4 mr-1" />} {f.image_url ? "Replace" : "Upload"}
                </Button>
                {f.image_url && <Button type="button" variant="ghost" onClick={() => set("image_url", null)}>Remove</Button>}
              </div>
              <p className="text-xs text-muted-foreground">Landscape photos look best (the screen is 16:9). Anyone with the link can open an uploaded image.</p>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5"><Label>{f.kind === "event" ? "Event date" : "Show from"}</Label><Input type="date" value={f.starts_on ?? ""} onChange={(e) => set("starts_on", e.target.value || null)} /></div>
            <div className="space-y-1.5"><Label>Show until</Label><Input type="date" value={f.ends_on ?? ""} onChange={(e) => set("ends_on", e.target.value || null)} /></div>
            <div className="space-y-1.5"><Label>Order</Label><Input type="number" value={f.sort_order ?? 0} onChange={(e) => set("sort_order", e.target.value)} /></div>
          </div>
          {f.kind === "event" && <p className="text-xs text-muted-foreground">An event shows from today until its "show until" date; the event date is printed on the card.</p>}
          <div className="flex items-center gap-2"><Switch checked={f.is_active ?? true} onCheckedChange={(v) => set("is_active", v)} /><Label>Show on the screen</Label></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || uploading}>{save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ------------------------------------------------------------------ album
function AlbumEditor({ images, onChange }: { images: AlbumImage[]; onChange: (v: AlbumImage[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<{ done: number; total: number } | null>(null);
  const latest = useRef(images);
  latest.current = images;

  const add = async (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (input.current) input.current.value = "";
    if (!list.length) return;
    if (images.length + list.length > 80) return toast.error("An album holds up to 80 pictures.");
    setBusy({ done: 0, total: list.length });
    for (const file of list) {
      try {
        const url = await uploadPhotoForTv(file, "albums");
        latest.current = [...latest.current, { url, caption: "" }];
        onChange(latest.current);
      } catch (e: any) {
        toast.error(e.message ?? `${file.name}: upload failed.`);
      }
      setBusy((b) => (b ? { ...b, done: b.done + 1 } : b));
    }
    setBusy(null);
  };
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Pictures ({images.length})</Label>
        <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif" className="hidden" onChange={(e) => add(e.target.files)} />
        <Button type="button" variant="outline" size="sm" disabled={!!busy} onClick={() => input.current?.click()}>
          {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Images className="h-4 w-4 mr-1" />}
          {busy ? `Uploading ${busy.done}/${busy.total}` : "Add pictures"}
        </Button>
      </div>
      {busy && <Progress value={(busy.done / busy.total) * 100} aria-label="Album upload progress" />}
      {images.length === 0 && !busy && <p className="text-xs text-muted-foreground">Pick several pictures at once. They are shrunk to TV size before upload, so phone photos are fine.</p>}
      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
        {images.map((m, i) => (
          <div key={m.url} className="flex items-center gap-2 rounded border p-2">
            <img src={m.url} alt="" className="h-14 w-24 rounded object-cover" />
            <Input className="flex-1" maxLength={140} placeholder="Caption (optional)" value={m.caption ?? ""}
              onChange={(e) => onChange(images.map((x, k) => (k === i ? { ...x, caption: e.target.value } : x)))} />
            <Button type="button" size="icon" variant="ghost" title="Earlier" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="ghost" title="Later" disabled={i === images.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-4 w-4" /></Button>
            <Button type="button" size="icon" variant="ghost" title="Remove" onClick={() => onChange(images.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Each picture shows for about 6 seconds with a slow pan; the album title and your captions show along the bottom.</p>
    </div>
  );
}

// ------------------------------------------------------------------ video
function VideoEditor({ f, set }: { f: Partial<Item>; set: (k: keyof Item, v: any) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [pct, setPct] = useState<number | null>(null);
  const [link, setLink] = useState(f.source_url ?? "");
  const [copying, setCopying] = useState(false);
  const source = (f.video_source ?? "upload") as VideoSource;

  const pick = async (file?: File) => {
    if (input.current) input.current.value = "";
    if (!file) return;
    const ext = videoExt(file);
    if (!ext) return toast.error(`${file.name}: use an MP4, MOV (iPhone) or WebM video.`);
    if (file.size > MAX_VIDEO_BYTES) return toast.error(`${file.name} is ${Math.round(file.size / 1048576)} MB; the limit is 250 MB.`);
    setPct(0);
    try {
      const type = ext === "mov" ? "video/quicktime" : ext === "webm" ? "video/webm" : "video/mp4";
      const url = await uploadForTv(VIDEO_BUCKET, "uploads", file, type, ext, setPct);
      set("video_url", url);
      set("source_url", null);
      toast.success("Video uploaded.");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed.");
    } finally {
      setPct(null);
    }
  };

  const copyFromDrive = async () => {
    if (!looksLikeDriveLink(link)) return toast.error("Paste a Google Drive file link (drive.google.com/file/d/…).");
    setCopying(true);
    try {
      const { data, error } = await supabase.functions.invoke("reception-drive-import", { body: { link: link.trim() } });
      if (error) {
        let msg = error.message;
        try { msg = (await (error as any).context?.json?.())?.error ?? msg; } catch { /* keep the message */ }
        throw new Error(msg);
      }
      if (data?.error) throw new Error(data.error);
      set("video_url", data.url);
      set("source_url", link.trim());
      toast.success(`Copied from Drive${data.bytes ? ` (${Math.round(data.bytes / 1048576)} MB)` : ""}.`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not copy the video from Drive.");
    } finally {
      setCopying(false);
    }
  };

  const setYoutube = (v: string) => {
    setLink(v);
    set("source_url", v.trim() || null);
    set("youtube_id", parseYoutubeId(v));
  };

  const choose = (v: VideoSource) => {
    if (v === source) return;
    set("video_source", v);
    set("video_url", null);
    set("youtube_id", null);
    set("source_url", null);
    setLink("");
  };

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant={source === "upload" ? "default" : "outline"} onClick={() => choose("upload")}><Upload className="h-4 w-4 mr-1" /> Upload a file</Button>
        <Button type="button" size="sm" variant={source === "drive" ? "default" : "outline"} onClick={() => choose("drive")}><Film className="h-4 w-4 mr-1" /> Google Drive link</Button>
        {/* YouTube links are retired (owner, 16 Nov): the TV's YouTube app asks for a sign-in.
            Download your own videos from YouTube Studio and upload them instead. Shown only to edit an old one. */}
        {source === "youtube" && <Button type="button" size="sm" variant="default"><Youtube className="h-4 w-4 mr-1" /> YouTube link</Button>}
      </div>

      {source === "upload" && (
        <div className="space-y-2">
          <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          <Button type="button" variant="outline" disabled={pct !== null} onClick={() => input.current?.click()}>
            {pct !== null ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Upload className="h-4 w-4 mr-1" />}
            {pct !== null ? `Uploading ${pct}%` : f.video_url ? "Replace the video" : "Choose a video"}
          </Button>
          {pct !== null && <Progress value={pct} aria-label="Video upload progress" />}
          <p className="text-xs text-muted-foreground">MP4, iPhone MOV or WebM, up to 250 MB. Keep this window open until it reaches 100%. A video on HEC's YouTube channel: download it from YouTube Studio (Content › ⋮ › Download) and upload it here.</p>
        </div>
      )}

      {source === "drive" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input placeholder="https://drive.google.com/file/d/…" value={link} onChange={(e) => setLink(e.target.value)} />
            <Button type="button" onClick={copyFromDrive} disabled={copying}>{copying && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Copy video</Button>
          </div>
          <p className="text-xs text-muted-foreground">In Drive, set Share › General access to "Anyone with the link". The TV cannot run Drive's own player, so the video is copied into HEC once (up to 250 MB); a big file takes a minute or two.</p>
        </div>
      )}

      {source === "youtube" && (
        <div className="space-y-2">
          <Input placeholder="https://www.youtube.com/watch?v=…" value={link || f.source_url || ""} onChange={(e) => setYoutube(e.target.value)} />
          {(link || f.source_url) && !f.youtube_id && <p className="text-xs text-destructive">That is not a YouTube video link.</p>}
          <p className="text-xs text-muted-foreground">
            The TV's 2016 browser cannot play YouTube inside the display, so the helper on the centre's computer switches the TV to its YouTube app
            for this video, then brings the display back. YouTube videos take turns, one every few minutes (set under Screen).
          </p>
        </div>
      )}

      {f.video_url && source !== "youtube" && <video src={f.video_url} controls muted className="w-full max-h-56 rounded bg-black" />}
      {f.youtube_id && source === "youtube" && <img src={`https://i.ytimg.com/vi/${f.youtube_id}/hqdefault.jpg`} alt="" className="w-full max-h-56 rounded object-cover" />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Play for (seconds){source === "youtube" ? "" : " - blank plays to the end"}</Label>
          <Input type="number" min={5} max={3600} placeholder={source === "youtube" ? "e.g. 90" : "to the end"} value={f.play_seconds ?? ""}
            onChange={(e) => set("play_seconds", e.target.value ? Number(e.target.value) : null)} />
        </div>
        <div className="space-y-1.5">
          <Label>Sound</Label>
          <div className="flex items-center gap-2 h-10 text-sm">
            <Switch checked={!!f.sound} onCheckedChange={(v) => set("sound", v)} />
            {f.sound ? <><Volume2 className="h-4 w-4" /> Plays with sound</> : <><VolumeX className="h-4 w-4" /> Muted</>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ feedback
function FeedbackPanel({ feedback, onChange }: { feedback: Feedback[]; onChange: () => void }) {
  const set = useMutation({
    mutationFn: async ({ f, approve }: { f: Feedback; approve: boolean }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await db.from("reception_feedback")
        .update(approve ? { approved_at: new Date().toISOString(), approved_by: u.user?.id ?? null } : { approved_at: null, approved_by: null })
        .eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: onChange,
    onError: (e: any) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (f: Feedback) => {
      const { error } = await db.from("reception_feedback").delete().eq("id", f.id);
      if (error) throw error;
    },
    onSuccess: onChange,
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback</CardTitle>
        <CardDescription>
          Sent from the QR code on the screen. A message appears on the screen only when the sender ticked "you may show this" and you approve it.
          Messages the sender kept private are for you only; approving one marks it as read.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {feedback.length === 0 && <p className="text-sm text-muted-foreground">No feedback yet.</p>}
        {feedback.map((f) => (
          <div key={f.id} className={`rounded-lg border p-4 ${f.approved_at ? "" : "border-primary/50 bg-primary/5"}`}>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{f.name || "No name"}</span>
              <Badge variant="outline">{f.relation}</Badge>
              {f.rating && <span className="flex items-center text-amber-500">{Array.from({ length: f.rating }, (_, i) => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}</span>}
              {f.may_show ? <Badge variant="secondary">May be shown</Badge> : <Badge variant="outline">Private</Badge>}
              {f.approved_at && (f.may_show ? <Badge className="gap-1"><MonitorPlay className="h-3 w-3" /> On the screen</Badge> : <Badge variant="secondary">Read</Badge>)}
              <span className="ml-auto text-xs text-muted-foreground">{new Date(f.created_at).toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{f.message}</p>
            {f.contact && <p className="mt-1 text-xs text-muted-foreground">Contact: {f.contact}</p>}
            <div className="mt-3 flex gap-2">
              {f.approved_at
                ? <Button size="sm" variant="outline" onClick={() => set.mutate({ f, approve: false })}>{f.may_show ? "Take off the screen" : "Mark unread"}</Button>
                : <Button size="sm" onClick={() => set.mutate({ f, approve: true })}><CheckCircle2 className="h-4 w-4 mr-1" /> {f.may_show ? "Approve for the screen" : "Mark read"}</Button>}
              <Button size="sm" variant="ghost" onClick={() => { if (confirm("Delete this feedback?")) remove.mutate(f); }}><Trash2 className="h-4 w-4 mr-1" /> Delete</Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ TV power
// The admin page cannot reach the TV, so a button leaves a command in
// reception_settings; the helper on the centre's computer picks it up within
// 20 seconds (scripts/reception-tv.mjs) and writes back what happened.
const COMMAND_LABEL: Record<string, string> = { on: "Turn on", off: "Turn off", show: "Show the display" };

function TvPowerCard({ settings, onChange }: { settings: Settings; onChange: () => void }) {
  const qc = useQueryClient();
  const installed = "tv_command" in settings || "helper_seen_at" in settings;
  const helperSeen = settings.helper_seen_at ? new Date(settings.helper_seen_at) : null;
  const helperLive = !!helperSeen && Date.now() - helperSeen.getTime() < 2 * 60 * 1000;
  const at = settings.tv_command_at ? Date.parse(settings.tv_command_at) : 0;
  const done = settings.tv_command_done_at ? Date.parse(settings.tv_command_done_at) : 0;
  const pending = !!settings.tv_command && at > done && Date.now() - at < 15 * 60 * 1000;
  const expired = !!settings.tv_command && at > done && !pending;

  // While a command waits, look again every 4 s for the helper's answer.
  useQuery({
    queryKey: [...KEY, "power-poll", settings.tv_command_at],
    enabled: pending,
    refetchInterval: 4000,
    queryFn: async () => { await qc.invalidateQueries({ queryKey: [...KEY, "all"] }); return Date.now(); },
  });

  const send = useMutation({
    mutationFn: async (command: "on" | "off" | "show") => {
      const { error } = await db.from("reception_settings")
        .update({ tv_command: command, tv_command_at: new Date().toISOString(), tv_command_result: null })
        .eq("id", true);
      if (error) throw error;
    },
    onSuccess: (_d, c) => { toast.success(`${COMMAND_LABEL[c]}: sent to the reception computer.`); onChange(); },
    onError: (e: any) => toast.error(/tv_command|schema cache|column/i.test(e.message ?? "")
      ? "The power buttons are not installed yet: paste migration 20261121090000_reception_tv_commands.sql in Supabase."
      : e.message),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2"><Tv className="h-5 w-5" /> Reception TV</CardTitle>
          <CardDescription>
            Switch the TV from here. The computer at the centre does it within about 20 seconds; it switches the TV on and off by itself at opening and closing times too.
          </CardDescription>
        </div>
        <Badge variant={helperLive ? "default" : "secondary"} className="gap-1.5 py-1">
          <span className={`h-2 w-2 rounded-full ${helperLive ? "bg-green-400" : "bg-muted-foreground"}`} />
          {helperLive ? "Reception computer connected" : helperSeen ? `Reception computer last seen ${helperSeen.toLocaleString()}` : "Reception computer not connected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => send.mutate("on")} disabled={send.isPending || pending}><Power className="h-4 w-4 mr-1" /> Turn on</Button>
          <Button variant="outline" onClick={() => send.mutate("show")} disabled={send.isPending || pending}><MonitorPlay className="h-4 w-4 mr-1" /> Show the display</Button>
          <Button variant="outline" onClick={() => { if (confirm("Turn the reception TV off? It stays off until its next opening time.")) send.mutate("off"); }} disabled={send.isPending || pending}>
            <PowerOff className="h-4 w-4 mr-1" /> Turn off
          </Button>
        </div>
        {!installed && <p className="text-sm text-muted-foreground">Not installed yet: paste migration 20261121090000_reception_tv_commands.sql in Supabase.</p>}
        {pending && (
          <p className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />
            {COMMAND_LABEL[settings.tv_command!]}: waiting for the reception computer{helperLive ? "…" : " (it has not checked in recently, so this may not happen)."}
          </p>
        )}
        {!pending && settings.tv_command_result && (
          <p className="text-sm text-muted-foreground">
            Last: {COMMAND_LABEL[settings.tv_command ?? ""] ?? settings.tv_command} · {settings.tv_command_result}
            {settings.tv_command_done_at ? ` (${new Date(settings.tv_command_done_at).toLocaleTimeString()})` : ""}
          </p>
        )}
        {expired && <p className="text-sm text-destructive">The reception computer did not pick up the last command within 15 minutes. Check it is switched on and signed in.</p>}
        {installed && !helperLive && (
          <p className="text-xs text-muted-foreground">The buttons work while the computer at the centre is on and signed in (later, the Raspberry Pi).</p>
        )}
      </CardContent>
    </Card>
  );
}

// ------------------------------------------------------------------ screen
function ScreenPanel({ settings, onChange }: { settings: Settings; onChange: () => void }) {
  const defaultFeedbackUrl = `${window.location.origin}/feedback`;
  const [f, setF] = useState({
    scene_seconds: settings.scene_seconds,
    sections: { ...Object.fromEntries(SECTIONS.map((s) => [s.key, true])), ...(settings.sections ?? {}) } as Record<string, boolean>,
    feedback_url: settings.feedback_url ?? defaultFeedbackUrl,
    zalo_url: settings.zalo_url,
    google_review_url: settings.google_review_url,
    youtube_every_minutes: settings.youtube_every_minutes ?? 10,
  });
  const [showToken, setShowToken] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const previewUrl = `/reception-tv/index.html#token=${settings.display_token}`;

  const save = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      for (const k of ["feedback_url", "zalo_url", "google_review_url"]) {
        if (k in patch && !/^https:\/\//.test(String(patch[k]))) throw new Error("Links must start with https://");
      }
      const { error } = await db.from("reception_settings").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", true);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Saved. The screen picks it up within 3 minutes."); onChange(); setPreviewKey((k) => k + 1); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <Card>
        <CardHeader><CardTitle>Settings</CardTitle><CardDescription>Timing, sections and the three QR codes.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label>Seconds per scene</Label>
            <Input type="number" min={6} max={120} value={f.scene_seconds} onChange={(e) => setF({ ...f, scene_seconds: Number(e.target.value) })} />
            <p className="text-xs text-muted-foreground">The leaderboard, programmes and feedback scenes stay a little longer.</p>
          </div>
          <div className="space-y-2">
            <Label>Sections</Label>
            <div className="grid grid-cols-2 gap-2">
              {SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <Switch checked={f.sections[s.key] !== false} onCheckedChange={(v) => setF({ ...f, sections: { ...f.sections, [s.key]: v } })} /> {s.label}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Feedback form link</Label><Input value={f.feedback_url} onChange={(e) => setF({ ...f, feedback_url: e.target.value })} />
            <p className="text-xs text-muted-foreground">Normally {defaultFeedbackUrl}</p></div>
          <div className="space-y-1.5"><Label>Zalo link</Label><Input value={f.zalo_url} onChange={(e) => setF({ ...f, zalo_url: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Google review link</Label><Input value={f.google_review_url} onChange={(e) => setF({ ...f, google_review_url: e.target.value })} /></div>
          <Button onClick={() => save.mutate(f)} disabled={save.isPending}>{save.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save settings</Button>

          <div className="border-t pt-4 space-y-2">
            <Label>Display token</Label>
            <p className="text-xs text-muted-foreground">The TV's key to the feed. It is built into the LG app when it is installed; changing it disconnects the TV until the app is reinstalled with the new one.</p>
            <div className="flex gap-2">
              <Input readOnly value={showToken ? settings.display_token : "•".repeat(24)} className="font-mono text-xs" />
              <Button size="icon" variant="outline" onClick={() => setShowToken((s) => !s)} title={showToken ? "Hide" : "Show"}>{showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
              <Button size="icon" variant="outline" title="Copy" onClick={() => { navigator.clipboard.writeText(settings.display_token); toast.success("Copied."); }}><Copy className="h-4 w-4" /></Button>
              <Button size="icon" variant="outline" title="Make a new token" onClick={() => {
                if (confirm("Make a new display token? The TV stops updating until the app is reinstalled with the new token.")) save.mutate({ display_token: newToken() });
              }}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div><CardTitle>Preview</CardTitle><CardDescription>Exactly what the TV shows, live. Any browser can also show it full screen.</CardDescription></div>
          <Button variant="outline" asChild><a href={previewUrl} target="_blank" rel="noreferrer"><MonitorPlay className="h-4 w-4 mr-1" /> Open full screen</a></Button>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-hidden rounded-lg border bg-black" style={{ aspectRatio: "16 / 9" }}>
            <iframe key={previewKey} title="Reception preview" src={previewUrl} className="absolute inset-0 h-full w-full" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
