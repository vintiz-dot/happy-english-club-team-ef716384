// The attendance drawer (the register teachers use) on made-up data, inside the real shell (Phase 2 preview).
import { useState } from "react";
import Layout from "@/components/Layout";
import AttendanceDrawer from "@/components/admin/class/AttendanceDrawer";

const pad = (n: number) => String(n).padStart(2, "0");
const clock = (minutesFromNow: number) => {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
};
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export default function DrawerPage() {
  const [open, setOpen] = useState(true);
  const session = { id: "ses-t-done", class_id: "cls-t1", date: today(), start_time: clock(-150), end_time: clock(-90), status: "Scheduled", classes: { name: "Movers Sparks (Tue/Thu)" } };
  return (
    <Layout title="Attendance">
      <button type="button" className="rounded border px-4 py-2" onClick={() => setOpen(true)}>Open the register</button>
      {open && <AttendanceDrawer session={session} onClose={() => setOpen(false)} />}
    </Layout>
  );
}
