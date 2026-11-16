import { useState } from "react";
import Layout from "@/components/Layout";
import { useAuth } from "@/hooks/useAuth";
import { DailyRecorder } from "@/components/recorder/DailyRecorder";
import { SetupWizard } from "@/components/recorder/SetupWizard";
import { RecorderAdminPanel } from "@/components/recorder/RecorderAdminPanel";
import { RecorderHeader } from "@/components/recorder/RecorderHeader";

/**
 * /teacher/recorder - the class recorder. A teacher sees today's lesson and
 * the one-time microphone setup; an admin sees the recorder's admin panel
 * (class switch, consent, recordings, log) and can open the teacher screen.
 */
export default function TeacherRecorder() {
  const { user, role } = useAuth();
  const [view, setView] = useState<"daily" | "setup" | "admin">(role === "admin" ? "admin" : "daily");
  const [key, setKey] = useState(0);
  // While a lesson is armed, recording or saving, the microphone check is not offered:
  // it would need the same microphones, and leaving the screen must never stop a recording.
  const [active, setActive] = useState(false);
  if (!user) return null;

  return (
    <Layout title="Class recorder">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        <RecorderHeader showMicrophones={view === "daily" && !active} isAdmin={role === "admin"} adminView={view === "admin"}
          onMicrophones={() => setView("setup")} onToggleAdmin={() => setView(view === "admin" ? "daily" : "admin")} />
        {view === "admin" ? <RecorderAdminPanel /> : null}
        {view === "setup" ? (
          <SetupWizard userId={user.id} onCancel={() => setView("daily")} onDone={() => { setKey((k) => k + 1); setView("daily"); }} />
        ) : null}
        {/* Kept mounted (hidden) while another view shows, so a recording carries on. */}
        <div hidden={view !== "daily"}>
          {/* Keyed by the user too: another teacher signing in gets a new engine (C2 review 2, M1). */}
          <DailyRecorder key={`${key}-${user.id}`} userId={user.id} onSetup={() => { if (!active) setView("setup"); }} onActiveChange={setActive} />
        </div>
      </div>
    </Layout>
  );
}
