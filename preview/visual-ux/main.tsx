// Visual UX preview: the real pages and providers over a fake Supabase client
// (see vite.config.ts), so no sign-in and no real data.
//   ?screen=student-home|student-homework|family|teacher
//   &state=ok|error|empty   &theme=light|dark
import React, { Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { TimerProvider } from "@/contexts/TimerContext";
import { NoiseMeterProvider } from "@/contexts/NoiseMeterContext";
import { StudentProfileProvider } from "@/contexts/StudentProfileContext";
import { AuthProvider } from "@/hooks/useAuth";
import { IvoryScope } from "@/components/theme/IvoryScope";
import { themeKey } from "@/lib/ivoryScope";
import "@/index.css";
import { ME, PATH_OF, ROLE_OF, STUDENT_ID, getScreen, getTheme } from "./fixtures";

// A second createRoot on hot reload breaks the page; reload instead.
if (import.meta.hot) import.meta.hot.accept(() => window.location.reload());

const screen = getScreen();
const theme = getTheme();

// Land on the page's real path (the Ivory scope is decided by it), keeping the query.
if (window.location.pathname !== PATH_OF[screen]) {
  window.history.replaceState(null, "", PATH_OF[screen] + window.location.search);
}
try {
  localStorage.setItem(themeKey(ME.userId), theme);
  localStorage.setItem("hec-theme-active", theme);
  if (ROLE_OF[screen] === "student") localStorage.setItem("selected_student_id", STUDENT_ID);
  else localStorage.removeItem("selected_student_id");
} catch { /* private mode */ }

const StudentDashboard = lazy(() => import("@/pages/StudentDashboard"));
const StudentAssignments = lazy(() => import("@/pages/StudentAssignments"));
const FamilyDashboard = lazy(() => import("@/pages/FamilyDashboard"));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false, staleTime: 60_000 } },
});

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <TimerProvider>
    <NoiseMeterProvider>
    <StudentProfileProvider>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <AuthProvider>
            <IvoryScope>
              <Suspense fallback={null}>
                <Routes>
                  <Route path="/student/dashboard" element={<StudentDashboard />} />
                  <Route path="/student/assignments" element={<StudentAssignments />} />
                  <Route path="/family/dashboard" element={<FamilyDashboard />} />
                  <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                  <Route path="*" element={<Navigate to={PATH_OF[screen] + window.location.search} replace />} />
                </Routes>
              </Suspense>
            </IvoryScope>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </StudentProfileProvider>
    </NoiseMeterProvider>
    </TimerProvider>
  </QueryClientProvider>,
);
