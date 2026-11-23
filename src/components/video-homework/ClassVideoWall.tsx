/**
 * The class video wall: classmates' approved videos, shared by choice,
 * with hearts. It replaces posting to the Facebook group - parents still
 * see the class, and nobody's score is ever on it (the RPC never returns
 * one).
 *
 * Presentation: paper cards, 56 px targets and Vietnamese beneath for the two youngest bands, dates with the
 * year and no emoji for a teenager. An empty wall and a failed read each say one calm sentence.
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Play } from "lucide-react";
import { dayjs } from "@/lib/date";
import { signedVideoUrl, videoDb } from "@/lib/video/recorder";
import { SignedVideo } from "./SignedVideo";
import { PaperCard, PaperMedia } from "@/components/student/walls/PaperCard";
import { BiText } from "@/components/student/walls/BiText";
import { Emoji } from "@/components/student/walls/Emoji";
import { useWallBand } from "@/components/student/walls/useWallBand";
import { wallsCopy } from "@/lib/copy/studentWalls";

interface WallItem {
  id: string;
  student_name: string;
  homework_title: string;
  video_path: string;
  poster_path: string | null;
  submitted_at: string;
  hearts: number;
  hearted: boolean;
  mine: boolean;
}

function Poster({ path }: { path: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (path) signedVideoUrl(path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [path]);
  return url ? <img src={url} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full bg-hec-sunken" />;
}

export function ClassVideoWall({ classId, className, studentId }: { classId: string; className?: string; studentId: string }) {
  const qc = useQueryClient();
  const { teen } = useWallBand();
  const [playing, setPlaying] = useState<string | null>(null);
  const key = ["class-video-wall", classId, studentId];

  const { data = [], isError, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await videoDb.rpc("get_class_video_wall", { p_class: classId, p_viewer_student: studentId });
      if (error) throw error;
      return (data ?? []) as WallItem[];
    },
    retry: false,
  });

  const heart = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await videoDb.rpc("toggle_video_heart", { p_video: id, p_student: studentId });
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      qc.setQueryData<WallItem[]>(key, (items = []) =>
        items.map((i) => (i.id === id ? { ...i, hearted: !i.hearted, hearts: i.hearts + (i.hearted ? -1 : 1) } : i)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: key }),
  });

  if (isLoading) return null;

  return (
    <section className="space-y-3 rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6" aria-label={className ? `${className} videos` : "Class videos"}>
      <div className="space-y-1">
        <h2 className="break-words font-display text-hec-h3 font-medium text-hec-ink">
          <Emoji>🌟 </Emoji>
          {className ? <BiText entry={wallsCopy["videos.wallTitle"]} vars={{ name: className }} /> : <BiText entry={wallsCopy["videos.wallTitleBare"]} />}
        </h2>
        {!isError && data.length > 0 && (
          <p className="break-words text-hec-small text-hec-ink-soft"><BiText entry={wallsCopy["videos.wallHelp"]} /></p>
        )}
      </div>

      {isError ? (
        <p className="break-words text-hec-body text-hec-ink-soft"><BiText entry={wallsCopy["videos.wallError"]} /></p>
      ) : data.length === 0 ? (
        <p className="break-words text-hec-body text-hec-ink-soft"><BiText entry={wallsCopy["videos.wallEmpty"]} /></p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((v) => (
            <PaperCard key={v.id} className="flex flex-col">
              <PaperMedia className="aspect-video bg-hec-sunken">
                {playing === v.id ? (
                  <SignedVideo path={v.video_path} autoPlay className="h-full w-full object-contain" />
                ) : (
                  <button type="button" onClick={() => setPlaying(v.id)} className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-hec-ring" aria-label={`Play ${v.student_name}'s video`}>
                    <Poster path={v.poster_path} />
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="rounded-full bg-hec-action/80 p-3"><Play className="h-6 w-6 fill-current text-hec-on-action" /></span>
                    </span>
                  </button>
                )}
              </PaperMedia>
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{v.mine ? <BiText entry={wallsCopy["videos.you"]} /> : v.student_name}</p>
                  <p className="break-words text-hec-small text-hec-ink-soft">{v.homework_title} · {dayjs(v.submitted_at).format(teen ? "D MMM YYYY" : "MMM D")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => !v.mine && heart.mutate(v.id)}
                  disabled={v.mine}
                  className="flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center gap-1 rounded-hec-md text-hec-small text-hec-ink disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                >
                  <span className="sr-only">{v.hearted ? wallsCopy["videos.unheart"].en : wallsCopy["videos.heart"].en}</span>
                  <Heart aria-hidden="true" className={`h-5 w-5 ${v.hearted ? "fill-current text-hec-brass" : "text-hec-ink-soft"}`} />
                  {v.hearts > 0 && <span className="tabular-nums">{v.hearts}</span>}
                </button>
              </div>
            </PaperCard>
          ))}
        </div>
      )}
    </section>
  );
}
