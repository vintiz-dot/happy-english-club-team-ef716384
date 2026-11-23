/**
 * Public: the feedback form behind the QR code on the reception screen. No
 * sign-in. It can only add a pending message (reception_feedback's insert
 * policy); an admin reads it, and it reaches the screen only if the sender
 * ticked "you may show this" and an admin approves it.
 */
import { useState } from "react";
import { CheckCircle2, Loader2, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const db = supabase as any;
const RELATIONS = [
  { value: "parent", en: "Parent", vi: "Phụ huynh" },
  { value: "student", en: "Student", vi: "Học sinh" },
  { value: "visitor", en: "Visitor", vi: "Khách" },
  { value: "other", en: "Other", vi: "Khác" },
];

export default function ReceptionFeedback() {
  const [name, setName] = useState("");
  const [relation, setRelation] = useState("parent");
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState("");
  const [mayShow, setMayShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (message.trim().length < 2) { setError("Please write a few words. · Vui lòng viết vài dòng."); return; }
    setBusy(true); setError(null);
    // No .select(): the sender may add a row but not read it back.
    const { error } = await db.from("reception_feedback").insert({
      name: name.trim() || null, relation, rating: rating || null, message: message.trim().slice(0, 1000),
      contact: contact.trim() || null, may_show: mayShow,
    });
    setBusy(false);
    if (error) { setError(/Too much feedback/.test(error.message) ? "Many messages just arrived. Please try again in a few minutes. · Vui lòng thử lại sau vài phút." : "Could not send. Please try again. · Không gửi được, vui lòng thử lại."); return; }
    setSent(true);
  };

  return (
    <div className="min-h-screen bg-hec-paper text-hec-ink">
      <div className="mx-auto max-w-lg px-4 py-8">
        <header className="text-center mb-6">
          <img src="/reception-tv/assets/logo-gold.png" alt="Happy English Club" className="mx-auto h-20" />
          <h1 className="mt-4 font-display text-hec-h1 font-medium text-hec-ink">Tell us how we are doing</h1>
          <p className="text-hec-ink-soft">Hãy cho chúng tôi biết cảm nhận của bạn</p>
        </header>

        <div className="rounded-hec-lg border border-hec-line bg-hec-surface p-5 shadow-hec-2 text-hec-ink">
          {sent ? (
            <div className="py-8 text-center space-y-3">
              <CheckCircle2 className="mx-auto h-12 w-12 text-hec-leaf" />
              <p className="text-lg font-semibold">Thank you! · Cảm ơn bạn!</p>
              <p className="text-hec-small text-hec-ink-soft">The centre has your message. · Trung tâm đã nhận được góp ý của bạn.</p>
              <Button variant="outline" onClick={() => { setSent(false); setMessage(""); setRating(0); }}>Send another · Gửi thêm</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>How was your experience? · Bạn đánh giá thế nào?</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} type="button" aria-label={`${n} stars`} onClick={() => setRating(n)} className="p-1">
                      <Star className={`h-9 w-9 ${n <= rating ? "fill-hec-brass text-hec-brass" : "text-hec-line-strong"}`} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Your message · Góp ý của bạn</Label>
                <Textarea rows={5} maxLength={1000} value={message} onChange={(e) => setMessage(e.target.value)}
                  placeholder="What is going well, and what could be better? · Điều gì tốt, điều gì cần cải thiện?" />
              </div>
              <div className="space-y-1.5">
                <Label>I am a… · Tôi là…</Label>
                <div className="flex flex-wrap gap-2">
                  {RELATIONS.map((r) => (
                    <button key={r.value} type="button" onClick={() => setRelation(r.value)}
                      className={`rounded-full border min-h-hec-target px-3 py-1.5 text-sm ${relation === r.value ? "border-hec-action bg-hec-action text-hec-on-action" : "border-hec-line-strong text-hec-ink"}`}>
                      {r.en} · {r.vi}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Your name (optional) · Tên (không bắt buộc)</Label>
                <Input maxLength={80} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Chị Lan, mẹ bé Minh" />
              </div>
              <div className="space-y-1.5">
                <Label>Phone or Zalo, if you want a reply (optional) · SĐT/Zalo nếu muốn được phản hồi</Label>
                <Input maxLength={120} value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox checked={mayShow} onCheckedChange={(v) => setMayShow(v === true)} className="mt-0.5" />
                <span>The centre may show my words and name on the reception screen. · Trung tâm có thể hiển thị góp ý và tên của tôi trên màn hình tại quầy lễ tân.</span>
              </label>
              <p className="text-hec-caption text-hec-ink-soft">Your phone number is never shown. · Số điện thoại sẽ không bao giờ được hiển thị.</p>
              {error && <p className="text-hec-small text-hec-danger">{error}</p>}
              <Button className="w-full h-12 text-base bg-hec-action text-hec-on-action hover:bg-hec-action/90" onClick={send} disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Send · Gửi
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
