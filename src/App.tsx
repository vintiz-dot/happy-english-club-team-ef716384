import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { StudentProfileProvider } from "./contexts/StudentProfileContext";
import ProfilePicker from "./components/ProfilePicker";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StartupGuard } from "./components/StartupGuard";
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { OfflineFallback } from "./components/OfflineFallback";
import { Suspense, lazy } from "react";
import { AppLoader } from "./components/AppLoader";
import { AnnouncementRenderer } from "./components/announcements/AnnouncementRenderer";

// Lazy-load every route — keeps initial bundle small and speeds up navigation
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Students = lazy(() => import("./pages/Students"));
const StudentDetail = lazy(() => import("./pages/StudentDetail"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Classes = lazy(() => import("./pages/Classes"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Families = lazy(() => import("./pages/Families"));
const FamilyDetail = lazy(() => import("./pages/FamilyDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const ClassDetail = lazy(() => import("./pages/ClassDetail"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TeacherClassDetail = lazy(() => import("./pages/TeacherClassDetail"));
const TeacherPayroll = lazy(() => import("./pages/TeacherPayroll"));
const TeacherAttendance = lazy(() => import("./pages/TeacherAttendance"));
const TeacherAssignments = lazy(() => import("./pages/TeacherAssignments"));
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const TeacherLeaderboards = lazy(() => import("./pages/TeacherLeaderboards"));
const StudentAssignments = lazy(() => import("./pages/StudentAssignments"));
const Tuition = lazy(() => import("./pages/Tuition"));
const TeacherProfile = lazy(() => import("./pages/TeacherProfile"));
const StudentJournal = lazy(() => import("./pages/StudentJournal"));
const StudentGames = lazy(() => import("./pages/StudentGames"));
const TeacherJournal = lazy(() => import("./pages/TeacherJournal"));
const TeacherExamReports = lazy(() => import("./pages/TeacherExamReports"));
const TuitionReviewQueue = lazy(() =>
  import("./components/admin/TuitionReviewQueue").then((m) => ({ default: m.TuitionReviewQueue }))
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60_000,
      gcTime: 5 * 60_000,
    },
  },
});

function AppContent() {
  const { isOnline } = useNetworkStatus();

  if (!isOnline) {
    return <OfflineFallback />;
  }

  return (
    <StudentProfileProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ProfilePicker />
        <BrowserRouter>
          <AnnouncementRenderer />
          <StartupGuard>
            <Suspense fallback={<AppLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/dashboard" element={<Dashboard />} />

                {/* Admin-only routes */}
                <Route path="/students" element={<ProtectedRoute allowedRole="admin"><Students /></ProtectedRoute>} />
                <Route path="/students/:id" element={<ProtectedRoute allowedRole="admin"><StudentDetail /></ProtectedRoute>} />
                <Route path="/teachers" element={<ProtectedRoute allowedRole="admin"><Teachers /></ProtectedRoute>} />
                <Route path="/teachers/:id" element={<ProtectedRoute allowedRole="admin"><TeacherProfile /></ProtectedRoute>} />
                <Route path="/classes" element={<ProtectedRoute allowedRole="admin"><Classes /></ProtectedRoute>} />
                <Route path="/families" element={<ProtectedRoute allowedRole="admin"><Families /></ProtectedRoute>} />
                <Route path="/families/:id" element={<ProtectedRoute allowedRole="admin"><FamilyDetail /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><Admin /></ProtectedRoute>} />
                <Route path="/admin/classes/:id" element={<ProtectedRoute allowedRole="admin"><ClassDetail /></ProtectedRoute>} />
                <Route path="/admin/tuition-review" element={<ProtectedRoute allowedRole="admin"><TuitionReviewQueue /></ProtectedRoute>} />
                <Route path="/students/:id/tuition" element={<ProtectedRoute allowedRole="admin"><Tuition /></ProtectedRoute>} />

                {/* Teacher routes */}
                <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
                <Route path="/teacher/classes/:id" element={<TeacherClassDetail />} />
                <Route path="/teacher/payroll" element={<TeacherPayroll />} />
                <Route path="/teacher/attendance" element={<TeacherAttendance />} />
                <Route path="/teacher/assignments" element={<TeacherAssignments />} />
                <Route path="/teacher/journal" element={<TeacherJournal />} />
                <Route path="/teacher/exam-reports" element={<TeacherExamReports />} />
                <Route path="/teacher/leaderboards" element={<TeacherLeaderboards />} />

                {/* Student routes */}
                <Route path="/student/dashboard" element={<StudentDashboard />} />
                <Route path="/student/assignments" element={<StudentAssignments />} />
                <Route path="/student/journal" element={<StudentJournal />} />
                <Route path="/student/games" element={<StudentGames />} />

                {/* Shared routes */}
                <Route path="/schedule" element={<Schedule />} />
                <Route path="/tuition" element={<Tuition />} />

                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </StartupGuard>
        </BrowserRouter>
      </TooltipProvider>
    </StudentProfileProvider>
  );
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
