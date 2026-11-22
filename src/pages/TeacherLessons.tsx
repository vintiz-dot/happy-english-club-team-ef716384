import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mic, AudioLines } from "lucide-react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { RecorderView } from "@/pages/TeacherRecorder";
import TeacherTranscripts from "@/pages/TeacherTranscripts";
import { RecordedInClass } from "@/components/lessons/RecordedInClass";

type Tab = "record" | "transcripts";

/**
 * /teacher/recorder - one place for a lesson: record it (Class recorder), then
 * its transcript and analysis (Transcript Insights, which still takes an
 * uploaded audio file or pasted text as the fallback). docs/LESSON_CAPTURE_MERGE_PLAN.md.
 *
 * Both panels stay mounted and one is hidden, so switching tabs can never
 * interrupt a recording or lose a transcript that is still being worked on.
 * Nothing here sends recorder audio anywhere: it is transcribed on the school laptop. The Transcripts tab takes the
 * laptop's draft transcript as text (upload or paste); the online audio upload is not offered on this page.
 */
export default function TeacherLessons() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get("tab") === "transcripts" ? "transcripts" : "record";
  const [recording, setRecording] = useState(false);
  const [focusClass, setFocusClass] = useState<{ classId: string; n: number } | undefined>();
  if (!user) return null;
  const pick = (t: Tab) => setParams(t === "record" ? {} : { tab: t }, { replace: true });

  const tabs: { id: Tab; label: string; icon: typeof Mic }[] = [
    { id: "record", label: "Record", icon: Mic },
    { id: "transcripts", label: "Transcripts & analysis", icon: AudioLines },
  ];

  return (
    <Layout title="Record & transcripts">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div role="tablist" aria-label="Lesson" className="flex gap-2 border-b">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => pick(id)}
              className={`min-h-11 px-4 -mb-px inline-flex items-center gap-2 border-b-2 text-sm font-medium ${tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              <Icon className="h-4 w-4" aria-hidden /> {label}
              {id === "record" && recording ? <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" aria-label="Recording" /> : null}
            </button>
          ))}
        </div>
        <div hidden={tab !== "record"}><RecorderView onActiveChange={setRecording} /></div>
        <div hidden={tab !== "transcripts"} className="space-y-6">
          <RecordedInClass userId={user.id} onAddTranscript={(classId) => setFocusClass((f) => ({ classId, n: (f?.n ?? 0) + 1 }))} />
          <TeacherTranscripts embedded focusClass={focusClass} />
        </div>
      </div>
    </Layout>
  );
}
