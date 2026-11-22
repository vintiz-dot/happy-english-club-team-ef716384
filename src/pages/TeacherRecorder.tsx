import { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { DailyRecorder } from "@/components/recorder/DailyRecorder";
import { SetupWizard } from "@/components/recorder/SetupWizard";
import { RecorderAdminPanel } from "@/components/recorder/RecorderAdminPanel";
import { RecorderHeader } from "@/components/recorder/RecorderHeader";

/**
 * The class recorder's body: a teacher sees today's lesson and the one-time
 * microphone setup; an admin sees the recorder's admin panel (class switch,
 * consent, recordings, log) and can open the teacher screen. Shown as the
 * "Record" tab of /teacher/recorder (TeacherLessons); `onActiveChange` tells the
 * page when a lesson is armed, recording or saving.
 */
export function RecorderView({ onActiveChange }: { onActiveChange?: (active: boolean) => void } = {}) {
  const { user, role } = useAuth();
  const [view, setView] = useState<"daily" | "setup" | "admin">(role === "admin" ? "admin" : "daily");
  const [key, setKey] = useState(0);
  // While a lesson is armed, recording or saving, the microphone check is not offered:
  // it would need the same microphones, and leaving the screen must never stop a recording.
  const [active, setActive] = useState(false);
  if (!user) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <RecorderHeader showMicrophones={view === "daily" && !active} isAdmin={role === "admin"} adminView={view === "admin"}
        onMicrophones={() => setView("setup")} onToggleAdmin={() => setView(view === "admin" ? "daily" : "admin")} />
      {view === "admin" ? <RecorderAdminPanel /> : null}
      {view === "setup" ? (
        <SetupWizard userId={user.id} onCancel={() => setView("daily")} onDone={() => { setKey((k) => k + 1); setView("daily"); }} />
      ) : null}
      {/* Kept mounted (hidden) while another view shows, so a recording carries on. */}
      <div hidden={view !== "daily"}>
        {/* Keyed by the user too: another teacher signing in gets a new engine (C2 review 2, M1). */}
        <DailyRecorder key={`${key}-${user.id}`} userId={user.id} onSetup={() => { if (!active) setView("setup"); }}
          onActiveChange={(a) => { setActive(a); onActiveChange?.(a); }} />
      </div>
    </div>
  );
}

/** Kept for any old import: the recorder on a page of its own. The app routes to TeacherLessons. */
export default function TeacherRecorder() {
  return (
    <Layout title="Class recorder">
      <div className="p-4 md:p-6"><RecorderView /></div>
    </Layout>
  );
}
