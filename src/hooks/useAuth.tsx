import { createContext, useContext, useEffect, useState, ReactNode, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { useStudentProfile } from "@/contexts/StudentProfileContext";

type UserRole = "admin" | "teacher" | "family" | "student";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function fetchRole(userId: string): Promise<UserRole | null> {
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .order("role", { ascending: true });

  const userRole =
    roleData?.find((r) => r.role === "admin")?.role ||
    roleData?.find((r) => r.role === "teacher")?.role ||
    roleData?.[0]?.role;

  return (userRole as UserRole) || null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    role: null,
    loading: true,
  });
  const navigate = useNavigate();
  const { setStudentId } = useStudentProfile();

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          if (event === "SIGNED_OUT") {
            setAuthState({ user: null, session: null, role: null, loading: false });
            navigate("/auth");
            return;
          }
        }

        setAuthState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
        }));

        if (session?.user) {
          setTimeout(async () => {
            const role = await fetchRole(session.user.id);
            if (cancelled) return;
            setAuthState((prev) => ({ ...prev, role, loading: false }));
          }, 0);
        } else {
          setAuthState((prev) => ({ ...prev, role: null, loading: false }));
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
      }));

      if (session?.user) {
        const role = await fetchRole(session.user.id);
        if (cancelled) return;
        setAuthState((prev) => ({ ...prev, role, loading: false }));
      } else {
        setAuthState((prev) => ({ ...prev, role: null, loading: false }));
      }
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setAuthState({ user: null, session: null, role: null, loading: false });
          navigate("/auth");
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [navigate]);

  const signOut = async () => {
    setStudentId(undefined);
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const value = useMemo<AuthContextValue>(
    () => ({ ...authState, signOut }),
    [authState]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
