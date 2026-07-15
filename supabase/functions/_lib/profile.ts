/**
 * _lib/profile.ts — fire-and-forget learning-profile refreshes.
 *
 * Every pipeline that lands new evidence about a student calls this after
 * persisting, so the living profile stays current without blocking the
 * response. Uses EdgeRuntime.waitUntil when available so the background
 * fetches survive after the response is returned.
 */

export function fireProfileRefresh(studentIds: string[]): void {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const unique = [...new Set(studentIds.filter(Boolean))];
  if (!url || !key || unique.length === 0) return;

  const run = Promise.allSettled(
    unique.map((id) =>
      fetch(`${url}/functions/v1/refresh-student-profile`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ student_id: id }),
      }).catch((e) => {
        console.warn(`profile refresh failed for ${id}:`, e?.message);
        return null;
      }),
    ),
  );

  const er = (globalThis as any).EdgeRuntime;
  if (er?.waitUntil) er.waitUntil(run);
}
