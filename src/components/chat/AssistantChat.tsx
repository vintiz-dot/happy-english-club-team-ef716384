/**
 * AssistantChat — the HEC assistant panel.
 *
 * A context-aware, strictly READ-ONLY helper. All answers are grounded in
 * what the signed-in user is allowed to see: the edge function queries the
 * database with the caller's own JWT, so RLS — not the model — decides what
 * comes back. Conversation history lives only in this component's state;
 * nothing is written to the database.
 */
import { useRef, useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, RotateCcw, ShieldCheck } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  family: [
    "How is my child doing this month?",
    "What did they learn in the last lesson?",
    "Is there any homework?",
    "Explain this month's invoice",
  ],
  student: [
    "Help me review my vocabulary",
    "Explain my last mistakes",
    "How many points do I have?",
    "What did we do in class?",
  ],
  teacher: [
    "Who has gone quiet in my classes?",
    "Summarise the last lesson",
    "Draft parent feedback for a student",
    "Which students need attention?",
  ],
  admin: [
    "Who has gone quiet recently?",
    "Explain a student's invoice",
    "Summarise recent lessons",
  ],
};

export function AssistantChat({ className }: { className?: string }) {
  const { role } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || busy) return;
    const next: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: { messages: next },
      });
      if (error) {
        let detail = error.message;
        try {
          const b = await (error as any).context?.json?.();
          if (b?.error) detail = b.error;
        } catch { /* keep default */ }
        throw new Error(detail);
      }
      if (data?.success === false) throw new Error(data.error || "The assistant had a problem");
      setMessages((m) => [...m, { role: "assistant", content: String(data.reply || "") }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Sorry — ${e.message || "something went wrong"}.` },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = ROLE_SUGGESTIONS[role || "student"] || ROLE_SUGGESTIONS.student;

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Transcript */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1">
        {messages.length === 0 && (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto h-11 w-11 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-md">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm font-semibold">Hi! I'm the HEC assistant.</p>
            <p className="text-xs text-muted-foreground max-w-[280px] mx-auto">
              Ask me about progress, lessons, homework or points. I can only see what you can see —
              and I can't change anything.
            </p>
            <div className="flex flex-wrap gap-1.5 justify-center pt-1">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] rounded-full border px-3 py-1.5 hover:bg-muted/60 transition-colors text-muted-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-br-md"
                    : "bg-muted/60 ring-1 ring-border/50 rounded-bl-md",
                )}
              >
                {m.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {busy && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md bg-muted/60 ring-1 ring-border/50 px-3.5 py-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="pt-3 space-y-1.5">
        <div className="flex gap-2 items-end">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask me anything about your learning…"
            className="min-h-[44px] max-h-32 resize-none text-sm"
            rows={1}
            disabled={busy}
          />
          <div className="flex flex-col gap-1">
            <Button
              size="icon"
              className="h-9 w-9 shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white"
              disabled={busy || !input.trim()}
              onClick={() => send(input)}
              title="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
            {messages.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 shrink-0"
                onClick={() => setMessages([])}
                title="New conversation"
                disabled={busy}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 shrink-0" />
          Read-only · sees only your own records · AI answers can make mistakes
        </p>
      </div>
    </div>
  );
}
