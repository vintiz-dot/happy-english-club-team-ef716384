import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, Calendar, Star, AlertTriangle, Clock, Send, CheckCircle2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sanitizeHtml } from "@/lib/sanitize";
import { getHomeworkStatus, statusConfig, getCountdown } from "@/lib/homeworkStatus";
import { HomeworkPdfDownload } from "@/components/homework/HomeworkPdfDownload";
import { useIsMobile } from "@/hooks/use-mobile";

const HomeworkSubmission = lazy(() => import("./HomeworkSubmission"));

interface HomeworkDetailDialogProps {
  homework: any;
  studentId: string;
  isReadOnly?: boolean;
  onClose: () => void;
}

function GradeCircle({ grade }: { grade: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" className="text-emerald-500/20" strokeWidth="4" />
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" className="text-emerald-500" strokeWidth="4" strokeDasharray="226" strokeDashoffset="0" strokeLinecap="round" />
        </svg>
        <div className="flex items-center gap-0.5">
          <Star className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500" />
          <span className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{grade}</span>
        </div>
      </div>
      <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Your Grade</span>
    </div>
  );
}

export default function HomeworkDetailDialog({ homework, studentId, isReadOnly = false, onClose }: HomeworkDetailDialogProps) {
  const isMobile = useIsMobile();
  // Fetch teacher name for PDF
  const { data: teacherName } = useQuery({
    queryKey: ["class-teacher-name", homework.class_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("classes")
        .select("default_teacher_id, teachers(full_name)")
        .eq("id", homework.class_id)
        .single();
      return (data?.teachers as any)?.full_name || "Unknown";
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: submission } = useQuery({
    queryKey: ["homework-submission", homework.id, studentId],
    queryFn: async () => {
      // The submission is already fetched via get_student_homeworks and passed down
      return homework.submission || null;
    },
  });

  const assignmentWithSub = { ...homework, submission };
  const status = getHomeworkStatus(assignmentWithSub);
  const config = statusConfig[status];
  const countdown = getCountdown(homework.due_date);

  const downloadFile = async (storageKey: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage.from("homework").createSignedUrl(storageKey, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      console.error("Error downloading file:", error);
    }
  };

  const inner = (
    <>
        {/* Status Banner */}
        <div className={`px-4 sm:px-6 py-3 flex items-center gap-2 ${config.cardClass} ${config.borderColor} border-b`}>
          <span className="text-lg">{config.icon}</span>
          <span className={`font-semibold text-sm ${config.textClass}`}>{config.label}</span>
          {countdown && (
            <Badge className={`ml-auto text-[11px] sm:text-xs px-2 py-0.5 ${config.badgeClass}`}>
              {countdown}
            </Badge>
          )}
          {status === "graded" && submission?.grade && (
            <div className="ml-auto flex items-center gap-1">
              <Star className="h-4 w-4 text-emerald-500 fill-emerald-500" />
              <span className="font-bold text-emerald-700 dark:text-emerald-400">{submission.grade}</span>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6 min-w-0 no-x-overflow">
          <div className="space-y-3 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold leading-tight break-words [overflow-wrap:anywhere]">{homework.title}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground min-w-0">
              <Badge variant="secondary" className="text-xs break-words max-w-full">{homework.classes?.name || "Class"}</Badge>
              {homework.created_at && (
                <span className="flex items-center gap-1 text-xs">
                  <Calendar className="h-3 w-3 shrink-0" />
                  {format(new Date(homework.created_at), "MMM d, yyyy")}
                </span>
              )}
              {homework.due_date && (
                <Badge variant="outline" className="text-xs">
                  Due {format(new Date(homework.due_date), "MMM d, yyyy")}
                </Badge>
              )}
            </div>

            {/* Prominent download button — full-width, above the fold */}
            <div className="pt-1">
              <HomeworkPdfDownload
                homework={homework}
                className={homework.classes?.name}
                teacherName={teacherName}
                variant="pill"
              />
            </div>
          </div>

          {/* Grade Circle for graded assignments */}
          {status === "graded" && submission?.grade && (
            <div className="flex justify-center py-2">
              <GradeCircle grade={submission.grade} />
            </div>
          )}

          {homework.body && (
            <div className="bg-primary/5 border-2 border-primary/20 p-3 sm:p-6 rounded-lg overflow-hidden">
              <h2 className="text-base sm:text-xl font-bold mb-3 sm:mb-4 text-primary flex items-center gap-2">
                📋 Assignment Instructions
              </h2>
              <div
                className="prose prose-sm rich-content max-w-none w-full min-w-0 overflow-x-hidden break-words [overflow-wrap:anywhere] [word-break:break-word] [&_*]:max-w-full [&_*]:[overflow-wrap:anywhere] [&_h1]:text-lg [&_h2]:text-base [&_h3]:text-sm [&_p]:text-foreground [&_p]:break-words [&_strong]:text-foreground [&_em]:text-foreground [&_ul]:text-foreground [&_ol]:text-foreground [&_li]:text-foreground [&_img]:max-w-full [&_img]:h-auto [&_pre]:overflow-x-auto [&_pre]:max-w-full [&_code]:break-all"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(homework.body) }}
              />
            </div>
          )}

          {homework.homework_files?.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">📎 Attachments</h3>
              <div className="space-y-1.5">
                {homework.homework_files.map((file: any) => {
                  const ext = file.file_name?.split(".").pop()?.toLowerCase() || "";
                  const sizeKB = file.size_bytes ? (file.size_bytes / 1024).toFixed(0) : null;
                  return (
                    <Button
                      key={file.id}
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(file.storage_key, file.file_name)}
                      className="w-full justify-start text-sm gap-2 min-h-[44px] rounded-xl"
                    >
                      <Download className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1 text-left">{file.file_name}</span>
                      {sizeKB && <span className="text-[11px] text-muted-foreground shrink-0">{sizeKB} KB</span>}
                      <Badge variant="outline" className="text-[11px] shrink-0 uppercase px-1.5 py-0">{ext}</Badge>
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <h3 className="font-semibold mb-2">
              {isReadOnly ? "Classmate's Submission" : "Your Submission"}
            </h3>
            {isReadOnly ? (
              <div className="p-4 border rounded-lg space-y-3">
                {submission ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      {submission.status === "graded" ? (
                        <span className="text-sm font-medium text-emerald-600">Graded - {submission.grade}</span>
                      ) : submission.status === "submitted" ? (
                        <span className="text-sm font-medium text-sky-600">Submitted</span>
                      ) : (
                        <span className="text-sm font-medium text-muted-foreground">Pending</span>
                      )}
                    </div>
                    {submission.submitted_at && (
                      <p className="text-sm text-muted-foreground">
                        Submitted: {format(new Date(submission.submitted_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">This classmate has not submitted yet.</p>
                )}
              </div>
            ) : (
              <Suspense fallback={<div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin mr-2" />Loading submission form...</div>}>
                <HomeworkSubmission homeworkId={homework.id} studentId={studentId} existingSubmission={submission} onSuccess={onClose} />
              </Suspense>
            )}
          </div>
        </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={true} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="p-0 h-[92vh] max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-t-2xl pb-safe"
        >
          {/* Drag handle — visual affordance for the bottom sheet */}
          <div className="sticky top-0 z-10 flex justify-center pt-2 pb-1 bg-background/95 backdrop-blur-sm">
            <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          </div>
          <SheetHeader className="sr-only">
            <SheetTitle>{homework.title}</SheetTitle>
          </SheetHeader>
          {inner}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden p-0">
        <DialogHeader className="sr-only">
          <DialogTitle>{homework.title}</DialogTitle>
        </DialogHeader>
        {inner}
      </DialogContent>
    </Dialog>
  );
}
