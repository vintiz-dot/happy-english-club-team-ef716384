/**
 * A class's Facebook group link (table class_facebook_groups,
 * 20261110090000). Admins set it in Class Settings; the Share to Facebook
 * button offers "Open our class group" beside it.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Not in the generated types until Lovable regenerates them. */
export const fbDb = supabase as any;

/** Same rule as the table's CHECK constraint. */
const GROUP_URL = /^https:\/\/(www\.|m\.|web\.)?facebook\.com\/groups\/[A-Za-z0-9._-]+\/?$/;

/**
 * What an admin pastes, made into the form the database accepts: adds
 * https://, drops ?query and #fragment, and keeps only /groups/<id>.
 * "" for an empty box (remove the link); null when it is not a group link.
 */
export function normalizeFacebookGroupUrl(input: string): string | "" | null {
  let s = input.trim();
  if (!s) return "";
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase();
  if (!/^(www\.|m\.|web\.)?facebook\.com$/.test(host)) return null;
  const m = u.pathname.match(/^\/groups\/([A-Za-z0-9._-]+)/);
  if (!m) return null;
  const out = `https://www.facebook.com/groups/${m[1]}/`;
  return GROUP_URL.test(out) ? out : null;
}

export function useClassFacebookGroup(classId: string | null | undefined) {
  return useQuery({
    queryKey: ["class-facebook-group", classId],
    enabled: !!classId,
    staleTime: 10 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await fbDb
        .from("class_facebook_groups")
        .select("group_url")
        .eq("class_id", classId)
        .maybeSingle();
      // Before the migration is applied the table is missing; no link then.
      if (error) return null;
      return data?.group_url ?? null;
    },
  });
}
