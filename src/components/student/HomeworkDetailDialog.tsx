import { lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { CalendarDays, Download, FileText, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { getHomeworkStatus } from "@/lib/homeworkStatus";
import { HomeworkPdfDownload } from "@/components/homework/HomeworkPdfDownload";
import { RichText } from "@/components/homework/RichText";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { classTint, dueText, homeworkLook } from "./homework/homeworkLook";

const HomeworkSubmission = lazy(() => import("./HomeworkSubmission"));

interface HomeworkDetailDialogProps {
  homework: any;
  studentId: string;
  isReadOnly?: boolean;
  onClose: () => void;
}

/** A numbered step: big friendly number, a heading, then the content. */
function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0">
      <div className="mb-3 flex items-center gap-3">
        {n > 0 ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-primary-foreground shadow-[0_3px_0_0_hsl(var(--primary)/0.45)]">
            {n}
          </span>
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center text-2xl" aria-hidden>🌟</span>
        )}
        <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function fileSize(bytes?: number | null) {
  if (!bytes) return null;
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default function HomeworkDetailDialog({ homework, studentId, isReadOnly = false, onClose }: HomeworkDetailDialogProps) {
  const isMobile = useIsMobile();

  // Teacher name for the PDF header.
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

  // The submission arrives with the homework (get_student_homeworks).
  const submission = homework.submission || null;
  const status = getHomeworkStatus({ ...homework, submission });
  const look = homeworkLook[status];
  const done = status === "submitted" || status === "graded";
  const due = dueText(homework.due_date, done);
  const className = homework.classes?.name || "Class";
  const files: any[] = homework.homework_files || [];

  const downloadFile = async (storageKey: string) => {
    try {
      const { data, error } = await supabase.storage.from("homework").createSignedUrl(storageKey, 3600);
      if (error) throw error;
      if (data?.signedUrl) window.open(data.signedUrl, "_blank");
    } catch (error: any) {
      console.error("Error downloading file:", error);
    }
  };

  let step = 0;
  const resultFirst = status === "graded" && !isReadOnly;
  const hasMaterials = files.length > 0 || !!homework.body;

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border backdrop-blur transition hover:bg-background"
    >
      <X className="h-5 w-5" strokeWidth={2.5} />
    </button>
  );

  const header = (
    <header className="relative isolate shrink-0 bg-background px-4 pb-4 pt-3 sm:px-6 sm:pt-5">
      {/* State tint over a solid base, so nothing behind the sheet shows through. */}
      <div className={cn("absolute inset-0 -z-10 border-0 border-b-2", look.cardClass)} aria-hidden />
      {isMobile && <div className="mx-auto mb-3 h-1.5 w-11 rounded-full bg-foreground/15" aria-hidden />}
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("inline-block max-w-full truncate rounded-full px-2.5 py-1 text-xs font-bold", classTint(className))}>
              {className}
            </span>
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold whitespace-nowrap", look.pillClass)}>
              <span aria-hidden>{look.emoji}</span>
              {look.pill}
            </span>
          </div>
          {isMobile ? (
            <SheetTitle className="mt-2.5 text-xl font-black leading-snug tracking-tight break-words [hyphens:auto]">
              {homework.title}
            </SheetTitle>
          ) : (
            <DialogTitle className="mt-2.5 text-2xl font-black leading-snug tracking-tight break-words [hyphens:auto]">
              {homework.title}
            </DialogTitle>
          )}
          {(() => {
            const Desc = isMobile ? SheetDescription : DialogDescription;
            return (
              <Desc className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-semibold text-muted-foreground">
                {due && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5",
                      status === "overdue" && "text-rose-600 dark:text-rose-300",
                      status === "due-today" && "text-amber-700 dark:text-amber-300",
                    )}
                  >
                    <CalendarDays className="h-4 w-4 shrink-0" />
                    {due}
                  </span>
                )}
                {homework.created_at && <span>Set {format(new Date(homework.created_at), "d MMM")}</span>}
              </Desc>
            );
          })()}
        </div>
        {/* On a phone the close button floats over the sheet instead (see below). */}
        {isMobile ? <div className="h-11 w-11 shrink-0" aria-hidden /> : closeButton}
      </div>
    </header>
  );

  const body = (
    <div className="flex flex-col gap-7 px-4 py-5 sm:px-6 sm:py-6 min-w-0">
      {homework.body && (
        <Step n={++step} title="What to do">
          <div className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5">
            <RichText html={homework.body} />
          </div>
        </Step>
      )}

      {hasMaterials && (
        <Step n={++step} title={files.length ? "Your materials" : "Keep a copy"}>
          <div className="space-y-2">
            {files.map((file: any) => {
              const ext = file.file_name?.split(".").pop()?.toUpperCase() || "FILE";
              const size = fileSize(file.size_bytes);
              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => downloadFile(file.storage_key)}
                  className="flex w-full items-center gap-3 rounded-2xl border-2 border-b-4 border-border bg-card p-3 text-left transition-[transform] duration-100 active:translate-y-[2px] active:border-b-2"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <FileText className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold">{file.file_name}</span>
                    <span className="block text-xs font-semibold text-muted-foreground">
                      {ext}{size ? ` · ${size}` : ""}
                    </span>
                  </span>
                  <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
                </button>
              );
            })}
            {homework.body && (
              <div className="pt-1">
                <HomeworkPdfDownload homework={homework} className={className} teacherName={teacherName} variant="pill" />
              </div>
            )}
          </div>
        </Step>
      )}

      {/* Once marked, the result is what the student opened the sheet for: show it first. */}
      <div className={cn("min-w-0", resultFirst && "order-first")}>
      <Step n={resultFirst ? 0 : ++step} title={isReadOnly ? "Classmate's work" : resultFirst ? "Your result" : "Your answer"}>
        {isReadOnly ? (
          <div className="rounded-3xl border-2 border-border bg-card p-4 space-y-2">
            {submission ? (
              <>
                <p className="text-[0.9375rem] font-bold">
                  {submission.status === "graded"
                    ? `🌟 Marked${submission.grade ? ` · ${submission.grade}` : ""}`
                    : submission.status === "submitted"
                      ? "📬 Sent"
                      : "📝 Not sent yet"}
                </p>
                {submission.submitted_at && (
                  <p className="text-sm text-muted-foreground">
                    Sent {format(new Date(submission.submitted_at), "d MMM 'at' h:mm a")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[0.9375rem] text-muted-foreground">This classmate has not sent it yet.</p>
            )}
          </div>
        ) : (
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Getting your answer box ready…
              </div>
            }
          >
            <HomeworkSubmission homeworkId={homework.id} studentId={studentId} existingSubmission={submission} onSuccess={onClose} />
          </Suspense>
        )}
      </Step>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={true} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="bottom"
          className="flex h-[94dvh] max-h-[94dvh] flex-col gap-0 overflow-hidden rounded-t-[1.75rem] border-0 !bg-background !backdrop-blur-none p-0 [&>button.absolute]:hidden"
        >
          {/* Header scrolls with the page, so a long title never pins a third of the screen. */}
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {header}
            {body}
          </div>
          <div className="absolute right-3 top-6 z-20">{closeButton}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-3xl !bg-background p-0 sm:max-w-2xl [&>button.absolute]:hidden">
        {header}
        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{body}</div>
      </DialogContent>
    </Dialog>
  );
}
