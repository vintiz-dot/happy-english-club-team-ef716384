/**
 * One picture set: type sentences, check the pictures, save, and choose which
 * of your classes may read it. Nothing reaches a child until it is saved AND
 * switched on for their class.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, FileUp, Loader2, Save, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import {
  lsDb, useActivations, useOverrides, useTeacherClasses, type LanguageSet,
} from "@/hooks/useLanguageSupport";
import { lookupPictogram } from "@/lib/languageSupport/arasaac";
import {
  ATTRIBUTION, approvedSentence, buildStrip, flagsIn, readImportedSet, withPictogram, withoutPicture,
  type ApprovedSentence, type Cell, type Lexicon,
} from "@/lib/languageSupport/strip";
import { PictureStrip } from "./PictureStrip";
import { PictogramPicker } from "./PictogramPicker";

/** The bundled picture lexicon is loaded on first use, not with the app. */
let lexiconPromise: Promise<Lexicon> | null = null;
export const loadLexicon = () =>
  (lexiconPromise ??= import("@/lib/languageSupport/lexicon.json").then((m) => (m.default as any).concepts as Lexicon));

interface Props {
  set: LanguageSet | null; // null = a new set
  onSaved: (id: string) => void;
  onDeleted: () => void;
}

export function SetEditor({ set, onSaved, onDeleted }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(set?.title ?? "");
  const [description, setDescription] = useState(set?.description ?? "");
  const [sentences, setSentences] = useState<ApprovedSentence[]>(set?.sentences ?? []);
  const [draft, setDraft] = useState("");
  const [building, setBuilding] = useState(false);
  const [lexicon, setLexicon] = useState<Lexicon>({});
  const [picking, setPicking] = useState<{ s: number; c: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: overrides = {} } = useOverrides();
  const { data: classes = [] } = useTeacherClasses();
  const { data: activations = {} } = useActivations(set ? [set.id] : []);
  const live = set ? activations[set.id] ?? {} : {};

  useEffect(() => { void loadLexicon().then(setLexicon); }, []);
  // Switching to another set (or to a new one) starts from that set.
  useEffect(() => {
    setTitle(set?.title ?? "");
    setDescription(set?.description ?? "");
    setSentences(set?.sentences ?? []);
    setDirty(false);
    setDraft("");
  }, [set?.id]);

  const touch = <T,>(setter: (v: T) => void) => (v: T) => { setter(v); setDirty(true); };

  const addSentences = async () => {
    // One sentence per line, so a whole page of text can be pasted in at once.
    const lines = draft.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return;
    setBuilding(true);
    try {
      const lex = Object.keys(lexicon).length ? lexicon : await loadLexicon();
      const built: ApprovedSentence[] = [];
      for (const line of lines.slice(0, 30)) {
        built.push(approvedSentence(await buildStrip(line, { lexicon: lex, overrides, lookup: lookupPictogram })));
      }
      setSentences((s) => [...s, ...built]);
      setDraft("");
      setDirty(true);
    } finally {
      setBuilding(false);
    }
  };

  const picked = useMutation({
    mutationFn: async ({ concept, pictogram }: { concept: string; pictogram: number }) => {
      const { error } = await lsDb
        .from("language_support_overrides")
        .upsert({ owner_user_id: user!.id, concept, pictogram }, { onConflict: "owner_user_id,concept" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["language-support-overrides"] }),
    onError: () => toast.error("The picture was changed here, but could not be remembered for next time."),
  });

  const choose = (pictogram: number) => {
    if (!picking) return;
    const cell = sentences[picking.s]?.cells[picking.c];
    if (!cell) return;
    const concept = (cell.concept ?? cell.text).toLowerCase();
    // The same word in every sentence of this set gets the same picture.
    setSentences((all) =>
      all.map((sentence, si) => ({
        ...sentence,
        cells: sentence.cells.map((c, ci) =>
          (si === picking.s && ci === picking.c) || (c.kind !== "word" && c.concept === concept)
            ? withPictogram(c, pictogram)
            : c,
        ),
      })),
    );
    setDirty(true);
    setPicking(null);
    picked.mutate({ concept, pictogram });
  };

  const remove = () => {
    if (!picking) return;
    setSentences((all) =>
      all.map((sentence, si) =>
        si !== picking.s
          ? sentence
          : { ...sentence, cells: sentence.cells.map((c, ci) => (ci === picking.c ? withoutPicture(c, sentence.tokens) : c)) },
      ),
    );
    setDirty(true);
    setPicking(null);
  };

  const save = useMutation({
    mutationFn: async () => {
      const row = { title: title.trim(), description: description.trim() || null, sentences };
      if (!row.title) throw new Error("Give the set a name first.");
      if (set) {
        const { error } = await lsDb.from("language_support_sets").update(row).eq("id", set.id);
        if (error) throw error;
        return set.id as string;
      }
      const { data, error } = await lsDb
        .from("language_support_sets")
        .insert({ ...row, owner_user_id: user!.id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: (id) => {
      toast.success("Set saved");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["language-support-sets"] });
      qc.invalidateQueries({ queryKey: ["language-support-for-student"] });
      onSaved(id);
    },
    onError: (e: any) => toast.error(e?.message || "The set could not be saved."),
  });

  const activate = useMutation({
    mutationFn: async ({ classId, on }: { classId: string; on: boolean }) => {
      const { error } = await lsDb
        .from("language_support_set_classes")
        .upsert({ set_id: set!.id, class_id: classId, active: on, created_by: user!.id }, { onConflict: "set_id,class_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["language-support-activations"] });
      qc.invalidateQueries({ queryKey: ["language-support-for-student"] });
    },
    onError: () => toast.error("That class could not be changed."),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await lsDb.from("language_support_sets").delete().eq("id", set!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Set deleted");
      qc.invalidateQueries({ queryKey: ["language-support-sets"] });
      qc.invalidateQueries({ queryKey: ["language-support-for-student"] });
      onDeleted();
    },
    onError: () => toast.error("The set could not be deleted."),
  });

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = readImportedSet(JSON.parse(await file.text()));
      if (!imported.sentences.length) return toast.error("No sentences with pictures were found in that file.");
      setSentences((s) => [...s, ...imported.sentences]);
      if (!title.trim()) setTitle(imported.title);
      setDirty(true);
      toast.success(
        `Added ${imported.sentences.length} sentence${imported.sentences.length === 1 ? "" : "s"}` +
          (imported.skipped ? ` (${imported.skipped} skipped)` : ""),
      );
    } catch {
      toast.error("That file is not a picture set.");
    }
  };

  const toCheck = useMemo(() => sentences.reduce((n, s) => n + flagsIn(s).length, 0), [sentences]);
  const pickedCell: Cell | null = picking ? sentences[picking.s]?.cells[picking.c] ?? null : null;
  const activeCount = classes.filter((c) => live[c.id]).length;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{set ? "Edit set" : "New set"}</CardTitle>
          <CardDescription>A set is a short list of sentences with pictures. Children read it one sentence at a time.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ls-title">Name</Label>
              <Input id="ls-title" value={title} maxLength={120} placeholder="Week 3: farm animals" onChange={(e) => touch(setTitle)(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ls-desc">Note for children (optional)</Label>
              <Input id="ls-desc" value={description} onChange={(e) => touch(setDescription)(e.target.value)} placeholder="Read and look at the pictures" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sentences</CardTitle>
          <CardDescription>
            Pictures sit over the words they came from. Tap a picture to change it. Ringed pictures are the ones to double-check.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Textarea
              value={draft}
              rows={3}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={"The cat sits on the mat.\nTwo birds fly in the sky."}
              aria-label="Type sentences, one per line"
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={addSentences} disabled={building || !draft.trim()}>
                {building ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Wand2 className="h-4 w-4 mr-1.5" />}
                Add with pictures
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                <FileUp className="h-4 w-4 mr-1.5" /> Import a set file
              </Button>
              <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
            </div>
          </div>

          {sentences.length === 0 ? (
            <p className="text-sm text-muted-foreground rounded-lg border border-dashed p-6 text-center">
              No sentences yet. Type one above, one per line.
            </p>
          ) : (
            <ol className="space-y-3">
              {sentences.map((sentence, si) => {
                const flags = flagsIn(sentence);
                return (
                  <li key={`${si}-${sentence.text}`} className="rounded-xl border p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-xs text-muted-foreground">#{si + 1}</span>
                      <div className="flex items-center gap-2">
                        {flags.length > 0 && (
                          <Badge variant="outline" className="gap-1 border-amber-400 text-amber-700 dark:text-amber-300" title={flags.join("\n")}>
                            <AlertTriangle className="h-3 w-3" /> {flags.length} to check
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remove sentence"
                          onClick={() => { setSentences((a) => a.filter((_, i) => i !== si)); setDirty(true); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <PictureStrip cells={sentence.cells} onCellClick={(_, ci) => setPicking({ s: si, c: ci })} />
                  </li>
                );
              })}
            </ol>
          )}
          {toCheck > 0 && (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {toCheck} picture{toCheck === 1 ? "" : "s"} to double-check. The picture finder guesses; you decide what a child sees.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="lg" onClick={() => save.mutate()} disabled={save.isPending || (!dirty && !!set)}>
          {save.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
          {set ? "Save changes" : "Save set"}
        </Button>
        {set && !dirty && <span className="text-sm text-muted-foreground flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> Saved</span>}
        {set && (
          <Button variant="ghost" className="ml-auto text-destructive" disabled={del.isPending}
            onClick={() => { if (window.confirm(`Delete “${set.title}”? Children will no longer see it.`)) del.mutate(); }}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Delete set
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Which classes can use it?</CardTitle>
          <CardDescription>
            {set
              ? "Switch it on for any of your classes. Children in those classes find it under Picture Reader."
              : "Save the set first, then choose its classes."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!set ? null : classes.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have no classes yet.</p>
          ) : (
            <>
              <ul className="divide-y">
                {classes.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 py-2.5">
                    <Label htmlFor={`ls-class-${c.id}`} className="text-sm font-medium cursor-pointer flex-1">{c.name}</Label>
                    <span className="text-xs text-muted-foreground">{live[c.id] ? "On" : "Off"}</span>
                    <Switch
                      id={`ls-class-${c.id}`}
                      checked={!!live[c.id]}
                      disabled={activate.isPending || dirty}
                      onCheckedChange={(on) => activate.mutate({ classId: c.id, on })}
                    />
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                {dirty ? "Save your changes before switching classes. " : ""}
                On for {activeCount} of {classes.length} class{classes.length === 1 ? "" : "es"}.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{ATTRIBUTION}</p>

      <PictogramPicker cell={pickedCell} lexicon={lexicon} onClose={() => setPicking(null)} onPick={choose} onRemove={remove} />
    </div>
  );
}
