import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Languages, Volume2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { useSetsForStudent, type ChildSet } from "@/hooks/useLanguageSupport";
import { PictureStrip } from "@/components/language-support/PictureStrip";
import { ATTRIBUTION } from "@/lib/languageSupport/strip";
import { speak } from "@/lib/video/kidVideo";

/**
 * "Picture Reader": the sets a teacher has switched on for the child's
 * classes, read one sentence at a time. Read only. Big pictures, big words,
 * a Listen button, and a tap on any picture says its word.
 */
export default function StudentPictureReader() {
  const { studentId } = useStudentProfile();
  const { data: sets = [], isLoading } = useSetsForStudent(studentId);
  const [open, setOpen] = useState<ChildSet | null>(null);

  return (
    <Layout title="Picture Reader">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 flex items-center justify-center shadow-md">
            <Languages className="h-7 w-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Picture Reader</h1>
            <p className="text-sm text-muted-foreground">Read with pictures · Đọc cùng hình ảnh</p>
          </div>
        </div>

        {open ? (
          <Reader set={open} onBack={() => setOpen(null)} />
        ) : isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : sets.length === 0 ? (
          <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
            <div className="text-5xl mb-2">📖</div>
            Your teacher has not shared a picture story yet.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {sets.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => setOpen(s)}
                  className="w-full text-left rounded-2xl border-2 p-4 hover:bg-accent hover:border-primary transition min-h-[5.5rem]"
                >
                  <div className="text-lg font-bold">{s.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {s.sentences.length} sentence{s.sentences.length === 1 ? "" : "s"} · {s.class_names.join(", ")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[11px] text-muted-foreground text-center">{ATTRIBUTION}</p>
      </div>
    </Layout>
  );
}

function Reader({ set, onBack }: { set: ChildSet; onBack: () => void }) {
  const [i, setI] = useState(0);
  const total = set.sentences.length;
  const sentence = set.sentences[i];
  useEffect(() => () => { if (typeof window !== "undefined") window.speechSynthesis?.cancel(); }, []);

  if (!sentence) {
    return <Button variant="outline" onClick={onBack}>← Back</Button>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>← All stories</Button>
        <span className="text-sm text-muted-foreground">{i + 1} / {total}</span>
      </div>
      {set.description && <p className="text-muted-foreground">{set.description}</p>}
      <div className="rounded-3xl border-2 bg-card p-5 md:p-8 min-h-[14rem] flex items-center">
        <PictureStrip cells={sentence.cells} mode="reader" onCellClick={(cell) => speak(cell.text)} />
      </div>
      <div className="flex gap-2">
        <Button size="lg" variant="outline" className="h-14 flex-1 text-base" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <Button size="lg" variant="secondary" className="h-14 flex-1 text-base" onClick={() => speak(sentence.text)}>
          <Volume2 className="h-5 w-5 mr-1.5" /> Listen
        </Button>
        <Button size="lg" className="h-14 flex-1 text-base" disabled={i >= total - 1} onClick={() => setI(i + 1)}>
          Next <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>
      {i >= total - 1 && <p className="text-center text-lg">🎉 The end!</p>}
    </div>
  );
}
