/**
 * Mounted once in App, inside the auth provider (C2 round 5, R4-2). Renders
 * nothing. It tells the recorder session who is signed in (a change of user,
 * or a sign-out that bypassed the guard, ends the previous teacher's session
 * and clears their "Ready for today"), and after a reload on ANY page it
 * brings the engine back when this teacher pressed Ready today, so the
 * day's lessons still arm and start by themselves.
 *
 * Only a teacher or an admin, and only with Ready set today (or audio of
 * theirs still to send from this laptop, 20 Nov 2026): the capture
 * engine is loaded on demand (a dynamic import), never into every page.
 */
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { hanoiDate } from "@/lib/recorderUi";
import { boot, followUser, readyFor, unsentHint } from "./session";
import { dayDeps } from "./data";

function bootEngine(uid: string) {
  void import("./engine").then(({ browserEngine }) => boot({
    userId: uid,
    createRecorder: () => browserEngine.createRecorder({ client: supabase as any, userId: uid, profile: browserEngine.loadProfile(uid) }),
    day: dayDeps(supabase, uid, () => Date.now()),
  })).catch(() => null);
}

export function RecorderBoot() {
  const { user, role, loading } = useAuth();
  const uid = user?.id ?? null;
  useEffect(() => { if (!loading) followUser(uid); }, [uid, loading]);
  useEffect(() => {
    if (!uid || (role !== "teacher" && role !== "admin")) return;
    // 20 Nov 2026: also when this teacher's audio waits on this laptop - it is sent from any page after sign-in.
    if (!readyFor(uid, hanoiDate(Date.now())) && !unsentHint(uid)) return;
    bootEngine(uid);
  }, [uid, role]);
  // 23 Nov 2026: the phone link (phoneLinkLaptop.ts) - Record / Stop on the teacher's phone reach this laptop's
  // recorder on any page. It joins its channel only while this device is in "My microphone is my phone" mode.
  useEffect(() => {
    if (!uid || (role !== "teacher" && role !== "admin")) return;
    let end: (() => void) | null = null, gone = false;
    void import("./phoneLinkLaptop").then((m) => { if (!gone) end = m.startLaptopLink(supabase, uid, () => bootEngine(uid)); }).catch(() => null);
    return () => { gone = true; end?.(); };
  }, [uid, role]);
  return null;
}
