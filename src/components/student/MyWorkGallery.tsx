/**
 * MyWorkGallery — teacher-approved work belonging to the student, as a wall of paper cards.
 *
 * Shows approved `student_work` rows where the student is either the
 * individual owner OR a member of the team the work was attributed to.
 * Photos render from a signed URL (private bucket); link submissions render
 * as an "Open link" tile.
 *
 * Presentation by age band (brief G4-G6): early and young get 56 px targets and short words with the Vietnamese
 * beneath; a teenager reads it as a portfolio, newest first, grouped by month with the date up front.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { files as fileStore } from "@/lib/files";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileImage, MessageSquareHeart, Link2, Users, ExternalLink, Share2, Check, Clock } from "lucide-react";
import { safeHttpUrl } from "@/lib/safeUrl";
import { dayjs } from "@/lib/date";
import { cn } from "@/lib/utils";
import { ArriveItem } from "@/components/fx/Arrive";
import { PaperCard, PaperMedia } from "@/components/student/walls/PaperCard";
import { WallNote } from "@/components/student/walls/WallHeader";
import { BiText } from "@/components/student/walls/BiText";
import { useWallBand } from "@/components/student/walls/useWallBand";
import { wallsCopy } from "@/lib/copy/studentWalls";

type Share = { id: string; source: string; source_id: string; status: "pending" | "approved" | "declined" };

/** Ask to put one piece of work in the class gallery; a teacher approves first. */
function ShareControl({ source, sourceId, share }: { source: "student_work" | "homework"; sourceId: string; share?: Share }) {
  const qc = useQueryClient();
  const { kid } = useWallBand();
  const done = () => qc.invalidateQueries({ queryKey: ["my-work"] });
  const ask = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("request_work_share", { p_source: source, p_source_id: sourceId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Sent to your teacher"); done(); },
    onError: (e: any) => toast.error("Could not share", { description: e.message }),
  });
  const withdraw = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any).rpc("withdraw_work_share", { p_share_id: share!.id });
      if (error) throw error;
    },
    onSuccess: done,
    onError: (e: any) => toast.error("Could not take it back", { description: e.message }),
  });
  const btn = cn("h-auto min-h-hec-target whitespace-normal text-left", kid && "px-4");

  if (share?.status === "approved") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-start gap-1 text-hec-caption text-hec-ink-soft"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0" /><BiText entry={wallsCopy["card.shared"]} viClassName="text-hec-caption" /></span>
        <Button size="sm" variant="ghost" className={btn} disabled={withdraw.isPending} onClick={() => withdraw.mutate()}><BiText entry={wallsCopy["card.stopSharing"]} /></Button>
      </div>
    );
  }
  if (share?.status === "pending") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="flex min-w-0 items-start gap-1 text-hec-caption text-hec-ink-soft"><Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" /><BiText entry={wallsCopy["card.waiting"]} viClassName="text-hec-caption" /></span>
        <Button size="sm" variant="ghost" className={btn} disabled={withdraw.isPending} onClick={() => withdraw.mutate()}><BiText entry={wallsCopy["card.cancel"]} /></Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      {share?.status === "declined" && <span className="text-hec-caption text-hec-ink-soft"><BiText entry={wallsCopy["card.declined"]} viClassName="text-hec-caption" /></span>}
      <Button size="sm" variant="outline" className={cn(btn, "ml-auto")} disabled={ask.isPending} onClick={() => ask.mutate()}>
        <Share2 className="mr-1 h-3.5 w-3.5 shrink-0" /><BiText entry={wallsCopy["card.share"]} />
      </Button>
    </div>
  );
}

/** The date of a card: small on the right for children, the lead line of a portfolio entry for a teenager. */
const dateOf = (iso: string) => dayjs(iso).format("D MMM YYYY");

function WorkCard({ w, share }: { w: any; share?: Share }) {
  const { teen } = useWallBand();
  const when = w.approved_at || w.created_at;
  return (
    <PaperCard className="flex h-full flex-col">
      <PaperMedia>
        {w.url ? (
          <a href={w.url} target="_blank" rel="noreferrer" className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hec-ring">
            <img src={w.url} alt="My work" loading="lazy" className="h-44 w-full object-cover" />
          </a>
        ) : w.external_url ? (
          <a
            href={safeHttpUrl(w.external_url)}
            target="_blank"
            rel="noreferrer"
            className="flex h-44 min-h-hec-target w-full flex-col items-center justify-center gap-2 bg-hec-sunken hover:bg-hec-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hec-ring"
          >
            <Link2 className="h-9 w-9 text-hec-ink-soft" />
            <span className="flex items-center gap-1 text-hec-small font-medium text-hec-brass">
              <BiText entry={wallsCopy["card.openLink"]} className="text-center" /> <ExternalLink className="h-3 w-3 shrink-0" />
            </span>
          </a>
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-hec-sunken">
            <FileImage className="h-8 w-8 text-hec-ink-faint" />
          </div>
        )}
      </PaperMedia>
      <div className="space-y-2 p-3">
        {teen && <p className="text-hec-body font-medium tabular-nums text-hec-ink">{dateOf(when)}</p>}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="uppercase">{w.workflow}</Badge>
            {w.is_teamwork && (
              <Badge variant="secondary">
                <Users className="h-3 w-3" /><BiText entry={wallsCopy["card.team"]} viClassName="text-hec-caption" />
              </Badge>
            )}
          </div>
          {!teen && <span className="shrink-0 text-hec-caption tabular-nums text-hec-ink-soft">{dateOf(when)}</span>}
        </div>
        {w.teacher_notes && (
          <p className="flex gap-1.5 break-words text-hec-small text-hec-ink-soft">
            <MessageSquareHeart className="mt-0.5 h-3.5 w-3.5 shrink-0 text-hec-ink-soft" />
            <span className="min-w-0">{w.teacher_notes}</span>
          </p>
        )}
        {w.class_id !== null && (w.storage_path || w.external_url) && (
          <ShareControl source="student_work" sourceId={w.id} share={share} />
        )}
      </div>
    </PaperCard>
  );
}

function HomeworkCard({ h, share }: { h: any; share?: Share }) {
  const { teen } = useWallBand();
  const when = h.submitted_at || h.created_at;
  return (
    <PaperCard className="flex h-full flex-col">
      <PaperMedia>
        {h.url ? (
          <img src={h.url} alt={h.homeworks?.title ?? "Homework"} loading="lazy" className="h-44 w-full object-cover" />
        ) : (
          <div className="flex h-44 w-full items-center justify-center bg-hec-sunken"><FileImage className="h-8 w-8 text-hec-ink-faint" /></div>
        )}
      </PaperMedia>
      <div className="space-y-2 p-3">
        {teen && <p className="text-hec-body font-medium tabular-nums text-hec-ink">{dateOf(when)}</p>}
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline"><BiText entry={wallsCopy["card.homework"]} viClassName="text-hec-caption" /></Badge>
          {!teen && <span className="text-hec-caption tabular-nums text-hec-ink-soft">{dateOf(when)}</span>}
        </div>
        <p className="break-words text-hec-small text-hec-ink">{h.homeworks?.title ?? h.file_name}</p>
        <ShareControl source="homework" sourceId={h.id} share={share} />
      </div>
    </PaperCard>
  );
}

export function MyWorkGallery() {
  const { user } = useAuth();
  const { teen } = useWallBand();

  const { data, isLoading } = useQuery({
    queryKey: ["my-work", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students").select("id").eq("linked_user_id", user!.id).maybeSingle();
      if (!student) return { work: [], homework: [], shares: [] as Share[] };

      // Individual work (student_id) OR teamwork the student is a member of.
      const { data: work } = await (supabase as any)
        .from("student_work")
        .select("id, class_id, storage_path, external_url, is_teamwork, member_student_ids, teacher_notes, workflow, ocr_text, approved_at, created_at")
        .eq("status", "approved")
        .or(`student_id.eq.${student.id},member_student_ids.cs.{${student.id}}`)
        .order("approved_at", { ascending: false })
        .limit(30);

      const { data: shareRows } = await (supabase as any).from("work_shares").select("id, source, source_id, status");
      const { data: hw } = await (supabase as any)
        .from("homework_submissions")
        .select("id, storage_key, file_name, submitted_at, created_at, homeworks(title, class_id)")
        .eq("student_id", student.id)
        .not("storage_key", "is", null)
        .order("created_at", { ascending: false })
        .limit(30);
      const homework = await Promise.all(
        (hw || []).map(async (h: any) => ({
          ...h,
          url: /\.(jpe?g|png|webp|gif|heic)$/i.test(h.storage_key)
            ? await fileStore.signedUrl("homework", h.storage_key, 3600) : null,
        })),
      );

      const rows = work || [];
      const withUrls = await Promise.all(
        rows.map(async (w: any) => {
          if (!w.storage_path) return { ...w, url: null };
          const signed = { signedUrl: await fileStore.signedUrl("student-work", w.storage_path, 3600) };
          return { ...w, url: signed?.signedUrl ?? null };
        }),
      );
      return { work: withUrls, homework, shares: (shareRows || []) as Share[] };
    },
  });
  const shareOf = (source: string, id: string) => data?.shares.find((x) => x.source === source && x.source_id === id);

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-hec-ink-faint" />
      </div>
    );
  }

  if (!data?.work.length && !data?.homework.length) {
    return (
      <ArriveItem index={1}>
        <WallNote><BiText entry={wallsCopy["myWork.empty"]} /></WallNote>
      </ArriveItem>
    );
  }

  const grid = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3";

  if (teen) {
    // A portfolio: newest first, a month at a time. Same items, same data; only the order and the grouping differ.
    const entries = [
      ...data!.work.map((w: any) => ({ key: `w-${w.id}`, at: w.approved_at || w.created_at, node: <WorkCard w={w} share={shareOf("student_work", w.id)} /> })),
      ...data!.homework.map((h: any) => ({ key: `h-${h.id}`, at: h.submitted_at || h.created_at, node: <HomeworkCard h={h} share={shareOf("homework", h.id)} /> })),
    ].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    const months: { label: string; items: typeof entries }[] = [];
    for (const e of entries) {
      const label = dayjs(e.at).format("MMMM YYYY");
      const last = months[months.length - 1];
      if (last && last.label === label) last.items.push(e);
      else months.push({ label, items: [e] });
    }
    let n = 0;
    return (
      <div className="space-y-8">
        {months.map((m) => (
          <section key={m.label} aria-label={m.label} className="space-y-3">
            <h2 className="border-b border-hec-line pb-2 font-display text-hec-h3 font-medium text-hec-ink">{m.label}</h2>
            <div className={grid}>
              {m.items.map((e) => <ArriveItem key={e.key} index={n++} className="h-full">{e.node}</ArriveItem>)}
            </div>
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className={grid}>
      {data!.work.map((w: any, i: number) => (
        <ArriveItem key={w.id} index={i} className="h-full"><WorkCard w={w} share={shareOf("student_work", w.id)} /></ArriveItem>
      ))}
      {data!.homework.map((h: any, i: number) => (
        <ArriveItem key={h.id} index={data!.work.length + i} className="h-full"><HomeworkCard h={h} share={shareOf("homework", h.id)} /></ArriveItem>
      ))}
    </div>
  );
}
