/**
 * Voice points assistant: the app-wide provider (owner, 27 Nov 2026).
 *
 * "HEC add 30 stars to Potato for writing". The browser listens for the wake
 * word and the teacher's own voice (src/lib/voiceAward/listener, loaded only
 * when the teacher switches this on), sends the clip to the `voice-award` edge
 * function (which only READS and answers what was said), and this provider
 * saves through `awardPoints` as the teacher, so RLS stays the boundary.
 *
 * The decisions (what a parse means given the card that is open, undo
 * eligibility, the note) are src/lib/voiceAward/flow.ts. This file owns the
 * clock, the timers, the listener and the writes. It survives page changes
 * because it is mounted at the app root. Staff only: for anyone else it
 * renders its children and nothing more.
 *
 * Choices: a new award command while a card is open REPLACES that card (nothing
 * was saved, so nothing is lost); clips heard while a request or a save is in
 * flight are ignored and logged.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { awardPoints, getCurrentSession, type ActiveSession } from "@/lib/pointsHelper";
import { soundManager } from "@/lib/soundManager";
import { announceVoiceAward } from "@/lib/voiceAward/events";
import {
  commandLine,
  decide,
  failureSentence,
  formatNote,
  formatUndoNote,
  lastUndoable,
  saveKey,
  signed,
  cardTitle,
  undoSentence,
  writesSkillRow,
  type PendingAward,
  type SavedAward,
} from "@/lib/voiceAward/flow";
import type { ListenerHandle, ListenerModule, ListenerState, VoiceprintProfile } from "@/lib/voiceAward/listenerApi";
import {
  VOICE_AWARD_CANCEL_MS,
  VOICE_AWARD_NOTE_PREFIX,
  type VoiceAwardRequest,
  type VoiceAwardResponse,
} from "@/lib/voiceAward/types";
import { VoiceAwardCard } from "@/components/voiceAward/VoiceAwardCard";
import { VoiceAwardStatusPill } from "@/components/voiceAward/VoiceAwardStatusPill";

export type VoicePhase =
  | "off"
  | "loading"
  | "listening"
  | "recording"
  | "checking"
  | "asking" // the clip is with Gemini
  | "card" // a card is open
  | "saving"
  | "paused"
  | "error";

export interface VoiceCard {
  award: PendingAward;
  /** counting: saves by itself when the cancel window ends. waiting: needs "HEC yes" or Confirm. */
  mode: "counting" | "waiting" | "saved";
  startedAt: number;
  cancelMs: number;
  classId: string;
  sessionId: string;
}

export interface VoiceCommandEntry {
  id: number;
  at: number;
  kind: "saved" | "undone" | "cancelled" | "ignored" | "error";
  text: string;
}

export interface VoiceClassOption {
  id: string;
  name: string;
  /** A lesson of this class is running now. */
  running: boolean;
}

export type VoiceProfileState = "unknown" | "checking" | "missing" | "ready";

interface VoiceAwardValue {
  /** Teacher or admin: the feature exists for this person. */
  allowed: boolean;
  enabled: boolean;
  phase: VoicePhase;
  statusLine: string;
  /** A message to show once (last sentence the assistant said), or null. */
  notice: string | null;
  classId: string | null;
  setClassId(id: string | null): void;
  classes: VoiceClassOption[];
  session: ActiveSession | null;
  profileState: VoiceProfileState;
  card: VoiceCard | null;
  commands: VoiceCommandEntry[];
  /** Switch listening on or off. Switching on needs a voiceprint and a lesson running. */
  setEnabled(on: boolean): Promise<void>;
  confirm(): void;
  cancel(): void;
  undo(): void;
  /** Reads the voiceprint again (after enrolling or deleting it). */
  refreshProfile(): Promise<void>;
  /** The enrolment dialog is open: the listener stands aside so two things do not hold the mic. */
  setEnrolling(on: boolean): void;
  /** Asks the classroom tools panel to open on this tool. */
  openTool(): void;
}

const noop = () => {};
const Ctx = createContext<VoiceAwardValue>({
  allowed: false,
  enabled: false,
  phase: "off",
  statusLine: "",
  notice: null,
  classId: null,
  setClassId: noop,
  classes: [],
  session: null,
  profileState: "unknown",
  card: null,
  commands: [],
  setEnabled: async () => {},
  confirm: noop,
  cancel: noop,
  undo: noop,
  refreshProfile: async () => {},
  setEnrolling: noop,
  openTool: noop,
});

export function useVoiceAward(): VoiceAwardValue {
  return useContext(Ctx);
}

/* ------------------------------------------------ mic level: its own store */
// About 15 updates a second must not re-render every consumer of the context.
let levelValue = 0;
const levelSubs = new Set<() => void>();
const setLevel = (v: number) => {
  levelValue = v;
  levelSubs.forEach((f) => f());
};
const subscribeLevel = (f: () => void) => {
  levelSubs.add(f);
  return () => {
    levelSubs.delete(f);
  };
};
/** The mic level 0..1 while listening. */
export function useVoiceLevel(): number {
  return useSyncExternalStore(subscribeLevel, () => levelValue, () => 0);
}

/** The event the provider sends and ClassroomToolsLauncher listens for. */
export const OPEN_VOICE_TOOL_EVENT = "hec-open-voice-award-tool";

const ALREADY_SAVED = "Already saved \u2014 say 'HEC undo' to remove it.";
const SAVED_KEY = (uid: string) => `hec-voice-award-saved:${uid}`;
const QUERY_KEYS_AFTER_SAVE = [
  "monthly-leader",
  "student-points",
  "point-history",
  "point-breakdown",
  "available-months",
  "live-assessment-students",
  "leaderboard",
];

async function importListener(): Promise<ListenerModule> {
  return (await import("@/lib/voiceAward/listener")) as unknown as ListenerModule;
}

/** The deviceId of the microphone the voiceprint was recorded with, when it is still plugged in. */
async function deviceIdForLabel(label: string | null): Promise<string | undefined> {
  if (!label || !navigator.mediaDevices?.enumerateDevices) return undefined;
  try {
    const devs = await navigator.mediaDevices.enumerateDevices();
    return devs.find((d) => d.kind === "audioinput" && d.label === label)?.deviceId;
  } catch {
    return undefined;
  }
}

const todayIso = () => new Date().toISOString().slice(0, 10);

export function VoiceAwardProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;
  const allowed = !!userId && (role === "teacher" || role === "admin");

  const [enabled, setEnabledState] = useState(false);
  const [listenerState, setListenerState] = useState<ListenerState>("loading");
  const [listenerDetail, setListenerDetail] = useState<string | null>(null);
  const [busy, setBusy] = useState<"asking" | "saving" | null>(null);
  const [card, setCard] = useState<VoiceCard | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [commands, setCommands] = useState<VoiceCommandEntry[]>([]);
  const [classId, setClassIdState] = useState<string | null>(null);
  const [classTouched, setClassTouched] = useState(false);
  const [session, setSession] = useState<ActiveSession | null>(null);
  const [profile, setProfile] = useState<VoiceProfileBox>({ state: "unknown", profile: null });
  const [enrolling, setEnrolling] = useState(false);

  // Refs the listener callbacks read, so they never see a stale card or session.
  const cardRef = useRef<VoiceCard | null>(null);
  const busyRef = useRef<"asking" | "saving" | null>(null);
  const savingRef = useRef(false);
  const enrollingRef = useRef(false);
  const sessionRef = useRef<ActiveSession | null>(null);
  const classIdRef = useRef<string | null>(null);
  const savedRef = useRef<SavedAward[]>([]);
  const timerRef = useRef<number | null>(null);
  const cmdId = useRef(0);
  cardRef.current = card;
  sessionRef.current = session;
  classIdRef.current = classId;

  // "asking" is a request with the listening service; saving has its own flag so
  // a clip or a finished request can never clear it.
  const setAsking = useCallback((on: boolean) => {
    busyRef.current = on ? "asking" : null;
    setBusy(savingRef.current ? "saving" : busyRef.current);
  }, []);
  const setSavingFlag = useCallback((on: boolean) => {
    savingRef.current = on;
    setBusy(on ? "saving" : busyRef.current);
  }, []);

  const log = useCallback((kind: VoiceCommandEntry["kind"], text: string) => {
    setCommands((prev) => [{ id: ++cmdId.current, at: Date.now(), kind, text }, ...prev].slice(0, 6));
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const closeCard = useCallback(() => {
    clearTimer();
    cardRef.current = null;
    setCard(null);
  }, [clearTimer]);

  /* ------------------------------------------------------ the teacher's classes */
  const classesQ = useQuery({
    queryKey: ["voice-award-classes", userId, role],
    enabled: allowed,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<{ id: string; name: string }[]> => {
      const { data } = await supabase.from("classes").select("id, name").eq("is_active", true).order("name");
      const rows = (data ?? []) as { id: string; name: string }[];
      if (role === "admin" || !userId) return rows;
      const mine = await Promise.all(
        rows.map(async (c) => {
          const r = await supabase.rpc("is_teacher_of_class", { user_id: userId, class_id: c.id });
          return r.data === true ? c : null;
        }),
      );
      return mine.filter((c): c is { id: string; name: string } => !!c);
    },
  });
  const myClasses = classesQ.data;

  // Which of them has a lesson running now: one query, refreshed every minute.
  const runningQ = useQuery({
    queryKey: ["voice-award-running", userId, (myClasses ?? []).map((c) => c.id).join(",")],
    enabled: allowed && !!myClasses?.length,
    refetchInterval: 60_000,
    queryFn: async (): Promise<Set<string>> => {
      const now = new Date().toTimeString().slice(0, 8);
      const { data } = await supabase
        .from("sessions")
        .select("class_id")
        .in("class_id", (myClasses ?? []).map((c) => c.id))
        .eq("date", todayIso())
        .in("status", ["Scheduled", "Held"])
        .lte("start_time", now)
        .gte("end_time", now);
      return new Set((data ?? []).map((r: { class_id: string }) => r.class_id));
    },
  });

  const classes: VoiceClassOption[] = useMemo(
    () => (myClasses ?? []).map((c) => ({ id: c.id, name: c.name, running: runningQ.data?.has(c.id) ?? false })),
    [myClasses, runningQ.data],
  );

  // Default: the class whose lesson is running now, until the teacher picks one.
  useEffect(() => {
    if (!allowed || classTouched) return;
    const running = classes.find((c) => c.running);
    if (running && running.id !== classId) setClassIdState(running.id);
    else if (!classId && classes.length === 1) setClassIdState(classes[0].id);
  }, [allowed, classTouched, classes, classId]);

  const setClassId = useCallback((id: string | null) => {
    setClassTouched(true);
    setClassIdState(id);
  }, []);

  /* ------------------------------------------------ the lesson running now */
  const refreshSession = useCallback(async (): Promise<ActiveSession | null> => {
    const cid = classIdRef.current;
    if (!cid) {
      setSession(null);
      return null;
    }
    try {
      const s = (await getCurrentSession(cid)) ?? null;
      if (classIdRef.current === cid) setSession(s);
      return s;
    } catch {
      /* keep the last answer; the next minute asks again */
      return sessionRef.current;
    }
  }, []);

  useEffect(() => {
    if (!allowed) return;
    setSession(null);
    void refreshSession();
    const t = window.setInterval(() => void refreshSession(), 60_000);
    return () => window.clearInterval(t);
  }, [allowed, classId, refreshSession]);

  const sessionId = session?.id ?? null;

  /* ------------------------------------------------------------ voiceprint */
  const refreshProfile = useCallback(async () => {
    if (!userId) return;
    setProfile((p) => ({ ...p, state: "checking" }));
    try {
      const mod = await importListener();
      const p = await mod.loadProfile(userId);
      setProfile({ state: p ? "ready" : "missing", profile: p });
    } catch {
      setProfile({ state: "unknown", profile: null });
      setNotice("The voice engine could not be loaded. Check the connection and try again.");
    }
  }, [userId]);

  /* ---------------------------------------------------------------- saved */
  useEffect(() => {
    // Another person signed in (or out): nothing of the last one may remain.
    savedRef.current = [];
    setProfile({ state: "unknown", profile: null });
    setClassIdState(null);
    setClassTouched(false);
    setCommands([]);
    setNotice(null);
    setSession(null);
    setEnabledState(false);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    cardRef.current = null;
    setCard(null);
    if (!userId) return;
    try {
      const raw = sessionStorage.getItem(SAVED_KEY(userId));
      if (raw) savedRef.current = JSON.parse(raw) as SavedAward[];
    } catch {
      /* in-memory only */
    }
  }, [userId]);

  const rememberSaved = useCallback(() => {
    if (!userId) return;
    savedRef.current = savedRef.current.slice(-30);
    try {
      sessionStorage.setItem(SAVED_KEY(userId), JSON.stringify(savedRef.current));
    } catch {
      /* ignore */
    }
  }, [userId]);

  const invalidate = useCallback(
    (cid: string) => {
      queryClient.invalidateQueries({ queryKey: ["class-board", cid] });
      QUERY_KEYS_AFTER_SAVE.forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
    },
    [queryClient],
  );

  /* ----------------------------------------------------------------- save */
  const saveCard = useCallback(async () => {
    const c = cardRef.current;
    if (!c || c.mode === "saved" || !userId || savingRef.current) return;
    clearTimer();
    setSavingFlag(true);
    const a = c.award;
    try {
      await awardPoints({
        studentIds: [a.studentId],
        classId: c.classId,
        skill: saveKey(a),
        points: a.points,
        sessionId: c.sessionId,
        notes: formatNote(a.skill, a.heard),
      });
      // awardPoints returns no ids: read the row back for the overlay and for undo.
      let transactionId: string | null = null;
      let txCreatedAt: string | null = null;
      try {
        const { data } = await supabase
          .from("point_transactions")
          .select("id, created_at")
          .eq("student_id", a.studentId)
          .eq("session_id", c.sessionId)
          .eq("created_by", userId)
          .eq("points", a.points)
          .like("notes", `${VOICE_AWARD_NOTE_PREFIX}%`)
          .order("created_at", { ascending: false })
          .limit(1);
        transactionId = (data?.[0]?.id as string | undefined) ?? null;
        txCreatedAt = (data?.[0]?.created_at as string | undefined) ?? null;
      } catch {
        /* the board still plays; undo then uses a compensating row */
      }
      savedRef.current.push({
        transactionId,
        txCreatedAt,
        studentId: a.studentId,
        studentName: a.studentName,
        points: a.points,
        skill: a.skill,
        classId: c.classId,
        sessionId: c.sessionId,
        createdBy: userId,
        savedAt: Date.now(),
        undone: false,
      });
      rememberSaved();
      // Show "Saved" for a moment, unless another card has taken the place.
      if (cardRef.current === c) {
        const done: VoiceCard = { ...c, mode: "saved" };
        cardRef.current = done;
        setCard(done);
        timerRef.current = window.setTimeout(() => {
          if (cardRef.current === done) closeCard();
        }, 1600);
      }
      invalidate(c.classId);
      announceVoiceAward({
        classId: c.classId,
        studentId: a.studentId,
        studentName: a.studentName,
        points: a.points,
        skill: a.skill,
        transactionId,
      });
      log("saved", cardTitle(a));
      setNotice(`Saved ${cardTitle(a)}.`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      if (cardRef.current === c) closeCard();
      log("error", `Could not save ${cardTitle(a)}`);
      setNotice(`I could not save ${cardTitle(a)} (${msg}). Nothing was changed.`);
    } finally {
      setSavingFlag(false);
    }
  }, [userId, clearTimer, closeCard, invalidate, log, rememberSaved, setSavingFlag]);

  /* ----------------------------------------------------------------- undo */
  const doUndo = useCallback(async () => {
    const found = lastUndoable(savedRef.current, { userId, sessionId: sessionRef.current?.id ?? null });
    if (!found || !userId) {
      setNotice(undoSentence(null));
      log("ignored", "Undo: nothing to undo");
      return;
    }
    if (savingRef.current) {
      setNotice("Still saving. Try undo again in a moment.");
      return;
    }
    setSavingFlag(true);
    try {
      let removed = false;
      if (found.transactionId) {
        const { data, error } = await supabase
          .from("point_transactions")
          .delete()
          .eq("id", found.transactionId)
          .eq("created_by", userId)
          .select("id");
        removed = !error && (data?.length ?? 0) > 0;
      }
      if (writesSkillRow(found) && found.skill) {
        // Only the skill row written with this award: same values AND made within 10 s of it.
        const txAt = found.txCreatedAt ? Date.parse(found.txCreatedAt) : NaN;
        let sid: string | undefined;
        if (Number.isFinite(txAt)) {
          const { data: rows } = await supabase
            .from("skill_assessments")
            .select("id, created_at")
            .eq("student_id", found.studentId)
            .eq("class_id", found.classId)
            .eq("session_id", found.sessionId)
            .eq("skill", found.skill)
            .eq("score", found.points)
            .eq("created_by", userId)
            .order("created_at", { ascending: false })
            .limit(5);
          sid = (rows ?? []).find((r) => r.created_at && Math.abs(Date.parse(r.created_at) - txAt) <= 10_000)?.id as string | undefined;
        }
        if (sid) await supabase.from("skill_assessments").delete().eq("id", sid);
        else log("ignored", `Left the ${found.skill} skill score in place: I could not be sure which row was the voice one`);
      }
      if (!removed) {
        // The row could not be deleted (or was never found): write the opposite instead.
        await awardPoints({
          studentIds: [found.studentId],
          classId: found.classId,
          skill: "participation",
          points: -found.points,
          sessionId: found.sessionId,
          notes: formatUndoNote(found),
        });
      }
      found.undone = true;
      rememberSaved();
      invalidate(found.classId);
      log("undone", cardTitle(found));
      setNotice(undoSentence(found));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown error";
      log("error", `Could not undo ${cardTitle(found)}`);
      setNotice(`I could not undo ${cardTitle(found)} (${msg}).`);
    } finally {
      setSavingFlag(false);
    }
  }, [userId, invalidate, log, rememberSaved, setSavingFlag]);

  /* ------------------------------------------------------ what was said */
  const openCard = useCallback(
    (award: PendingAward, cid: string, sid: string) => {
      clearTimer();
      const next: VoiceCard = {
        award,
        mode: award.sure ? "counting" : "waiting",
        startedAt: Date.now(),
        cancelMs: VOICE_AWARD_CANCEL_MS,
        classId: cid,
        sessionId: sid,
      };
      cardRef.current = next;
      setCard(next);
      if (award.sure) timerRef.current = window.setTimeout(() => void saveCard(), VOICE_AWARD_CANCEL_MS);
    },
    [clearTimer, saveCard],
  );

  const handleResponse = useCallback(
    (res: VoiceAwardResponse, asked: { classId: string; sessionId: string }) => {
      if (!res.ok) {
        // The app is not strict, so `!res.ok` does not narrow the union by itself.
        const msg = failureSentence(res as Extract<VoiceAwardResponse, { ok: false }>);
        setNotice(msg);
        log("error", msg);
        return;
      }
      // The class or lesson moved on while Gemini was thinking: that answer is about something else.
      if (classIdRef.current !== asked.classId || sessionRef.current?.id !== asked.sessionId) {
        log("ignored", "Dropped an answer: the class or lesson changed meanwhile");
        return;
      }
      const c = cardRef.current && cardRef.current.mode !== "saved" ? cardRef.current : null;
      const action = decide(res.parse, c && c.mode !== "saved" ? { kind: c.mode, award: c.award } : null);
      switch (action.type) {
        case "show":
          setNotice(null);
          openCard(action.award, asked.classId, asked.sessionId);
          break;
        case "save":
          void saveCard();
          break;
        case "drop":
          if (savingRef.current) {
            setNotice(ALREADY_SAVED);
            break;
          }
          if (c) log("cancelled", cardTitle(c.award));
          closeCard();
          setNotice("Cancelled.");
          break;
        case "undo":
          void doUndo();
          break;
        case "say":
          setNotice(action.message);
          log("ignored", action.message);
          break;
      }
    },
    [closeCard, doUndo, log, openCard, saveCard],
  );

  const handleCommand = useCallback(
    async (wavBase64: string) => {
      const cid = classIdRef.current;
      const s = sessionRef.current;
      if (busyRef.current === "asking") {
        log("ignored", "Heard you while still working on the last command");
        return;
      }
      if (!cid || !s) {
        setNotice("There is no lesson running, so I did not act on that.");
        return;
      }
      setAsking(true);
      try {
        const body: VoiceAwardRequest = { classId: cid, sessionId: s.id, audioBase64: wavBase64, mime: "audio/wav" };
        const { data, error } = await supabase.functions.invoke("voice-award", { body });
        if (error || !data) {
          const msg = "I could not reach the listening service. Check the connection, or use the buttons.";
          setNotice(msg);
          log("error", msg);
          return;
        }
        handleResponse(data as VoiceAwardResponse, { classId: cid, sessionId: s.id });
      } catch {
        const msg = "I could not reach the listening service. Check the connection, or use the buttons.";
        setNotice(msg);
        log("error", msg);
      } finally {
        setAsking(false);
      }
    },
    [handleResponse, log, setAsking],
  );

  // The listener holds this one function and always calls the newest.
  const commandRef = useRef(handleCommand);
  commandRef.current = handleCommand;
  const rejectedRef = useRef<(reason: "not_teacher" | "too_short" | "too_long") => void>(() => {});
  rejectedRef.current = (reason) => {
    if (reason === "not_teacher") log("ignored", "Heard HEC, but it did not sound like you");
    else if (reason === "too_long") log("ignored", "That was too long for a command");
  };

  /* --------------------------------------------------------- the listener */
  const handleRef = useRef<ListenerHandle | null>(null);
  const profileObj = profile.profile;

  useEffect(() => {
    if (!allowed || !enabled || !profileObj || !sessionId) return;
    let cancelled = false;
    let handle: ListenerHandle | null = null;
    setListenerState("loading");
    setListenerDetail(null);
    (async () => {
      try {
        const mod = await importListener();
        const deviceId = await deviceIdForLabel(profileObj.micLabel);
        const h = await mod.startListener(
          profileObj,
          {
            onState: (st, detail) => {
              if (cancelled) return;
              if (st === "error") {
                setEnabledState(false);
                setNotice(detail || "The microphone stopped working, so I stopped listening.");
                return;
              }
              setListenerState(st);
              setListenerDetail(detail ?? null);
              if (st === "recording") soundManager.play("notification", { classroom: true });
            },
            onCommand: (clip) => {
              if (!cancelled) void commandRef.current(clip.wavBase64);
            },
            onRejected: (reason) => {
              if (!cancelled) rejectedRef.current(reason);
            },
            onLevel: (rms) => {
              if (!cancelled) setLevel(Math.max(0, Math.min(1, rms)));
            },
          },
          deviceId ? { deviceId } : undefined,
        );
        if (cancelled) {
          h.stop();
          return;
        }
        handle = h;
        handleRef.current = h;
        if (enrollingRef.current) h.pause();
      } catch (e) {
        if (cancelled) return;
        setListenerState("error");
        setListenerDetail(e instanceof Error ? e.message : "The microphone could not be started.");
        setEnabledState(false);
      }
    })();
    return () => {
      cancelled = true;
      handle?.stop();
      if (handleRef.current === handle) handleRef.current = null;
      setLevel(0);
    };
  }, [allowed, enabled, profileObj, sessionId]);

  // The enrolment dialog holds the microphone while it is open.
  enrollingRef.current = enrolling;
  useEffect(() => {
    const h = handleRef.current;
    if (!h) return;
    if (enrolling) h.pause();
    else h.resume();
  }, [enrolling]);

  // The lesson ended (or the class changed): stop, drop any open card, say so.
  const prevSession = useRef<string | null>(null);
  useEffect(() => {
    const before = prevSession.current;
    prevSession.current = sessionId;
    if (before && before !== sessionId) {
      closeCard();
      if (enabled) {
        setEnabledState(false);
        setNotice(sessionId ? "The class changed, so I stopped listening." : "The lesson has ended, so I stopped listening.");
      }
    }
  }, [sessionId, enabled, closeCard]);

  // Switched off, signed out or unmounted: nothing may keep running.
  useEffect(() => {
    if (!allowed) {
      setEnabledState(false);
      closeCard();
    }
  }, [allowed, closeCard]);
  useEffect(() => () => clearTimer(), [clearTimer]);

  /* -------------------------------------------------------------- actions */
  const setEnabled = useCallback(
    async (on: boolean) => {
      if (!on) {
        setEnabledState(false);
        closeCard();
        setNotice(null);
        return;
      }
      if (!userId) return;
      let p = profile.profile;
      if (!p) {
        setProfile((x) => ({ ...x, state: "checking" }));
        try {
          p = await (await importListener()).loadProfile(userId);
        } catch {
          setProfile({ state: "unknown", profile: null });
          setNotice("The voice engine could not be loaded. Check the connection and try again.");
          return;
        }
        setProfile({ state: p ? "ready" : "missing", profile: p });
      }
      if (!p) {
        setNotice("Set up your voice first.");
        return;
      }
      const cid = classIdRef.current;
      if (!cid) {
        setNotice("Pick a class first.");
        return;
      }
      const running = await refreshSession();
      if (!running) {
        setNotice("No lesson of this class is running now.");
        return;
      }
      setNotice(null);
      setEnabledState(true);
    },
    [userId, profile.profile, closeCard, refreshSession],
  );

  const confirm = useCallback(() => {
    const c = cardRef.current;
    if (c && c.mode !== "saved") void saveCard();
  }, [saveCard]);
  const cancel = useCallback(() => {
    const c = cardRef.current;
    if (!c || c.mode === "saved") return;
    if (savingRef.current) {
      setNotice(ALREADY_SAVED);
      return;
    }
    log("cancelled", cardTitle(c.award));
    closeCard();
    setNotice("Cancelled.");
  }, [closeCard, log]);
  const undo = useCallback(() => {
    if (busyRef.current === "asking" || savingRef.current) return;
    const c = cardRef.current;
    // A card that is still open is cancelled; undo never removes an older award behind it.
    if (c && c.mode !== "saved") {
      log("cancelled", cardTitle(c.award));
      closeCard();
      setNotice("Cancelled.");
      return;
    }
    void doUndo();
  }, [closeCard, doUndo, log]);
  const openTool = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_VOICE_TOOL_EVENT));
  }, []);

  /* --------------------------------------------------------- what to show */
  const phase: VoicePhase = !enabled
    ? "off"
    : busy === "saving"
      ? "saving"
      : busy === "asking"
        ? "asking"
        : card
          ? "card"
          : enrolling
            ? "paused"
            : listenerState;

  const statusLine = !enabled
    ? profile.state === "missing"
      ? "Set up your voice first"
      : !session
        ? "No lesson running"
        : "Off"
    : phase === "loading"
      ? "Starting the microphone…"
      : phase === "listening"
        ? "Listening for HEC…"
        : phase === "recording"
          ? "Listening to you…"
          : phase === "checking"
            ? "Checking it is you…"
            : phase === "asking"
              ? "Working out what you said…"
              : phase === "card"
                ? card?.mode === "waiting"
                  ? 'Waiting: say "HEC yes" or tap Confirm'
                  : card?.mode === "saved"
                    ? "Saved"
                    : "Saving in a moment: tap Cancel to stop it"
                : phase === "saving"
                  ? "Saving…"
                  : phase === "paused"
                    ? "Paused while you set up your voice"
                    : (listenerDetail ?? "The microphone has a problem");

  const value: VoiceAwardValue = {
    allowed,
    enabled,
    phase,
    statusLine,
    notice,
    classId,
    setClassId,
    classes,
    session,
    profileState: profile.state,
    card,
    commands,
    setEnabled,
    confirm,
    cancel,
    undo,
    refreshProfile,
    setEnrolling,
    openTool,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      {allowed && enabled && <VoiceAwardStatusPill />}
      {allowed && card && <VoiceAwardCard />}
    </Ctx.Provider>
  );
}

interface VoiceProfileBox {
  state: VoiceProfileState;
  profile: VoiceprintProfile | null;
}
