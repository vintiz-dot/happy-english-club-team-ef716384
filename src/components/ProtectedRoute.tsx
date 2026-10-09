import { ReactNode, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { AppLoader } from "./AppLoader";
import { AdminUnlockGate } from "@/components/admin/AdminUnlockGate";

type Role = "admin" | "teacher" | "family" | "student";

interface ProtectedRouteProps {
  children: ReactNode;
  /**
   * One role, or several. Several is for pages that more than one kind of
   * user legitimately needs — the teacher area, for instance, which admins
   * also open for support and which teaching assistants reach holding the
   * teacher role.
   */
  allowedRole: Role | Role[];
}

export function ProtectedRoute({ children, allowedRole }: ProtectedRouteProps) {
  const { user, role, loading } = useAuth();
  const allowed = Array.isArray(allowedRole) ? allowedRole : [allowedRole];
  const isAllowed = !!role && allowed.includes(role as Role);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    // No user session - redirect to auth with intent to return
    if (!user) {
      navigate("/auth", { 
        replace: true, 
        state: { redirectTo: location.pathname } 
      });
      return;
    }

    // User logged in but wrong role
    if (role && !isAllowed) {
      toast.error("Access denied. You don't have permission to view this page.");
      
      // Redirect to appropriate dashboard
      if (role === "teacher") {
        navigate("/teacher/dashboard", { replace: true });
      } else if (role === "student" || role === "family") {
        navigate("/dashboard", { replace: true });
      } else if (role === "admin") {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, role, loading, isAllowed, navigate, location]);

  if (loading) {
    return <AppLoader message="Verifying access..." />;
  }

  if (!user || !isAllowed) {
    return null;
  }

  // The sign-in gate guards the admin area and nothing else. Putting it
  // here rather than on the Admin page covers every admin-only route -
  // students, teachers, families, tuition - with one wrapper, and it sits
  // after the role check so a teacher is never asked to unlock something
  // they could not reach anyway.
  if (role === "admin" && allowed.includes("admin") && allowed.length === 1) {
    return <AdminUnlockGate>{children}</AdminUnlockGate>;
  }

  return <>{children}</>;
}
