/**
 * StaffWorkGallery - the student works gallery for admin and teacher.
 *
 * Both read a database function that already decided what this person may see
 * (admin_work_gallery / teacher_work_gallery); this only renders it. Group by
 * whole school, class, family or student; the groups are sorted by name.
 * Teachers also see the children's requests to share into the class gallery,
 * and approve or decline them here (decide_work_share).
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ExternalLink, FileImage, FileText, Link2, Loader2, Play, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { files as fileStore } from "@/lib/files";
import { safeHttpUrl } from "@/lib/safeUrl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  filterWork, groupWork, isImagePath, sourceLabel, studentNames,
  type GroupBy, type WorkItem,
} from "@/lib/workGallery";

const GROUPS: { id: GroupBy; label: string }[] = [
  { id: "school", label: "Whole school" },
  { id: "class", label: "Class" },
  { id: "family", label: "Family" },
  { id: "student", label: "Student" },
];

interface Props {
  mode: "admin" | "teacher";
  rpc: "admin_work_gallery" | "teacher_work_gallery";
}

export function StaffWorkGallery({ mode, rpc }: Props) {
  const qc = useQueryClient();
  const [by, setBy] = useState<GroupBy>(mode === "admin" ? "school" : "class");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [requestsOnly, setRequestsOnly] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["work-gallery", rpc],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(rpc);
      if (error) throw error;
      return (data ?? []) as WorkItem[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ shareId, approve }: { shareId: string; approve: boolean }) => {
      const { error } = await (supabase as any).rpc("decide_work_share", { p_share_id: shareId, p_approve: approve });
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.approve ? "Shared with the class" : "Not shared");
      qc.invalidateQueries({ queryKey: ["work-gallery"] });
    },
    onError: (e: any) => toast.error("Could not save", { description: e.message }),
  });

  const all = data ?? [];
  const pending = all.filter((i) => i.share_status === "pending").length;
  const statuses = useMemo(() => [...new Set(all.map((i) => i.status))].sort(), [all]);

  const shown = useMemo(() => {
    let rows = filterWork(all, q);
    if (status !== "all") rows = rows.filter((i) => i.status === status);
    if (requestsOnly) rows = rows.filter((i) => i.share_status === "pending");
    return rows;
  }, [all, q, status, requestsOnly]);
  const groups = useMemo(() => groupWork(shown, by), [shown, by]);

  // One signed link per file, for the images on screen.
  const paths = useMemo(() => {
    const out: Record<string, string[]> = {};
    for (const i of shown) {
      if (i.file_path && i.kind === "file" && isImagePath(i.file_path)) (out[i.bucket] ??= []).push(i.file_path);
    }
    return out;
  }, [shown]);
  const { data: urls = {} } = useQuery({
    queryKey: ["work-gallery-urls", Object.entries(paths).map(([b, p]) => `${b}:${p.length}:${p[0]}`).join("|")],
    enabled: Object.keys(paths).length > 0,
    queryFn: async () => {
      const out: Record<string, string> = {};
      for (const [bucket, list] of Object.entries(paths)) {
        const signed = await fileStore.signedUrls(bucket, [...new Set(list)], 3600);
        for (const [p, u] of Object.entries(signed)) out[`${bucket}/${p}`] = u;
      }
      return out;
    },
  });

  const open = async (i: WorkItem) => {
    if (i.external_url) { const u = safeHttpUrl(i.external_url); if (u) window.open(u, "_blank", "noopener,noreferrer"); return; }
    if (!i.file_path) return;
    const u = await fileStore.signedUrl(i.bucket, i.file_path, 600);
    if (u) window.open(u, "_blank", "noopener,noreferrer"); else toast.error("This file is not available");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Group by" className="flex flex-wrap gap-1">
          {GROUPS.map((g) => (
            <Button key={g.id} size="sm" variant={by === g.id ? "default" : "outline"} onClick={() => setBy(g.id)}
              aria-pressed={by === g.id}>{g.label}</Button>
          ))}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, class, family, title"
          aria-label="Search" className="h-9 w-full sm:w-72" />
        {mode === "admin" && (
          <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            <option value="all">Every status</option>
            {statuses.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
          </select>
        )}
        {pending > 0 && (
          <Button size="sm" variant={requestsOnly ? "default" : "outline"} onClick={() => setRequestsOnly((v) => !v)}
            aria-pressed={requestsOnly}>
            Share requests <Badge variant="secondary" className="ml-1.5">{pending}</Badge>
          </Button>
        )}
      </div>

      {isLoading && <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-hec-ink-faint" /></div>}
      {error && <p className="text-hec-small text-destructive">Could not load: {(error as Error).message}</p>}
      {!isLoading && !error && groups.length === 0 && (
        <div className="py-12 text-center space-y-2">
          <FileImage className="mx-auto h-10 w-10 text-hec-ink-faint" />
          <p className="text-hec-body font-medium text-hec-ink">No student work to show</p>
          {mode === "teacher" && (
            <p className="mx-auto max-w-md text-hec-small text-hec-ink-soft">
              You see work from children now in your classes, dated from your first lesson of a class
              (or the day you covered one).
            </p>
          )}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} aria-label={g.label} className="space-y-2">
          {by !== "school" && (
            <h2 className="font-display text-hec-h3 font-medium text-hec-ink">
              {g.label} <span className="text-hec-small text-hec-ink-soft">({g.items.length})</span>
            </h2>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.items.map((i) => {
              const url = i.file_path ? urls[`${i.bucket}/${i.file_path}`] : undefined;
              return (
                <Card key={`${g.key}-${i.source}-${i.source_id}`} className="overflow-hidden">
                  <button type="button" onClick={() => open(i)} aria-label={`Open ${i.title}`}
                    className="block h-40 w-full bg-hec-sunken focus-visible:outline focus-visible:outline-2 focus-visible:outline-hec-ring">
                    {url ? (
                      <img src={url} alt={i.title} loading="lazy" className="h-40 w-full object-cover" />
                    ) : (
                      <span className="flex h-40 w-full flex-col items-center justify-center gap-1 text-hec-ink-soft">
                        {i.kind === "video" ? <Play className="h-8 w-8" /> : i.kind === "link" ? <Link2 className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
                        <span className="flex items-center gap-1 text-hec-caption">Open <ExternalLink className="h-3 w-3" /></span>
                      </span>
                    )}
                  </button>
                  <CardContent className="space-y-1.5 p-3 sm:p-3">
                    <p className="line-clamp-1 text-hec-small font-medium text-hec-ink">{i.title}</p>
                    <p className="flex items-start gap-1 text-hec-caption text-hec-ink-soft">
                      {i.is_teamwork && <Users className="mt-0.5 h-3 w-3 shrink-0" />}
                      <span>{studentNames(i.students)}</span>
                    </p>
                    <p className="text-hec-caption text-hec-ink-soft">
                      {i.class_name ?? "No class"} · {new Date(i.work_at).toLocaleDateString()}
                    </p>
                    <div className="flex flex-wrap items-center gap-1">
                      <Badge variant="outline">{sourceLabel(i.source)}</Badge>
                      {mode === "admin" && <Badge variant="secondary">{i.status.replace(/_/g, " ")}</Badge>}
                      {i.share_status === "approved" && <Badge>In class gallery</Badge>}
                      {i.share_status === "pending" && <Badge variant="secondary">Share requested</Badge>}
                      {i.share_status === "declined" && <Badge variant="outline">Not shared</Badge>}
                    </div>
                    {i.share_id && (i.share_status === "pending" || i.share_status === "approved") && (
                      <div className="flex gap-2 pt-1">
                        {i.share_status === "pending" && (
                          <Button size="sm" disabled={decide.isPending}
                            onClick={() => decide.mutate({ shareId: i.share_id!, approve: true })}>
                            <Check className="mr-1 h-3.5 w-3.5" />Approve
                          </Button>
                        )}
                        <Button size="sm" variant="outline" disabled={decide.isPending}
                          onClick={() => decide.mutate({ shareId: i.share_id!, approve: false })}>
                          <X className="mr-1 h-3.5 w-3.5" />{i.share_status === "pending" ? "Decline" : "Take down"}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      ))}
      {all.length >= (mode === "admin" ? 1500 : 1000) && (
        <p className="text-hec-caption text-hec-ink-soft">Showing the newest {all.length} items.</p>
      )}
    </div>
  );
}
