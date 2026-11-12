import { useState } from "react";
import { Mic, Settings2 } from "lucide-react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { DailyRecorder } from "@/components/recorder/DailyRecorder";
import { SetupWizard } from "@/components/recorder/SetupWizard";
import { RecorderAdminPanel } from "@/components/recorder/RecorderAdminPanel";

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
        <div className="flex flex-wrap items-center gap-3">
          <div className="h-11 w-11 rounded-2xl bg-primary/10 flex items-center justify-center"><Mic className="h-6 w-6 text-primary" aria-hidden /></div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold">Class recorder</h1>
            <p className="text-sm text-muted-foreground">Records your lesson with two microphones. It only records; nothing is analysed here.</p>
          </div>
          {view === "daily" && !active ? (
            <Button variant="outline" className="min-h-11" onClick={() => setView("setup")}><Settings2 className="h-4 w-4 mr-2" aria-hidden /> Microphones</Button>
          ) : null}
          {role === "admin" ? (
            <Button variant="outline" className="min-h-11" onClick={() => setView(view === "admin" ? "daily" : "admin")}>{view === "admin" ? "Teacher screen" : "Admin panel"}</Button>
          ) : null}
        </div>
        {view === "admin" ? <RecorderAdminPanel /> : null}
        {view === "setup" ? (
          <SetupWizard userId={user.id} onCancel={() => setView("daily")} onDone={() => { setKey((k) => k + 1); setView("daily"); }} />
        ) : null}
        {/* Kept mounted (hidden) while another view shows, so a recording carries on. */}
        <div hidden={view !== "daily"}>
          <DailyRecorder key={key} userId={user.id} onSetup={() => { if (!active) setView("setup"); }} onActiveChange={setActive} />
        </div>
      </div>
    </Layout>
  );
}
