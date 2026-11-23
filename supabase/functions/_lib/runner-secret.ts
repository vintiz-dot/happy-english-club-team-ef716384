/**
 * _lib/runner-secret.ts - did a scheduled job (pg_cron) ask for this run?
 *
 * A timer has no person behind it - no session, no role to read - so it presents
 * the shared token from public.schedule_runner (20261110160000) in the
 * `x-schedule-runner-secret` header. The table has row-level security with no
 * policies, so only server-side code can read it. Compared in constant time, so
 * the time taken does not tell a caller how much of a guess was right.
 *
 * The same check as runnerSecretMatches in schedule-sessions (kept there as it was).
 */
export async function runnerSecretMatches(req: Request, supabase: any): Promise<boolean> {
  const presented = req.headers.get("x-schedule-runner-secret");
  if (!presented) return false;
  const { data, error } = await supabase.from("schedule_runner").select("token").eq("id", 1).maybeSingle();
  if (error || !data?.token) return false;
  const expected: string = String(data.token);
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  return diff === 0;
}
