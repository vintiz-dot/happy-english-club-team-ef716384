import { useState, lazy, Suspense } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Upload, FileText, Heart } from "lucide-react";
import "react-quill-new/dist/quill.snow.css";
import { format } from "date-fns";
import { RichText } from "@/components/homework/RichText";
import { dayjs } from "@/lib/date";
import { soundManager } from "@/lib/soundManager";
import { motion, AnimatePresence } from "framer-motion";
import { SubmitCheckmark } from "./SubmitCheckmark";
import VideoHomeworkSubmission, { useVideoHomework } from "@/components/video-homework/VideoHomeworkSubmission";

const ReactQuill = lazy(() => import("react-quill-new"));

interface HomeworkSubmissionProps {
  homeworkId: string;
  studentId: string;
  existingSubmission?: any;
  onSuccess?: () => void;
}

export default function HomeworkSubmission(props: HomeworkSubmissionProps) {
  // A video homework has its own flow (record, send, teacher-approved report).
  // Until the video migration is applied the lookup fails and this falls
  // through to the written form, exactly as before.
  const { data: video, isLoading } = useVideoHomework(props.homeworkId, props.studentId);
  if (isLoading) return null;
  if (video?.submission_type === "video") {
    return <VideoHomeworkSubmission homeworkId={props.homeworkId} studentId={props.studentId} onSuccess={props.onSuccess} kid />;
  }
  return <WrittenHomeworkSubmission {...props} />;
}

function WrittenHomeworkSubmission({
  homeworkId,
  studentId,
  existingSubmission,
  onSuccess,
}: HomeworkSubmissionProps) {
  const [submissionText, setSubmissionText] = useState(
    existingSubmission?.submission_text || ""
  );
  const [file, setFile] = useState<File | null>(null);
  const [thanked, setThanked] = useState(false);
  const [showCheckmark, setShowCheckmark] = useState(false);
  const queryClient = useQueryClient();

  // Check if student already thanked
  const { data: existingReaction } = useQuery({
    queryKey: ["feedback-reaction", existingSubmission?.id, studentId],
    queryFn: async () => {
      if (!existingSubmission?.id) return null;
      const { data } = await supabase
        .from("feedback_reactions")
        .select("id")
        .eq("submission_id", existingSubmission.id)
        .eq("student_id", studentId)
        .maybeSingle();
      return data;
    },
    enabled: !!existingSubmission?.id && existingSubmission?.status === "graded",
  });

  const thankMutation = useMutation({
    mutationFn: async () => {
      if (!existingSubmission?.id) return;
      await supabase.from("feedback_reactions").insert({
        submission_id: existingSubmission.id,
        student_id: studentId,
      });
    },
    onSuccess: () => {
      setThanked(true);
      soundManager.play("success");
      toast.success("💕 Thank you sent to your teacher!");
    },
    onError: () => {
      toast.error("Could not send reaction");
    },
  });

  // Fetch homework details to check due date
  const { data: homework } = useQuery({
    queryKey: ["homework-details", homeworkId],
    queryFn: async () => {
      // Use RPC to avoid RLS 500 error
      const { data } = await supabase.rpc("get_student_homeworks", {
        p_student_id: studentId,
      });
      const hwList = (data as any)?.homeworks || [];
      return hwList.find((h: any) => h.id === homeworkId);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      let storageKey = existingSubmission?.storage_key;
      let fileName = existingSubmission?.file_name;
      let fileSize = existingSubmission?.file_size;

      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("File size must be less than 5MB");
        }

        const timestamp = Date.now();
        const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filePath = `submissions/${homeworkId}/${studentId}/${timestamp}-${sanitizedFileName}`;

        const { error: uploadError } = await supabase.storage
          .from("homework")
          .upload(filePath, file, { cacheControl: "3600", upsert: false });

        if (uploadError) {
          console.error("Storage upload error:", uploadError);
          throw new Error(`Upload failed: ${uploadError.message}`);
        }

        storageKey = filePath;
        fileName = file.name;
        fileSize = file.size;
      }

      const { data: rpcData } = await supabase.rpc("get_student_homeworks", {
        p_student_id: studentId,
      });
      const hwList = (rpcData as any)?.homeworks || [];
      const homeworkData = hwList.find((h: any) => h.id === homeworkId);

      const { error } = await supabase.from("homework_submissions").upsert({
        id: existingSubmission?.id,
        homework_id: homeworkId,
        student_id: studentId,
        submission_text: submissionText || null,
        storage_key: storageKey,
        file_name: fileName,
        file_size: fileSize,
        status: "submitted",
        submitted_at: new Date().toISOString(),
        assignment_instructions: homeworkData?.body || null,
      });

      if (error) throw error;

      // Early submission bonus
      const isFirstSubmission = !existingSubmission?.submitted_at;
      const isEarly = homework?.due_date && new Date() < new Date(homework.due_date + 'T23:59:59');
      
      if (isFirstSubmission && isEarly && homework?.class_id) {
        const { data: existingBonus } = await supabase
          .from("early_submission_rewards")
          .select("id")
          .eq("homework_id", homeworkId)
          .eq("student_id", studentId)
          .maybeSingle();

        if (!existingBonus) {
          const effectiveDate = homework.due_date || dayjs().format("YYYY-MM-DD");
          const month = effectiveDate.slice(0, 7);

          const { data: pointTx } = await supabase
            .from("point_transactions")
            .insert({
              student_id: studentId,
              class_id: homework.class_id,
              homework_id: homeworkId,
              homework_title: homework.title,
              points: 5,
              type: "early_submission",
              // `notes`, not `reason` - point_transactions has no reason column,
              // so this insert was rejected every time it ran.
              notes: "Early submission bonus",
              date: effectiveDate,
              month
            })
            .select("id")
            .single();

          await supabase
            .from("early_submission_rewards")
            .insert({
              homework_id: homeworkId,
              student_id: studentId,
              points_awarded: 5,
              point_transaction_id: pointTx?.id
            });

          toast.success("🌅 Early Bird Bonus! +5 XP");
        }
      }
    },
    onSuccess: () => {
      // Show checkmark animation
      setShowCheckmark(true);
      soundManager.play("questComplete");
      toast.success("Homework submitted successfully");
      queryClient.invalidateQueries({ queryKey: ["student-assignments"] });
      queryClient.invalidateQueries({ queryKey: ["homework-submission", homeworkId, studentId] });
      queryClient.invalidateQueries({ queryKey: ["homework-submissions"] });
      queryClient.invalidateQueries({ queryKey: ["student-total-points", studentId] });
      setFile(null);
    },
    onError: (error: any) => {
      console.error("Homework submission error:", error);
      const errorMessage = error.message || "Failed to submit homework";
      if (errorMessage.includes("policy")) {
        toast.error("Permission denied. Please make sure you're logged in as a student.");
      } else if (errorMessage.includes("storage")) {
        toast.error("File upload failed. Please check your file and try again.");
      } else {
        toast.error(errorMessage);
      }
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const downloadFile = async () => {
    if (!existingSubmission?.storage_key) return;
    const { data, error } = await supabase.storage
      .from("homework")
      .download(existingSubmission.storage_key);
    if (error) { toast.error("Failed to download file"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = existingSubmission.file_name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isGraded = existingSubmission?.status === "graded";
  const isSent = existingSubmission?.status === "submitted";

  return (
    <>
      <SubmitCheckmark
        show={showCheckmark}
        onComplete={() => {
          setShowCheckmark(false);
          onSuccess?.();
        }}
      />
      <motion.div
        className="space-y-4 min-w-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {isGraded ? (
          <div className="space-y-4">
            {/* Result */}
            <div className="flex items-center gap-4 rounded-3xl border-2 border-b-[5px] border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-500/50 dark:bg-emerald-500/10">
              <motion.div
                className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-white text-emerald-700 shadow-[0_4px_0_0_theme(colors.emerald.300)] dark:bg-emerald-950 dark:text-emerald-300"
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 220, delay: 0.15 }}
              >
                <span className="text-[0.65rem] font-extrabold uppercase tracking-wider">Grade</span>
                <span className="max-w-[4.5rem] truncate text-2xl font-black leading-tight">
                  {existingSubmission.grade || "✓"}
                </span>
              </motion.div>
              <div className="min-w-0">
                <p className="text-lg font-black leading-snug">🌟 Well done!</p>
                <p className="text-sm font-semibold text-muted-foreground">
                  {existingSubmission.graded_at
                    ? `Marked ${format(new Date(existingSubmission.graded_at), "d MMM")}`
                    : "Your teacher marked this"}
                </p>
              </div>
            </div>

            {/* Teacher's words, as a chat bubble */}
            {existingSubmission.teacher_feedback && (
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xl" aria-hidden>
                  👩‍🏫
                </div>
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">Your teacher says</p>
                  <div className="rounded-3xl rounded-tl-md border-2 border-primary/20 bg-primary/5 px-4 py-3">
                    <p className="whitespace-pre-wrap break-words text-[1.0625rem] leading-relaxed text-foreground">
                      {existingSubmission.teacher_feedback}
                    </p>
                  </div>
                  {!existingReaction && !thanked ? (
                    <button
                      type="button"
                      className="mt-3 inline-flex h-11 items-center gap-2 rounded-2xl border-2 border-b-4 border-pink-300 bg-pink-50 px-4 text-sm font-extrabold text-pink-700 transition-[transform] duration-100 active:translate-y-[2px] active:border-b-2 disabled:opacity-60 dark:border-pink-500/50 dark:bg-pink-500/10 dark:text-pink-200"
                      onClick={() => thankMutation.mutate()}
                      disabled={thankMutation.isPending}
                    >
                      <Heart className="h-4 w-4" />
                      Thank you, Teacher!
                    </button>
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                      <Heart className="h-4 w-4 fill-pink-500 text-pink-500" /> You said thank you
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* What the student sent */}
            {(existingSubmission.submission_text || existingSubmission.file_name) && (
              <div className="rounded-3xl border-2 border-border bg-card p-4">
                <p className="mb-2 text-xs font-extrabold uppercase tracking-wide text-muted-foreground">What you sent</p>
                {existingSubmission.submission_text && (
                  <RichText html={existingSubmission.submission_text} size="sm" />
                )}
                {existingSubmission.file_name && (
                  <button
                    type="button"
                    onClick={downloadFile}
                    className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-bold"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="truncate">{existingSubmission.file_name}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {isSent && (
              <div className="rounded-2xl bg-sky-50 px-4 py-3 text-[0.9375rem] font-semibold text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
                📬 Sent! Your teacher will mark it soon. You can still change it and send again.
              </div>
            )}

            <div className="hw-answer-editor min-w-0">
              <Label htmlFor="submission-text" className="sr-only">Your answer</Label>
              <Suspense fallback={<div className="flex h-40 items-center justify-center rounded-3xl border-2 text-muted-foreground">Getting the answer box ready…</div>}>
                <ReactQuill
                  theme="snow"
                  value={submissionText}
                  onChange={setSubmissionText}
                  placeholder="Write your answer here…"
                  modules={{
                    toolbar: [
                      ["bold", "italic", "underline"],
                      [{ list: "ordered" }, { list: "bullet" }],
                      ["clean"],
                    ],
                  }}
                />
              </Suspense>
            </div>

            {/* Photo or file */}
            <div className="space-y-2">
              <input
                id={`submission-file-${homeworkId}`}
                type="file"
                className="sr-only"
                onChange={handleFileChange}
              />
              {file ? (
                <div className="flex items-center gap-3 rounded-2xl border-2 border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-500/50 dark:bg-emerald-500/10">
                  <span className="text-2xl" aria-hidden>📎</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-bold">{file.name}</span>
                    <span className="block text-xs font-semibold text-muted-foreground">{(file.size / 1024).toFixed(0)} KB · ready to send</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="shrink-0 rounded-full px-3 py-2 text-sm font-bold text-muted-foreground hover:bg-background"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <label
                  htmlFor={`submission-file-${homeworkId}`}
                  className="flex min-h-[3.5rem] cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-3 text-center text-[0.9375rem] font-extrabold text-primary transition hover:bg-primary/10"
                >
                  <Upload className="h-5 w-5 shrink-0" />
                  Add a photo or file
                  <span className="font-semibold text-muted-foreground">(up to 5 MB)</span>
                </label>
              )}
              {existingSubmission?.file_name && !file && (
                <button
                  type="button"
                  onClick={downloadFile}
                  className="inline-flex max-w-full items-center gap-2 rounded-xl bg-muted px-3 py-2 text-sm font-bold"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate">Sent before: {existingSubmission.file_name}</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => uploadMutation.mutate()}
              disabled={uploadMutation.isPending || (!submissionText && !file)}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 text-lg font-black tracking-wide text-white shadow-[0_5px_0_0_theme(colors.emerald.700)] transition-[transform,box-shadow] duration-100 active:translate-y-[4px] active:shadow-[0_1px_0_0_theme(colors.emerald.700)] disabled:bg-muted disabled:text-muted-foreground disabled:shadow-[0_5px_0_0_hsl(var(--border))] disabled:active:translate-y-0"
            >
              {uploadMutation.isPending ? (
                "Sending…"
              ) : (
                <>
                  {isSent ? "Send again" : "Send to my teacher"} <span aria-hidden>🚀</span>
                </>
              )}
            </button>
            {!submissionText && !file && (
              <p className="-mt-1 text-center text-sm font-semibold text-muted-foreground">
                Write your answer or add a photo, then tap send.
              </p>
            )}
          </>
        )}
      </motion.div>
    </>
  );
}
