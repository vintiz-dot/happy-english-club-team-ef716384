/**
 * Public: a parent opens a secret link and watches their child's approved
 * video homework. No sign-in. The server returns only approved videos and
 * the teacher's final words (parent-video-page).
 */
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Video } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dayjs } from "@/lib/date";

interface PublicVideo { id: string; title: string; date: string; url: string; grade: string | null; feedback: string | null }

export default function ParentVideos() {
  const { token = "" } = useParams();
  const { data, isLoading, isError } = useQuery({
    queryKey: ["parent-videos", token],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("parent-video-page", { body: { token } });
      if (error) throw error;
      return data as { student: { name: string }; videos: PublicVideo[] };
    },
    retry: false,
    staleTime: 60 * 60 * 1000,
  });

  return (
    <div className="min-h-screen bg-hec-paper text-hec-ink">
      <div className="mx-auto max-w-3xl px-4 py-8 space-y-6 sm:px-6">
        <header className="text-center space-y-2">
          <p className="text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">Happy English Club</p>
          <h1 className="font-display text-hec-display font-medium text-hec-ink whitespace-normal break-words hyphens-none text-balance">
            {data?.student?.name ? `${data.student.name}'s videos` : "Video homework"}
          </h1>
          <p className="text-hec-small text-hec-ink-soft">Video homework checked and approved by the teacher.</p>
        </header>

        {isLoading && (
          <div className="flex justify-center py-16 text-hec-ink-soft"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}
        {isError && (
          <Card><CardContent className="py-12 text-center text-hec-body text-hec-ink-soft">
            This link is not valid any more. Please ask the teacher for a new one.
          </CardContent></Card>
        )}
        {data && data.videos.length === 0 && (
          <Card><CardContent className="py-12 text-center text-hec-body text-hec-ink-soft">
            <Video className="mx-auto mb-2 h-8 w-8 text-hec-ink-faint" />No approved videos yet. Check back soon!
          </CardContent></Card>
        )}
        {data?.videos.map((v) => (
          <Card key={v.id} className="overflow-clip">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="break-words">{v.title}</CardTitle>
                  <CardDescription className="tabular-nums">{dayjs(v.date).format("D MMM YYYY")}</CardDescription>
                </div>
                {v.grade && <Badge className="shrink-0">{v.grade}</Badge>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <video src={v.url} controls playsInline preload="metadata" className="w-full rounded-hec-md bg-hec-sunken aspect-video" />
              {v.feedback && (
                <div className="rounded-hec-md border border-hec-line bg-hec-sunken p-4 text-hec-small text-hec-ink whitespace-pre-wrap break-words">
                  <p className="font-medium text-hec-ink mb-1">Teacher's note</p>
                  {v.feedback}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
