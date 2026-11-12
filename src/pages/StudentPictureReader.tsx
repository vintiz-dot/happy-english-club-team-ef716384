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
      <div className="max-w-3xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-hec-md border border-hec-line bg-hec-sunken">
            <Languages className="h-7 w-7 text-hec-ink-soft" />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-hec-h1 font-medium text-hec-ink">Picture Reader</h1>
            <p className="text-hec-small text-hec-ink-soft">Read with pictures · Đọc cùng hình ảnh</p>
          </div>
        </div>

        {open ? (
          <Reader set={open} onBack={() => setOpen(null)} />
        ) : isLoading ? (
          <p className="text-hec-body text-hec-ink-soft">Loading…</p>
        ) : sets.length === 0 ? (
          <div className="rounded-hec-lg border border-dashed border-hec-line-strong bg-hec-surface p-10 text-center text-hec-body text-hec-ink-soft">
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
                  className="min-h-[5.5rem] w-full rounded-hec-lg border border-hec-line bg-hec-surface p-4 text-left shadow-hec-1 transition-shadow duration-hec-1 ease-hec hover:shadow-hec-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring"
                >
                  <div className="break-words text-hec-h3 font-medium text-hec-ink">{s.title}</div>
                  <div className="text-hec-small text-hec-ink-soft">
                    {s.sentences.length} sentence{s.sentences.length === 1 ? "" : "s"} · {s.class_names.join(", ")}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-center text-hec-caption text-hec-ink-soft">{ATTRIBUTION}</p>
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
    return <Button variant="secondary" onClick={onBack}>← Back</Button>;
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="quiet" onClick={onBack}>← All stories</Button>
        <span className="text-hec-small tabular-nums text-hec-ink-soft">{i + 1} / {total}</span>
      </div>
      {set.description && <p className="text-hec-body text-hec-ink-soft">{set.description}</p>}
      <div className="flex min-h-[14rem] items-center rounded-hec-lg border border-hec-line bg-hec-surface p-4 shadow-hec-1 sm:p-6 md:p-8">
        <PictureStrip cells={sentence.cells} mode="reader" onCellClick={(cell) => speak(cell.text)} />
      </div>
      <div className="flex gap-2">
        <Button size="lg" variant="secondary" className="h-14 flex-1 text-base" disabled={i === 0} onClick={() => setI(i - 1)}>
          <ChevronLeft className="h-5 w-5 mr-1" /> Back
        </Button>
        <Button size="lg" variant="secondary" className="h-14 flex-1 text-base" onClick={() => speak(sentence.text)}>
          <Volume2 className="h-5 w-5 mr-1.5" /> Listen
        </Button>
        <Button size="lg" className="h-14 flex-1 text-base" disabled={i >= total - 1} onClick={() => setI(i + 1)}>
          Next <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </div>
      {i >= total - 1 && <p className="text-center text-hec-h3 text-hec-ink">🎉 The end!</p>}
    </div>
  );
}
