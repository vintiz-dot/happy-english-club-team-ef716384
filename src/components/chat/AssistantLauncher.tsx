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
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { useIvory } from "@/hooks/useIvory";
import { cn } from "@/lib/utils";

export function AssistantLauncher() {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const ivory = useIvory();

  if (!user) return null;

  if (ivory) {
    // Ivory: a quiet surface button, bottom-right, ABOVE the student bottom bar
    // and the home indicator (never over the bar), with clearance kept under
    // the page by Layout (DESIGN_SYSTEM s.12). No purple, no spring.
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

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed bottom-24 right-4 md:bottom-20 md:right-6 z-50 w-[min(92vw,380px)]"
          >
            <div className="rounded-2xl border bg-background/95 backdrop-blur-xl shadow-2xl ring-1 ring-border/60 flex flex-col h-[min(70vh,560px)]">
              <div className="flex items-center justify-between px-4 py-2.5 border-b">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  HEC Assistant
                </p>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0 p-3">
                <AssistantChat className="h-full" />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-600/30 flex items-center justify-center"
        aria-label="Open the HEC assistant"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </motion.button>
    </>
  );
}
