/**
 * The voice-award board overlay.
 *
 * After a voice command saves points, the class board slides OVER whatever page
 * is open (a portal, not a route: the page underneath keeps its state and
 * scroll), the child's row is centred, a big "+30 Writing" rises from it, about
 * a second later the board is read again from the SERVER and the rows move to
 * their new order, it holds VOICE_AWARD_HOLD_MS, then fades out.
 *
 * Every figure and every rank on screen is the server's (`leaderboard_board` for
 * staff, `class-leaderboard` for anyone else). The browser never adds points to
 * work out a rank. Mount once, anywhere inside the QueryClientProvider:
 *   <VoiceAwardOverlay />            (plays every class)
 *   <VoiceAwardOverlay classId={id}/> (a projector page: only that class)
 *
 * Plays awards from `announceVoiceAward` (this browser) and from Supabase
 * realtime INSERTs on point_transactions whose notes start with
 * VOICE_AWARD_NOTE_PREFIX (another device, e.g. the projector); both are
 * deduped by transaction id.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  orderedRows,
  shownPoints,
  shownRank,
  type ServerBoard,
  type ServerRow,
} from "@/lib/leaderboard/board";
import { announceVoiceAward, consumeLocalEcho, onVoiceAward, voiceAwardSeen } from "@/lib/voiceAward/events";
import {
  dequeue,
  emptyQueue,
  enqueue,
  formatDelta,
  timeline,
  windowAround,
  FADE_MS,
  type OverlayItem,
  type OverlayQueue,
} from "@/lib/voiceAward/overlayQueue";
import {
  VOICE_AWARD_NOTE_PREFIX,
  VOICE_AWARD_SKILLS,
  type VoiceAwardApplied,
  type VoiceAwardSkill,
} from "@/lib/voiceAward/types";

// Palette of the class board (src/components/leaderboard/palette.ts), inlined as
// plain values so the overlay stands alone and looks right on a dark projector.
const INDIGO = "#1E3B8A";
const INDIGO_DEEP = "#14102B";
const TEAL = "#25DCCB";
const AMBER = "#FFC83D";
const GREEN = "#4FB783";
const CORAL = "#FF9D6E";
const PAPER = "#FAF9FD";

const SKILL_LABEL: Record<VoiceAwardSkill, { icon: string; label: string }> = {
  speaking: { icon: "\u{1F5E3}", label: "Speaking" },
  listening: { icon: "\u{1F442}", label: "Listening" },
  reading: { icon: "\u{1F4D6}", label: "Reading" },
  writing: { icon: "✍", label: "Writing" },
  focus: { icon: "\u{1F3AF}", label: "Focus" },
  teamwork: { icon: "\u{1F91D}", label: "Teamwork" },
};

const MAX_ROWS = 9;

/** The month's board, from the server, as the caller (staff first, else the family/student function). */
async function fetchBoard(classId: string): Promise<ServerBoard | null> {
  try {
    const { data, error } = await supabase.rpc("leaderboard_board" as never, {
      p_class: classId, p_period: "month", p_anchor: null, p_wall: false, p_category: null,
    } as never);
    if (!error && data) return data as unknown as ServerBoard;
  } catch { /* fall through to the function */ }
  try {
    const res = await supabase.functions.invoke("class-leaderboard", {
      body: { classId, period: "month", anchor: null, category: null },
    });
    const d = res.data as { board?: ServerBoard } | null;
    return d?.board ?? null;
  } catch {
    return null;
  }
}

function skillOfNote(notes: string | null | undefined): VoiceAwardSkill | null {
  const n = (notes ?? "").slice(VOICE_AWARD_NOTE_PREFIX.length).toLowerCase();
  return VOICE_AWARD_SKILLS.find((s) => n.includes(s)) ?? null;
}

export function VoiceAwardOverlay({ classId, remote = false }: { classId?: string; remote?: boolean }) {
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<OverlayQueue>(emptyQueue);
  const [current, setCurrent] = useState<OverlayItem | null>(null);
  // The board the page already held when the award arrived: the "before".
  const snapshots = useRef(new Map<string, ServerBoard>());
  const queueRef = useRef(queue);
  queueRef.current = queue;

  const snapshotOf = useCallback((cid: string): ServerBoard | null => {
    const hits = queryClient.getQueriesData<{ board?: ServerBoard }>({ queryKey: ["class-board", cid] });
    for (const [, v] of hits) {
      const b = v?.board;
      if (b && b.period?.kind === "month" && !b.category) return b;
    }
    return null;
  }, [queryClient]);

  const push = useCallback((a: VoiceAwardApplied) => {
    if (classId && a.classId !== classId) return;
    const snap = snapshotOf(a.classId);
    setQueue((q) => {
      const next = enqueue(q, a);
      const it = next.pending.find((p) => p.award.classId === a.classId && p.award.studentId === a.studentId);
      if (it && snap && !snapshots.current.has(it.key)) snapshots.current.set(it.key, snap);
      return next;
    });
  }, [classId, snapshotOf]);

  // This browser's own awards.
  useEffect(() => onVoiceAward(push), [push]);

  // Another device's awards (a projector): realtime inserts of voice rows.
  useEffect(() => {
    // Only a projector page (remote + a class) listens to the database.
    if (!remote || !classId) return;
    const channel = supabase
      .channel(`voice-award-${classId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "point_transactions", filter: `class_id=eq.${classId}` },
        (payload) => {
          const r = payload.new as { id?: string; student_id?: string; class_id?: string; points?: number; notes?: string | null };
          if (!r?.id || !r.student_id || !r.class_id || typeof r.points !== "number") return;
          if (!(r.notes ?? "").startsWith(VOICE_AWARD_NOTE_PREFIX)) return;
          // Give the saving browser a moment to announce it with the name and skill.
          window.setTimeout(() => {
            if (voiceAwardSeen(r.id) || consumeLocalEcho(r.student_id!, r.points!)) return;
            const board = snapshotOf(r.class_id!);
            const name = board?.rows.find((x) => x.student_id === r.student_id)?.name ?? "";
            announceVoiceAward({
              classId: r.class_id!, studentId: r.student_id!, studentName: name,
              points: r.points!, skill: skillOfNote(r.notes), transactionId: r.id!,
            });
          }, 700);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [classId, remote, snapshotOf]);

  // Start the next award when the stage is free.
  useEffect(() => {
    if (current || !queue.pending.length) return;
    const { item, rest } = dequeue(queue);
    setQueue(rest);
    setCurrent(item);
  }, [current, queue]);

  const done = useCallback(() => {
    if (current) snapshots.current.delete(current.key);
    setCurrent(null);
  }, [current]);

  if (!current || typeof document === "undefined") return null;
  return createPortal(
    <Stage
      key={current.key}
      item={current}
      before={snapshots.current.get(current.key) ?? null}
      pendingCount={queue.pending.length}
      pendingRef={queueRef}
      onDone={done}
    />,
    document.body,
  );
}

function Stage({
  item, before, pendingCount, pendingRef, onDone,
}: {
  item: OverlayItem;
  before: ServerBoard | null;
  pendingCount: number;
  pendingRef: MutableRefObject<OverlayQueue>;
  onDone: () => void;
}) {
  const { award } = item;
  const queryClient = useQueryClient();
  const reduced = !!useReducedMotion();
  const [board, setBoard] = useState<ServerBoard | null>(before);
  const [afterBoard, setAfterBoard] = useState<ServerBoard | null>(null);
  const [badgeOn, setBadgeOn] = useState(false);
  const [resortReached, setResortReached] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  // Timers: badge, read the board again, re-sort, hold, fade, finish.
  useEffect(() => {
    const t = timeline({ pending: pendingCount, reducedMotion: reduced });
    const timers: number[] = [];
    let alive = true;
    const at = (ms: number, fn: () => void) => { timers.push(window.setTimeout(() => { if (alive) fn(); }, ms)); };

    // No snapshot: show what the server has now (it may already hold the award).
    if (!before) void fetchBoard(award.classId).then((b) => { if (alive && b) setBoard((cur) => cur ?? b); });

    at(t.badgeAtMs, () => setBadgeOn(true));
    at(t.refetchAtMs, () => {
      void fetchBoard(award.classId).then((b) => { if (alive && b) setAfterBoard(b); });
      // Every other open board of this class catches up too.
      void queryClient.invalidateQueries({ queryKey: ["class-board", award.classId] });
    });
    at(t.resortMs, () => {
      setResortReached(true);
      const hold = timeline({ pending: pendingRef.current.pending.length, reducedMotion: reduced });
      at(hold.leaveAtMs - hold.resortMs, () => {
        setLeaving(true);
        at(reduced ? 150 : FADE_MS, () => doneRef.current());
      });
    });
    return () => { alive = false; timers.forEach((x) => window.clearTimeout(x)); };
    // The plan is fixed when the award starts playing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-sort: once the time has come AND the server's new board is in.
  useEffect(() => {
    if (resortReached && afterBoard) setBoard(afterBoard);
  }, [resortReached, afterBoard]);

  // Escape closes early; the page underneath is untouched.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") doneRef.current(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ordered = useMemo(() => (board ? orderedRows(board, null) : []), [board]);
  const index = Math.max(0, ordered.findIndex((r) => r.student_id === award.studentId));
  const win = useMemo(() => windowAround(ordered, index, MAX_ROWS), [ordered, index]);
  const negative = award.points < 0;
  const skill = award.skill ? SKILL_LABEL[award.skill] : null;
  const myRow = ordered.find((r) => r.student_id === award.studentId);
  const name = myRow?.name || award.studentName || "";
  const accent = negative ? CORAL : GREEN;
  const dur = reduced ? 0 : 0.45;

  const badge = (
    <>
      <span style={{ fontWeight: 900 }}>{formatDelta(award.points)}</span>
      {skill && <span style={{ marginLeft: "0.4em", fontWeight: 700 }}>{skill.icon} {skill.label}</span>}
    </>
  );

  return (
    <motion.div
      role="status"
      aria-live="polite"
      aria-label={`${name} ${formatDelta(award.points)} points`}
      initial={{ opacity: 0 }}
      animate={{ opacity: leaving ? 0 : 1 }}
      transition={{ duration: leaving ? FADE_MS / 1000 : dur }}
      onClick={() => onDone()}
      style={{
        position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center",
        background: `radial-gradient(ellipse at 50% 0%, ${INDIGO} 0%, ${INDIGO_DEEP} 70%)`,
        color: PAPER, fontFamily: "inherit", cursor: "pointer", overflow: "hidden",
      }}
    >
      <motion.div
        initial={reduced ? false : { y: "8vh", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: dur, ease: "easeOut" }}
        style={{ width: "min(94vw, 1100px)", display: "flex", flexDirection: "column", gap: "1.2vh" }}
      >
        <div style={{ textAlign: "center", fontSize: "clamp(16px, 3vh, 34px)", fontWeight: 800, letterSpacing: "0.04em", color: TEAL }}>
          {name ? `${name} · class points` : "Class points"}
        </div>

        {ordered.length === 0 ? (
          // The board could not be read: still say what was awarded.
          <div style={{ textAlign: "center", padding: "6vh 2vw" }}>
            <div style={{ fontSize: "clamp(28px, 7vh, 80px)", fontWeight: 900 }}>{name}</div>
            <motion.div
              initial={reduced ? false : { y: 20, opacity: 0, scale: 0.7 }}
              animate={badgeOn || reduced ? { y: 0, opacity: 1, scale: 1 } : {}}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              style={{ marginTop: "2vh", fontSize: "clamp(40px, 12vh, 150px)", color: accent, lineHeight: 1.1 }}
            >
              {badge}
            </motion.div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.8vh" }}>
            {win.rows.map((r) => (
              <Row
                key={r.student_id}
                row={r}
                board={board!}
                mine={r.student_id === award.studentId}
                accent={accent}
                reduced={reduced}
                badge={r.student_id === award.studentId && (badgeOn || reduced) ? badge : null}
              />
            ))}
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

function Row({
  row, board, mine, accent, reduced, badge,
}: {
  row: ServerRow; board: ServerBoard; mine: boolean; accent: string; reduced: boolean; badge: ReactNode;
}) {
  const rank = shownRank(board, row, null);
  const pts = shownPoints(board, row, null);
  return (
    <motion.div
      layout={!reduced}
      transition={{ type: "spring", stiffness: 140, damping: 20, mass: 1 }}
      style={{
        position: "relative",
        display: "flex", alignItems: "center", gap: "1.2vw",
        height: "clamp(48px, 8vh, 92px)", padding: "0 1.6vw",
        borderRadius: 20,
        background: mine ? "rgba(255, 200, 61, 0.2)" : "rgba(255,255,255,0.07)",
        boxShadow: mine ? `0 0 0 3px ${AMBER}, 0 0 40px rgba(255,200,61,0.45)` : "none",
        zIndex: mine ? 2 : 1,
      }}
    >
      <div style={{ width: "3.2vw", minWidth: 36, textAlign: "center", fontSize: "clamp(18px, 3.6vh, 40px)", fontWeight: 900, color: rank != null && rank <= 3 ? AMBER : "rgba(250,249,253,0.7)" }}>
        {rank ?? "–"}
      </div>
      <Avatar row={row} />
      <div style={{ flex: 1, minWidth: 0, fontSize: "clamp(18px, 3.8vh, 44px)", fontWeight: mine ? 900 : 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {row.name}
      </div>
      <div style={{ fontSize: "clamp(20px, 4.2vh, 48px)", fontWeight: 900, fontVariantNumeric: "tabular-nums", color: mine ? AMBER : PAPER }}>
        {pts}
      </div>
      {mine && badge && (
        <motion.div
          initial={reduced ? false : { y: 30, opacity: 0, scale: 0.6 }}
          animate={{ y: reduced ? 0 : -58, opacity: 1, scale: 1 }}
          transition={reduced ? { duration: 0 } : { type: "spring", stiffness: 120, damping: 14 }}
          style={{
            position: "absolute", right: "2vw", top: "-0.2em", pointerEvents: "none",
            padding: "0.1em 0.6em", borderRadius: 999,
            fontSize: "clamp(24px, 6.5vh, 76px)", color: "#0B0A14", background: accent,
            boxShadow: "0 8px 30px rgba(0,0,0,0.45)", whiteSpace: "nowrap", lineHeight: 1.25,
          }}
        >
          {badge}
        </motion.div>
      )}
    </motion.div>
  );
}

function Avatar({ row }: { row: ServerRow }) {
  const size = "clamp(34px, 6vh, 68px)";
  const base = { width: size, height: size, borderRadius: "50%", flexShrink: 0 } as const;
  if (row.avatar_url) {
    return <img src={row.avatar_url} alt="" style={{ ...base, objectFit: "cover" }} />;
  }
  return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", background: TEAL, color: INDIGO_DEEP, fontWeight: 900, fontSize: "clamp(16px, 3vh, 34px)" }}>
      {(row.name || "?").trim().charAt(0).toUpperCase()}
    </div>
  );
}

export default VoiceAwardOverlay;
