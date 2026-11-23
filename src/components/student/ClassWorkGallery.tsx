/**
 * ClassWorkGallery - what children shared with their class, after a teacher
 * approved it. For a child and for their family (the selected child).
 *
 * class_work_gallery returns names and a title, never a path: a classmate's
 * file arrives only through the work-gallery-file function, which asks the
 * database (as this person) before it reads anything.
 */
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText, Link2, Loader2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { safeHttpUrl } from "@/lib/safeUrl";
import { ArriveItem } from "@/components/fx/Arrive";
import { PaperCard, PaperMedia } from "@/components/student/walls/PaperCard";
import { WallNote } from "@/components/student/walls/WallHeader";
import { BiText } from "@/components/student/walls/BiText";
import { wallsCopy } from "@/lib/copy/studentWalls";
import { dayjs } from "@/lib/date";
import { isImagePath, studentNames, type ClassWorkItem } from "@/lib/workGallery";

async function fetchSharedFile(shareId: string): Promise<Blob> {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/work-gallery-file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
      Authorization: `Bearer ${session?.access_token ?? ""}`,
    },
    body: JSON.stringify({ share_id: shareId }),
  });
  if (!res.ok) throw new Error(`file ${res.status}`);
  return await res.blob();
}

function SharedPicture({ item }: { item: ClassWorkItem }) {
  const image = isImagePath(item.file_name);
  const { data: url } = useQuery({
    queryKey: ["class-work-file", item.share_id],
    enabled: item.kind === "file",
    staleTime: 10 * 60_000,
    queryFn: async () => URL.createObjectURL(await fetchSharedFile(item.share_id)),
  });
  if (item.external_url) {
    const href = safeHttpUrl(item.external_url);
    return (
      <a href={href} target="_blank" rel="noreferrer"
        className="flex h-44 min-h-hec-target w-full flex-col items-center justify-center gap-2 bg-hec-sunken hover:bg-hec-line focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hec-ring">
        <Link2 className="h-9 w-9 text-hec-ink-soft" />
        <span className="flex items-center gap-1 text-hec-small font-medium text-hec-brass"><BiText entry={wallsCopy["card.openLink"]} className="text-center" /> <ExternalLink className="h-3 w-3 shrink-0" /></span>
      </a>
    );
  }
  if (url && image) {
    return <a href={url} target="_blank" rel="noreferrer" className="block"><img src={url} alt={item.title} loading="lazy" className="h-44 w-full object-cover" /></a>;
  }
  if (url) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="flex h-44 min-h-hec-target w-full flex-col items-center justify-center gap-2 bg-hec-sunken">
        <FileText className="h-9 w-9 text-hec-ink-soft" />
        <span className="text-hec-small text-hec-brass"><BiText entry={wallsCopy["card.openFile"]} className="text-center" /></span>
      </a>
    );
  }
  return <div className="flex h-44 w-full items-center justify-center bg-hec-sunken"><Loader2 className="h-5 w-5 animate-spin text-hec-ink-faint" /></div>;
}

export function ClassWorkGallery({ studentId }: { studentId?: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["class-work-gallery", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("class_work_gallery", { p_student_id: studentId });
      if (error) throw error;
      return (data ?? []) as ClassWorkItem[];
    },
  });

  if (isLoading || !studentId) {
    return <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-hec-ink-faint" /></div>;
  }
  if (error) return <WallNote><BiText entry={wallsCopy["classWall.error"]} /></WallNote>;
  if (!data?.length) return <ArriveItem index={1}><WallNote><BiText entry={wallsCopy["classWall.empty"]} /></WallNote></ArriveItem>;

  const byClass = new Map<string, { name: string; items: ClassWorkItem[] }>();
  for (const i of data) {
    const g = byClass.get(i.class_id) ?? { name: i.class_name ?? "Class", items: [] };
    g.items.push(i);
    byClass.set(i.class_id, g);
  }
  const groups = [...byClass.values()].sort((a, b) => a.name.localeCompare(b.name));

  let n = 0;
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.name} aria-label={g.name} className="space-y-2">
          {groups.length > 1 && <h2 className="break-words font-display text-hec-h3 font-medium text-hec-ink">{g.name}</h2>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((i) => (
              <ArriveItem key={i.share_id} index={n++} className="h-full">
                <PaperCard className="flex h-full flex-col">
                  <PaperMedia><SharedPicture item={i} /></PaperMedia>
                  <div className="space-y-1 p-3">
                    <p className="flex items-start gap-1 break-words text-hec-small font-medium text-hec-ink">
                      {i.is_teamwork && <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-label="Team" />}
                      <span className="min-w-0">{studentNames(i.students)}</span>
                    </p>
                    <p className="break-words text-hec-caption text-hec-ink-soft">{i.title} · {dayjs(i.work_at).format("D MMM YYYY")}</p>
                  </div>
                </PaperCard>
              </ArriveItem>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
