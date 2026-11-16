import { supabase } from "@/integrations/supabase/client";
import { parseInvokeError, type GuardErrorBody } from "@/lib/sessionGuard";

// `error`/`data` are declared on both arms because this repo does not run strictNullChecks, where a boolean `ok` would not narrow.
export type CallResult<T = any> = { ok: true; data: T; error?: undefined } | { ok: false; error: GuardErrorBody; data?: undefined };

/**
 * Calls one of the checked-cancellation edge functions as the signed-in
 * admin. Fails closed: anything that is not a clean `{ ok: true }` body is
 * an error the dialog shows; nothing is ever assumed done.
 */
export async function callFn<T = any>(name: "manage-session" | "bulk-cancel-sessions", body: unknown): Promise<CallResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke(name, { body: body as any });
    if (error) return { ok: false, error: await parseInvokeError(error, data) };
    if (!data || typeof data !== "object") return { ok: false, error: { ok: false, code: "unexpected", message: "Empty answer from the server." } };
    if ((data as any).ok === false) return { ok: false, error: await parseInvokeError(null, data) };
    return { ok: true, data: data as T };
  } catch (e: any) {
    return { ok: false, error: await parseInvokeError(e) };
  }
}

export const manageSession = <T = any>(action: string, data: Record<string, unknown>) => callFn<T>("manage-session", { action, data });

/**
 * D4 step 3A: who is paid for a lesson. The read-only money preview of one
 * pay op (unhold, hold, reteach, retime, restaff, create) through
 * manage-session's `pay-preview`; and a plain lesson write that the server
 * may answer with 409 requires_checked_path + a pay kind + that preview
 * (src/lib/lessonPayGuard.ts payDialogFrom tells the screen to open the
 * dialog). Nothing is decided here.
 */
export const payPreview = (body: Record<string, unknown>) => manageSession<{ preview: any }>("pay-preview", body);
