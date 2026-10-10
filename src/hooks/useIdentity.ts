/**
 * Who is signed in, by name.
 *
 * The header used to work this out by asking, in order: is this a
 * student? a teacher? a family? An admin is none of those, so the chain
 * fell off the end and the name came back empty — which is why it was
 * impossible to tell which admin was looking at the screen. Now that
 * each admin has their own login, that is the one question the header
 * most needs to answer.
 *
 * `profiles.display_name` is the answer, and it is deliberately the same
 * field the Activity screen uses to label who made a change. One name,
 * set once, shown in both places: if the header says Mai, the audit
 * trail says Mai.
 *
 * The chain still runs, because a teacher's name lives on `teachers` and
 * a student's on `students`, and those are better answers where they
 * exist. What changed is that it no longer gives up: `profiles` first
 * for anyone who has set a name, then the role-specific tables, then the
 * local part of the email address, which is at least never blank.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Identity {
  /** Always something: a set name, a record's name, or the email prefix. */
  name: string;
  avatarUrl: string | null;
  email: string | null;
  /** Where the name came from. "fallback" means nobody has set one. */
  source: "profile" | "student" | "teacher" | "family" | "fallback";
}

/** "mai.nguyen@school.com" -> "Mai Nguyen". A civil guess, never a claim. */
function nameFromEmail(email: string | null | undefined): string {
  if (!email) return "Signed in";
  const local = email.split("@")[0] ?? "";
  const words = local
    .split(/[._\-+]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1));
  return words.join(" ") || "Signed in";
}

export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export async function fetchIdentity(
  userId: string,
  email: string | null,
): Promise<Identity> {
  // A name someone chose for themselves beats one derived from a record.
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.display_name?.trim()) {
    return {
      name: profile.display_name.trim(),
      avatarUrl: profile.avatar_url ?? null,
      email,
      source: "profile",
    };
  }

  // These three are mutually exclusive in practice, so asking at once
  // costs one round trip instead of up to three in series.
  const [student, teacher, family] = await Promise.all([
    supabase.from("students").select("full_name, avatar_url").eq("linked_user_id", userId).maybeSingle(),
    supabase.from("teachers").select("full_name, avatar_url").eq("user_id", userId).maybeSingle(),
    supabase.from("families").select("name").eq("primary_user_id", userId).maybeSingle(),
  ]);

  if (student.data?.full_name) {
    return { name: student.data.full_name, avatarUrl: student.data.avatar_url ?? null, email, source: "student" };
  }
  if (teacher.data?.full_name) {
    return { name: teacher.data.full_name, avatarUrl: teacher.data.avatar_url ?? null, email, source: "teacher" };
  }
  if (family.data?.name) {
    return { name: family.data.name, avatarUrl: profile?.avatar_url ?? null, email, source: "family" };
  }

  return {
    name: nameFromEmail(email),
    avatarUrl: profile?.avatar_url ?? null,
    email,
    source: "fallback",
  };
}

export function useIdentity() {
  const { user } = useAuth();

  return useQuery<Identity>({
    queryKey: ["identity", user?.id],
    enabled: !!user,
    // The name rarely changes, and this runs on every page that has a
    // header. Editing it invalidates the key, so staleness is not a risk.
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchIdentity(user!.id, user!.email ?? null),
  });
}
