// The sentence an edge function refused with, for the admin to read.
//
// supabase-js reports any non-2xx answer as "Edge Function returned a
// non-2xx status code" and keeps the function's own JSON body on
// `error.context` (the Response). The payment functions refuse with a body
// like { error: "This payment has been modified since ... correct the bill
// in Recorded Payment Manager instead." }: that sentence is the whole point
// of the refusal, so it must reach the toast. Falls back to the generic
// message when there is no readable body.
export async function functionErrorMessage(error: unknown, fallback = "The request failed"): Promise<string> {
  const generic = (error as { message?: string } | null)?.message || fallback;
  const context = (error as { context?: unknown } | null)?.context as
    | { json?: () => Promise<unknown>; clone?: () => { json?: () => Promise<unknown> } }
    | undefined;
  if (!context) return generic;
  try {
    const source = typeof context.clone === "function" ? context.clone() : context;
    const body = (await source.json?.()) as { error?: unknown; message?: unknown } | undefined;
    if (body && typeof body.error === "string" && body.error.trim()) return body.error;
    if (body && typeof body.message === "string" && body.message.trim()) return body.message;
  } catch {
    // not JSON, or already read: keep the generic message
  }
  return generic;
}
