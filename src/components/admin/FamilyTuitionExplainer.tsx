import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, Sparkles, Square } from "lucide-react";
import { toast } from "sonner";

/** Admin tool: an AI-written tuition explanation for the student's family. */
export function FamilyTuitionExplainer({ studentId }: { studentId: string }) {
  const [month, setMonth] = useState(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  });
  const [language, setLanguage] = useState<"en" | "vi">("en");
  const [notes, setNotes] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    setText("");
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const { data: s } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/explain-family-tuition`, {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${s.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ studentId, month, language, notes }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "The explanation could not be written.");
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        setText((t) => t + value);
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") setError(e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Family tuition explanation</CardTitle>
        <CardDescription>
          Writes a clear message for the family from this month's invoice, attendance and discounts. Review before sending.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-[180px]" />
          <Select value={language} onValueChange={(v: "en" | "vi") => setLanguage(v)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="vi">Tiếng Việt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Textarea
          placeholder="Optional notes to include (e.g. a lesson was moved, a payment is expected next week)"
          value={notes}
          maxLength={2000}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="flex gap-2">
          {busy ? (
            <Button variant="outline" onClick={() => abortRef.current?.abort()}>
              <Square className="h-4 w-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button onClick={generate} disabled={!/^\d{4}-\d{2}$/.test(month)}>
              <Sparkles className="h-4 w-4 mr-2" /> Write explanation
            </Button>
          )}
          {text && !busy && (
            <Button variant="outline" onClick={() => { navigator.clipboard.writeText(text); toast.success("Copied"); }}>
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
          )}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {(text || busy) && (
          <div className="rounded-md border bg-muted/40 p-4 text-sm whitespace-pre-wrap break-words">
            {text || <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
