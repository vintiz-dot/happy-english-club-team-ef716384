import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Deck } from "@/lib/lessonDecks/types";
import { TIERS, byTier, weekMaterial, weekPlan, weekText } from "@/lib/lessonDecks/weekHomework";
import { ruleFor } from "@/lib/lessonDecks/curricula";
import { downloadBlob, tryMakeDocument } from "@/lib/hecDocs";
import type { TierLevel } from "@/lib/lessonDecks/types";
import { Button } from "@/components/ui/button";
import { PenLine, Send } from "lucide-react";
import { toast } from "sonner";

// The homework buttons for a deck whose homework is a day-by-day week (the IELTS
// course): one printed week per child present, and the week posted in the app for
// the present children of each tier. Homework goes only to the children in the
// lesson (today's Present and Late marks); both refuse until attendance is taken.

type Kid = { id: string; name: string };
const NO_ATTENDANCE = "Take today's attendance first: homework goes only to the children marked Present or Late.";
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** One page per child: their tier's week as a Mon-Sun table, then each task and how it is checked. */
export function weekSheetsMarkup(deck: Deck, kids: Kid[], interests: Record<string, string[]>): string {
  const groups = byTier(kids, interests);
  return TIERS.flatMap((tier) => groups[tier].map((k) => {
    const p = weekPlan(deck, tier);
    const cells = p.days.map((d) => `<td style="vertical-align:top;border:1px solid #999;padding:4px;width:14%">
      ${d.items.map((x) => `<div>${esc(x.label)}${x.minutes ? ` <small>(${x.minutes} min)</small>` : ""}</div><div style="margin-top:2px">&#9744; done</div>`).join("<hr style='margin:4px 0'>") || "<small>rest</small>"}</td>`).join("");
    return `<section class="deck-page" style="font-family:sans-serif;font-size:12px">
      <h2 style="margin:0">${esc(k.name)} · ${esc(deck.title)}</h2>
      <p style="margin:2px 0 8px">Homework this week · ${tier} · about ${p.minutes} minutes in all</p>
      <table style="border-collapse:collapse;width:100%"><tr>${p.days.map((d) => `<th style="border:1px solid #999;padding:4px">${d.day}</th>`).join("")}</tr><tr>${cells}</tr></table>
      ${p.items.map((i) => `<h3 style="margin:10px 0 2px">${esc(i.label)}${i.days?.length ? ` <small>(${i.days.join(", ")})</small>` : ""}</h3>
        <p style="margin:0">${esc(i.detail)}</p>${i.check ? `<p style="margin:2px 0 0"><b>How your teacher checks it:</b> ${esc(i.check)}</p>` : ""}`).join("")}
    </section>`;
  })).join("");
}

/** HEC Docs first (one student copy per child, in turn); the plain print if the printer cannot be reached. */
async function printWeekSheets(deck: Deck, kids: Kid[], interests: Record<string, string[]>) {
  const groups = byTier(kids, interests);
  const course = ruleFor(deck.curriculum)?.name ?? "Lesson materials";
  const run = TIERS.flatMap((t) => groups[t].map((k) => ({ k, t })));
  for (const { k, t } of run) {
    const doc = await tryMakeDocument("lesson-material", weekMaterial(deck, t, k.name, course) as unknown as Record<string, unknown>,
      { variant: "student", bulk: run.length > 1 });
    if (!doc) { plainPrint(deck, kids, interests); return; }
    downloadBlob(doc.blob, doc.filename);
  }
}

function plainPrint(deck: Deck, kids: Kid[], interests: Record<string, string[]>) {
  const w = window.open("", "_blank");
  if (!w) { toast.error("Allow pop-ups to print the homework sheets"); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(deck.title)} homework</title>
    <style>@page{size:A4 landscape;margin:10mm}.deck-page{break-after:page}body{background:#fff}</style></head>
    <body>${weekSheetsMarkup(deck, kids, interests)}<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  w.document.close();
}

export function WeekHomeworkButtons({ deck, classId, getPresent, enrolled, interests, due }: {
  deck: Deck; classId: string | null; getPresent: () => Promise<Kid[] | null>; enrolled: number; interests: Record<string, string[]>; due: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const post = async () => {
    if (!classId) return;
    const present = await getPresent();
    if (!present || present.length === 0) { toast.error(NO_ATTENDANCE); return; }
    const groups = byTier(present, interests);
    const tiers = TIERS.filter((t) => groups[t].length > 0);
    const away = Math.max(enrolled - present.length, 0);
    const summary = tiers.map((t) => `${t}: ${groups[t].length}`).join(", ");
    if (!confirm(`Post this week's homework for the ${present.length} children present today (${summary})${away ? `; ${away} absent get nothing` : ""}${due ? `, due ${due}` : ""}? Each tier gets its own week.`)) return;
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const rows = tiers.map((t: TierLevel) => ({
      class_id: classId, title: `${deck.title}: homework (${t})`, body: weekText(deck, t), due_date: due,
      created_by: auth.user?.id ?? null, student_ids: groups[t].map((s) => s.id),
    }));
    const { error } = await supabase.from("homeworks").insert(rows as any);
    setBusy(false);
    if (error && (error.code === "PGRST204" || error.code === "42703" || /student_ids/.test(error.message)))
      toast.error("Not posted: homework for present children needs migration 20261122150000_homework_for_present.sql", { description: "Print the homework sheets for now." });
    else if (error) toast.error("Could not post the homework", { description: error.message });
    else toast.success("Homework posted", { description: `${deck.title} · ${summary}${due ? ` · due ${due}` : ""}` });
  };
  return (
    <>
      <Button size="sm" variant="outline" title="One week plan per child present today, in their tier"
        onClick={async () => {
          const present = await getPresent();
          if (present?.length) void printWeekSheets(deck, present, interests);
          else toast.error(NO_ATTENDANCE);
        }}>
        <PenLine className="h-4 w-4" />Homework sheets
      </Button>
      {classId && (
        <Button size="sm" variant="outline" disabled={busy} title="Posts each tier's week in the app for the children present today" onClick={() => void post()}>
          <Send className="h-4 w-4" />Set in app
        </Button>
      )}
    </>
  );
}
