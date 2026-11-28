import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Search, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const BUCKET = "class-highlights";

type Highlight = {
  id: string; class_id: string; session_id: string | null; storage_path: string; title: string | null;
  caption_en: string | null; caption_vi: string | null; student_ids: string[]; duration_seconds: number | null;
  status: "pending" | "approved" | "rejected"; uploaded_by: string; created_at: string; show_until: string | null;
  classes?: { name: string } | null; sessions?: { date: string } | null;
};
type Kid = { id: string; full_name: string; reception_video_opt_out: boolean };

const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Admin > Reception: approve class highlights for the TV, and record families who said no. */
export default function HighlightsReview() {
  const qc = useQueryClient();
  const refresh = () => { qc.invalidateQueries({ queryKey: ["hl-review"] }); qc.invalidateQueries({ queryKey: ["hl-optout"] }); };

  const list = useQuery({
    queryKey: ["hl-review"],
    queryFn: async () => {
      const { data, error } = await supabase.from("class_highlights" as any)
        .select("*, classes(name), sessions(date)").in("status", ["pending", "approved"])
        .order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Highlight[];
      const ids = [...new Set(rows.flatMap((r) => r.student_ids))];
      const kids = new Map<string, Kid>();
      if (ids.length) {
        const { data: ks } = await supabase.from("students").select("id, full_name, reception_video_opt_out" as any).in("id", ids);
        for (const k of (ks ?? []) as unknown as Kid[]) kids.set(k.id, k);
      }
      const users = [...new Set(rows.map((r) => r.uploaded_by))];
      const names = new Map<string, string>();
      if (users.length) {
        const { data: ps } = await supabase.from("profiles").select("id, display_name").in("id", users);
        for (const p of ps ?? []) names.set(p.id, p.display_name ?? "");
      }
      return { rows, kids, names };
    },
  });

  const rows = list.data?.rows ?? [];
  const pending = rows.filter((r) => r.status === "pending");
  const approved = rows.filter((r) => r.status === "approved");

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Class highlights waiting for approval</CardTitle>
          <CardDescription>Clips from teachers and TAs. Nothing reaches the TV until you approve it.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {list.isLoading ? <Loader2 className="h-4 w-4 animate-spin" />
            : list.error ? <p className="text-sm text-destructive">Could not load: {(list.error as Error).message}</p>
            : pending.length === 0 ? <p className="text-sm text-muted-foreground">Nothing waiting.</p>
            : pending.map((r) => <Item key={r.id} r={r} kids={list.data!.kids} uploader={list.data!.names.get(r.uploaded_by)} onDone={refresh} />)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>On the screen now</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {approved.length === 0 ? <p className="text-sm text-muted-foreground">No approved clips.</p>
            : approved.map((r) => <Item key={r.id} r={r} kids={list.data!.kids} uploader={list.data!.names.get(r.uploaded_by)} onDone={refresh} />)}
        </CardContent>
      </Card>

      <OptOut onChange={refresh} />
    </div>
  );
}

function Item({ r, kids, uploader, onDone }: { r: Highlight; kids: Map<string, Kid>; uploader?: string; onDone: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [until, setUntil] = useState(r.show_until ?? plusDays(30));
  const [reason, setReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const tagged = r.student_ids.map((id) => kids.get(id)).filter(Boolean) as Kid[];
  const blocked = tagged.some((k) => k.reception_video_opt_out);

  async function load() {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 600);
    if (error) return toast.error(error.message);
    setUrl(data.signedUrl);
  }

  const approve = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("class_highlights" as any).update({ status: "approved", show_until: until || null, reject_reason: null }).eq("id", r.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { toast.success("Approved. It will show on the TV."); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  // A rejected or removed clip also leaves storage, which is small.
  const reject = useMutation({
    mutationFn: async (why: string) => {
      const { error } = await supabase.from("class_highlights" as any).update({ status: "rejected", reject_reason: why || null }).eq("id", r.id);
      if (error) throw new Error(error.message);
      const rm = await supabase.storage.from(BUCKET).remove([r.storage_path]);
      if (rm.error) toast.error(`Marked, but the file could not be deleted: ${rm.error.message}`);
    },
    onSuccess: () => { toast.success("Done."); onDone(); },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="grid gap-3 md:grid-cols-[minmax(0,320px)_1fr]">
        <div>
          {url ? <video src={url} controls playsInline className="w-full rounded bg-black" />
            : <Button variant="outline" className="aspect-video w-full" onClick={load}>Load preview</Button>}
        </div>
        <div className="space-y-1 text-sm">
          <div className="font-medium">{r.title || "Untitled clip"}</div>
          <div className="text-muted-foreground">
            {r.classes?.name ?? "Class"} · lesson {r.sessions?.date ?? "not set"} · by {uploader || "unknown"}
            {r.duration_seconds ? ` · ${r.duration_seconds}s` : ""}
          </div>
          {(r.caption_en || r.caption_vi) && <div>{r.caption_en}{r.caption_en && r.caption_vi ? " / " : ""}{r.caption_vi}</div>}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {tagged.length === 0 ? <span className="text-muted-foreground">No children tagged</span>
              : tagged.map((k) => (
                <Badge key={k.id} variant={k.reception_video_opt_out ? "destructive" : "secondary"}>
                  {k.full_name}{k.reception_video_opt_out ? " (family said no)" : ""}
                </Badge>
              ))}
          </div>
          {blocked && <p className="text-destructive">A tagged child's family said no to reception videos. This clip cannot be approved.</p>}
        </div>
      </div>

      {r.status === "pending" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm">Show until
            <Input type="date" className="w-40" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <Button size="sm" disabled={blocked || approve.isPending} onClick={() => approve.mutate()}><Check className="mr-1 h-4 w-4" />Approve</Button>
          {rejecting ? (
            <>
              <Input className="w-56" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
              <Button size="sm" variant="destructive" disabled={reject.isPending} onClick={() => reject.mutate(reason.trim())}>Confirm reject</Button>
            </>
          ) : <Button size="sm" variant="outline" onClick={() => setRejecting(true)}><X className="mr-1 h-4 w-4" />Reject</Button>}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Shown until {r.show_until ?? "taken off"}</span>
          <Button size="sm" variant="outline" disabled={reject.isPending}
            onClick={() => { if (window.confirm("Take this clip off the screen? The video file is deleted.")) reject.mutate("removed"); }}>
            Take off screen
          </Button>
        </div>
      )}
    </div>
  );
}

function OptOut({ onChange }: { onChange: () => void }) {
  const [q, setQ] = useState("");
  const found = useQuery({
    queryKey: ["hl-optout", q],
    queryFn: async () => {
      let query: any = (supabase.from("students") as any).select("id, full_name, reception_video_opt_out" as any).order("full_name").limit(30);
      query = q.trim() ? query.ilike("full_name", `%${q.trim()}%`) : query.eq("reception_video_opt_out", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as Kid[];
    },
  });
  const toggle = useMutation({
    mutationFn: async (k: Kid) => {
      const { error } = await supabase.from("students").update({ reception_video_opt_out: !k.reception_video_opt_out } as any).eq("id", k.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { found.refetch(); onChange(); },
    onError: (e: any) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>Families who said no to reception videos</CardTitle>
        <CardDescription>Clips naming these children are never shown on the TV. Search to add a child; with no search, the list shows who is set to no.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search a child" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {found.isLoading ? <Loader2 className="h-4 w-4 animate-spin" />
          : (found.data ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{q.trim() ? "No child found." : "No family has said no."}</p>
          : (found.data ?? []).map((k) => (
            <div key={k.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <span>{k.full_name}</span>
              <label className="flex items-center gap-2">
                {k.reception_video_opt_out ? "Said no" : "OK to show"}
                <Switch checked={k.reception_video_opt_out} disabled={toggle.isPending} onCheckedChange={() => toggle.mutate(k)} />
              </label>
            </div>
          ))}
      </CardContent>
    </Card>
  );
}
