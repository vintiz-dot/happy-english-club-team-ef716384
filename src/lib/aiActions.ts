/**
 * The browser half of the assistant's admin actions.
 *
 * The chat function only ever PROPOSES: a plan the database has checked and
 * worded. These calls are what happens after a person presses a button.
 * Confirm runs ai_action_apply and Undo runs ai_action_undo, and both check
 * everything again inside one database transaction
 * (supabase/migrations/20261107090000). Nothing here builds or edits a
 * plan: the card shows what the database said and sends back what it got.
 */
import { supabase } from "@/integrations/supabase/client";

export interface AiProposal {
  proposal_id: string;
  instruction: string;
  plan: Record<string, unknown>;
  summary: string[];
  warnings: string[];
}

// Not discriminated unions: this app compiles without strictNullChecks,
// where TypeScript does not narrow them, so every field is optional and
// `ok` says which ones are there.
export interface ApplyResult {
  ok: boolean;
  action_id?: string;
  student_id?: string;
  summary?: string[];
  nudges?: string[];
  warnings?: string[];
  open_path?: string;
  already_applied?: boolean;
  /** Why nothing was done, when ok is false. */
  problems?: string[];
}

export interface UndoResult {
  ok: boolean;
  open_path?: string;
  student_removed?: boolean;
  /** Why nothing was undone, when ok is false. */
  reasons?: string[];
}

export interface AiActionRow {
  id: string;
  created_at: string;
  instruction: string;
  summary: string[];
  nudges: string[];
  status: "applied" | "undone";
  student_id: string | null;
  student_exists: boolean;
  reviewed_at: string | null;
  undone_at: string | null;
  created_by_me: boolean;
  created_by_name: string;
  undone_by_name: string | null;
}

/** react-query key for everything that lists AI actions. */
export const AI_ACTIONS_KEY = ["ai-actions"] as const;

// The generated types learn these functions only when Lovable regenerates
// them from the live schema, so the calls go untyped until then.
const rpc = (name: string, args: Record<string, unknown>) => (supabase as any).rpc(name, args);

export async function applyProposal(p: AiProposal): Promise<ApplyResult> {
  const { data, error } = await rpc("ai_action_apply", {
    p_proposal_id: p.proposal_id,
    p_instruction: p.instruction,
    p_plan: p.plan,
  });
  if (error) throw new Error(error.message);
  return data as ApplyResult;
}

export async function undoAiAction(actionId: string): Promise<UndoResult> {
  const { data, error } = await rpc("ai_action_undo", { p_action_id: actionId });
  if (error) throw new Error(error.message);
  return data as UndoResult;
}

export async function markAiActionReviewed(actionId: string): Promise<void> {
  const { error } = await rpc("ai_action_mark_reviewed", { p_action_id: actionId });
  if (error) throw new Error(error.message);
}

export async function listAiActions(limit = 100): Promise<AiActionRow[]> {
  const { data, error } = await rpc("ai_actions_list", { p_limit: limit });
  if (error) throw new Error(error.message);
  return (data ?? []) as AiActionRow[];
}
