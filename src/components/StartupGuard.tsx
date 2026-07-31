import { useEffect, useState, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLoader } from "./AppLoader";

interface StartupGuardProps {
  children: ReactNode;
}

/**
 * Routes reachable WITHOUT a session.
 *
 * Everything else is bounced to /auth on a cold load. That is right for the
 * app proper, but a recovery page must be exempt by definition: whoever opens
 * /claim is locked out — that is the entire reason they are there — so
 * redirecting them to the sign-in page they cannot use makes the printed
 * access card useless. Same reasoning for the password-reset landing page.
 */
const PUBLIC_PATHS = ["/", "/auth", "/auth/reset-password", "/claim"];

const isPublicPath = (path: string) =>
  PUBLIC_PATHS.includes(path.replace(/\/+$/, "") || "/");

export function StartupGuard({ children }: StartupGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;
        if (error) throw error;

        // Route based on session
        const currentPath = window.location.pathname;
        if (session) {
          // Don't yank a signed-in admin off /claim — they may be testing a
          // card for a family standing in front of them.
          if (currentPath === "/auth" || currentPath === "/") {
            navigate("/dashboard", { replace: true });
          }
        } else if (!isPublicPath(currentPath)) {
          navigate("/auth", { replace: true });
        }

        setIsChecking(false);
      } catch (error) {
        if (!mounted) return;
        console.error("Startup guard error:", error);
        // A failed session check must still not strand someone on a public
        // recovery page.
        if (!isPublicPath(window.location.pathname)) {
          navigate("/auth", { replace: true });
        }
        setIsChecking(false);
      }
    };

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  if (isChecking) {
    return <AppLoader message="Initializing..." />;
  }

  return <>{children}</>;
}
