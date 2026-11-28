/**
 * StandardizedTestsCard - record a child's standardized test results
 * (Cambridge YLE / KET / PET / FCE / CAE, Linguaskill, IELTS, TOEFL Primary
 * / Junior, Oxford Placement Test) for Defend My Level.
 *
 * Staff only: admins any child, a teacher the children of their classes
 * (student_standardized_tests policies, 20261128200000). The level is
 * suggested from the score scale (src/lib/levelDefense/standardizedTests.ts)
 * and confirmed by the person typing it in from the score report.
 */
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Award, Loader2, Plus, Trash2 } from "lucide-react";
import {
  STANDARDIZED_LEVELS, STANDARDIZED_TESTS, scoreLabel, suggestCefr, testKind,
} from "@/lib/levelDefense/standardizedTests";
import { useAuth } from "@/hooks/useAuth";

interface Row {
  id: string;
  test_name: string;
  test_date: string;
  overall_score: number | null;
  score_label: string | null;
  skill_scores: Record<string, unknown> | null;
  cefr_level: string;
  certificate_ref: string | null;
  notes: string | null;
}

export function StandardizedTestsCard({ studentId, onChanged }: { studentId: string; onChanged?: () => void }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [adding, setAdding] = useState(false);
  const [kindId, setKindId] = useState(STANDARDIZED_TESTS[0].id);
  const [otherName, setOtherName] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [score, setScore] = useState("");
  const [skills, setSkills] = useState<Record<string, string>>({});
  const [level, setLevel] = useState<string>("");
  const [cert, setCert] = useState("");
  const [notes, setNotes] = useState("");

  const kind = testKind(kindId);
  const num = score.trim() === "" ? null : Number(score);
  const suggested = useMemo(() => suggestCefr(kind, num), [kind, num]);
  const chosenLevel = level || suggested || "";

  const key = ["standardized-tests", studentId];
  const { data: rows = [], isLoading, error } = useQuery<Row[]>({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("student_standardized_tests")
        .select("id, test_name, test_date, overall_score, score_label, skill_scores, cefr_level, certificate_ref, notes")
        .eq("student_id", studentId).order("test_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const done = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: ["cefr-defense", studentId] });
    qc.invalidateQueries({ queryKey: ["level-defense-admin"] });
    onChanged?.();
  };

  const add = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not signed in");
      const name = kindId === "other" ? otherName.trim() : kind?.name ?? "";
      if (!name) throw new Error("Name the test");
      if (!chosenLevel) throw new Error("Choose the CEFR level the score report gives");
      if (num !== null && !Number.isFinite(num)) throw new Error("The score must be a number");
      const skill_scores: Record<string, number | string> = {};
      for (const [k, v] of Object.entries(skills)) {
        if (v.trim() === "") continue;
        const n = Number(v);
        skill_scores[k] = Number.isFinite(n) ? n : v.trim();
      }
      const { error } = await supabase.from("student_standardized_tests").insert({
        student_id: studentId,
        test_name: name,
        test_date: date,
        overall_score: num,
        score_label: scoreLabel(kind, num),
        skill_scores,
        cefr_level: chosenLevel,
        certificate_ref: cert.trim() || null,
        notes: notes.trim() || null,
        recorded_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Standardized result recorded");
      setAdding(false); setScore(""); setSkills({}); setLevel(""); setCert(""); setNotes(""); setOtherName("");
      done();
    },
    onError: (e: any) => toast.error("Couldn't record the result", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("student_standardized_tests").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Result removed"); done(); },
    onError: (e: any) => toast.error("Couldn't remove it", { description: e.message }),
  });

  return (
    <div className="space-y-3 rounded-hec-md border border-hec-line p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-hec-caption font-medium uppercase tracking-wider text-hec-ink-soft">
          <Award className="h-3.5 w-3.5" />Standardized test results
        </p>
        {!adding && (
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAdding(true)}>
            <Plus className="h-3.5 w-3.5" />Add a result
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="flex items-center gap-1.5 text-hec-small text-hec-ink-soft"><Loader2 className="h-3.5 w-3.5 animate-spin" />Loading…</p>
      ) : error ? (
        <p className="text-hec-small text-hec-warn">
          Results can't be read yet{String((error as any).message || "").includes("does not exist") || String((error as any).code) === "PGRST205" ? " - migration 20261128200000 is not applied." : `: ${(error as any).message}`}
        </p>
      ) : rows.length === 0 ? (
        <p className="text-hec-small text-hec-ink-soft">None recorded. A recent standardized result is the strongest evidence in a level defence.</p>
      ) : (
        <ul className="divide-y divide-hec-line">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="text-hec-small font-semibold text-hec-ink">{r.test_name} <span className="font-normal text-hec-ink-soft">· {r.test_date}</span></p>
                <p className="text-hec-caption text-hec-ink-soft">
                  {[r.score_label, r.skill_scores && Object.keys(r.skill_scores).length
                    ? Object.entries(r.skill_scores).map(([k, v]) => `${k} ${v}`).join(", ") : null,
                    r.certificate_ref ? `ref ${r.certificate_ref}` : null].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-hec-h3 font-medium text-hec-brass">{r.cefr_level}</span>
                <Button size="icon" variant="ghost" aria-label="Remove this result"
                  disabled={remove.isPending}
                  onClick={() => { if (window.confirm(`Remove ${r.test_name} (${r.test_date})?`)) remove.mutate(r.id); }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className="space-y-3 rounded-hec-md bg-hec-sunken p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Test</Label>
              <Select value={kindId} onValueChange={(v) => { setKindId(v); setLevel(""); setSkills({}); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STANDARDIZED_TESTS.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {kindId === "other" && (
              <div className="space-y-1">
                <Label>Test name</Label>
                <Input value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="e.g. Pearson English International Certificate" />
              </div>
            )}
            <div className="space-y-1">
              <Label>Date taken</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{kind?.scoreHint ?? "Score"}</Label>
              <Input inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} placeholder="Overall" />
            </div>
            <div className="space-y-1">
              <Label>CEFR level on the report</Label>
              <Select value={chosenLevel} onValueChange={setLevel}>
                <SelectTrigger><SelectValue placeholder="Level…" /></SelectTrigger>
                <SelectContent>
                  {STANDARDIZED_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <p className="text-hec-caption text-hec-ink-soft">
                {suggested ? `The score scale points to ${suggested}. Check it against the report.` : "Take the level the score report states."}
              </p>
            </div>
          </div>
          {(kind?.skills ?? []).length > 0 && (
            <div className="grid gap-2 sm:grid-cols-4">
              {kind!.skills.map((s) => (
                <div key={s} className="space-y-1">
                  <Label className="text-hec-caption">{s}</Label>
                  <Input inputMode="decimal" value={skills[s] ?? ""} onChange={(e) => setSkills((m) => ({ ...m, [s]: e.target.value }))} />
                </div>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Certificate / candidate number (optional)</Label>
              <Input value={cert} onChange={(e) => setCert(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[40px]" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
            <Button size="sm" disabled={add.isPending || !chosenLevel} onClick={() => add.mutate()}>
              {add.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save result"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
