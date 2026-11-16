/**
 * AssistantLauncher — floating entry point for the HEC assistant.
 *
 * A bottom-right bubble available on every authenticated page; opens the
 * read-only, RLS-scoped AssistantChat in a slide-up panel. Conversation
 * state lives in AssistantChat and survives open/close within the page
 * (the panel is kept mounted, just hidden) but is never persisted.
 */
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { AssistantChat } from "./AssistantChat";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function AssistantLauncher() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const aboveBar = role === "student";
  return (
    <>
      {open && (
        <div
          className={cn(
            "fixed inset-x-4 z-50 mx-auto max-w-sm sm:left-auto sm:right-6 sm:mx-0 sm:w-[380px] sm:max-w-none",
            aboveBar
              ? "bottom-[calc(8.5rem+env(safe-area-inset-bottom))] md:bottom-24"
              : "bottom-[calc(5rem+env(safe-area-inset-bottom))] md:bottom-24",
          )}
        >
          <div className="flex h-[min(70dvh,560px)] flex-col rounded-hec-lg border border-hec-line bg-hec-raised text-hec-ink shadow-hec-3 animate-hec-in">
            <div className="flex items-center justify-between gap-2 border-b border-hec-line py-1 pl-4 pr-1">
              <p className="flex items-center gap-2 text-hec-body font-medium">
                <Sparkles className="h-4 w-4 text-hec-brass" aria-hidden />
                HEC Assistant
              </p>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close the assistant">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 min-h-0 p-3">
              <AssistantChat className="h-full" />
            </div>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close the HEC assistant" : "Open the HEC assistant"}
        aria-expanded={open}
        className={cn(
          "fixed right-4 z-50 inline-flex h-12 w-12 items-center justify-center rounded-full border border-hec-line bg-hec-surface text-hec-ink shadow-hec-2 transition-colors duration-hec-1 ease-hec hover:bg-hec-sunken md:right-6",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring",
          aboveBar ? "bottom-[calc(4.75rem+env(safe-area-inset-bottom))] md:bottom-6" : "bottom-[calc(1rem+env(safe-area-inset-bottom))] md:bottom-6",
        )}
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5 text-hec-brass" />}
      </button>
    </>
  );
}
