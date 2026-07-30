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

export function AssistantLauncher() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

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
