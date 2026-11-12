/**
 * The class video wall: classmates' approved videos, shared by choice,
 * with hearts. It replaces posting to the Facebook group - parents still
 * see the class, and nobody's score is ever on it (the RPC never returns
 * one).
 */
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Play } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dayjs } from "@/lib/date";
import { signedVideoUrl, videoDb } from "@/lib/video/recorder";
import { SignedVideo } from "./SignedVideo";

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
  const [playing, setPlaying] = useState<string | null>(null);
  const key = ["class-video-wall", classId, studentId];

  const { data = [], isError } = useQuery({
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

  if (isError || data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>🌟 {className ? `${className} videos` : "Class videos"}</CardTitle>
        <CardDescription>Videos your classmates chose to share. Send them a heart!</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {data.map((v) => (
            <div key={v.id} className="overflow-hidden rounded-hec-md border border-hec-line">
              <div className="relative aspect-video bg-hec-sunken">
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
              </div>
              <div className="flex items-start justify-between gap-2 p-3">
                <div className="min-w-0 flex-1">
                  <p className="whitespace-normal break-words hyphens-none text-balance text-hec-body font-medium text-hec-ink">{v.mine ? "You" : v.student_name}</p>
                  <p className="break-words text-hec-small text-hec-ink-soft">{v.homework_title} · {dayjs(v.submitted_at).format("MMM D")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => !v.mine && heart.mutate(v.id)}
                  disabled={v.mine}
                  className="flex min-h-hec-target min-w-hec-target shrink-0 items-center justify-center gap-1 rounded-hec-md text-hec-small text-hec-ink disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                  aria-label={`${v.hearted ? "Remove heart" : "Send a heart"}${v.hearts > 0 ? ` (${v.hearts})` : ""}`}
                >
                  <Heart className={`h-5 w-5 ${v.hearted ? "fill-current text-hec-brass" : "text-hec-ink-soft"}`} />
                  {v.hearts > 0 && <span className="tabular-nums">{v.hearts}</span>}
                </button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
