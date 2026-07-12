/**
 * MyWorkGallery — teacher-approved scans of the student's physical work.
 *
 * Shows only `student_work` rows the teacher approved, each with the photo
 * (signed URL from the private bucket) and the teacher's notes.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileImage, MessageSquareHeart } from "lucide-react";

export function MyWorkGallery() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-work", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data: student } = await supabase
        .from("students").select("id").eq("linked_user_id", user!.id).maybeSingle();
      if (!student) return [];

      const { data: work } = await (supabase as any)
        .from("student_work")
        .select("id, storage_path, teacher_notes, workflow, ocr_text, approved_at, created_at")
        .eq("student_id", student.id)
        .eq("status", "approved")
        .order("approved_at", { ascending: false })
        .limit(30);

      const rows = work || [];
      const withUrls = await Promise.all(
        rows.map(async (w: any) => {
          const { data: signed } = await supabase.storage
            .from("student-work")
            .createSignedUrl(w.storage_path, 3600);
          return { ...w, url: signed?.signedUrl ?? null };
        }),
      );
      return withUrls;
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <FileImage className="h-10 w-10 mx-auto text-muted-foreground/50" />
        <p className="text-sm font-semibold">No work published yet</p>
        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
          When your teacher scans and approves your classwork, it appears here with their notes.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((w: any) => (
        <Card key={w.id} className="overflow-hidden rounded-2xl">
          {w.url ? (
            <a href={w.url} target="_blank" rel="noreferrer">
              <img src={w.url} alt="My work" loading="lazy" className="h-44 w-full object-cover" />
            </a>
          ) : (
            <div className="h-44 w-full bg-muted flex items-center justify-center">
              <FileImage className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <CardContent className="p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-[10px] uppercase">{w.workflow}</Badge>
              <span className="text-[11px] text-muted-foreground">
                {new Date(w.approved_at || w.created_at).toLocaleDateString()}
              </span>
            </div>
            {w.teacher_notes && (
              <p className="text-xs text-muted-foreground flex gap-1.5">
                <MessageSquareHeart className="h-3.5 w-3.5 text-pink-500 shrink-0 mt-0.5" />
                {w.teacher_notes}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
