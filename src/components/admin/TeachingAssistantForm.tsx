import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { PayRateFields } from "@/components/admin/staff/PayRateFields";
import { payRateError, type PayRateType } from "@/lib/payRate";

export function TeachingAssistantForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("150000");
  const [payRateType, setPayRateType] = useState<PayRateType>("hourly");
  const [bio, setBio] = useState("");
  const [createAccount, setCreateAccount] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName) {
      toast({ title: "Missing Information", description: "Please fill in the name", variant: "destructive" });
      return;
    }

    if (createAccount && !email) {
      toast({ title: "Missing Email", description: "Email is required when creating a login account", variant: "destructive" });
      return;
    }

    const rateError = payRateError(payRateType, hourlyRate);
    if (rateError) {
      toast({ title: "Check the pay rate", description: rateError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-teaching-assistant', {
        body: { fullName, email, phone, hourlyRate, payRateType, bio, createAccount }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const message = data.tempPassword 
        ? `TA created. Temp password: ${data.tempPassword}`
        : "Teaching assistant created successfully";

      toast({ title: "Success", description: message });

      setFullName("");
      setEmail("");
      setPhone("");
      setHourlyRate("150000");
      setBio("");
      setCreateAccount(false);
      onSuccess?.();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create teaching assistant", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Add Teaching Assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="ta-fullName">Full Name *</Label>
              <Input id="ta-fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g: Tran Thi B" />
            </div>
            <div>
              <Label htmlFor="ta-email">Email</Label>
              <Input id="ta-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ta@example.com" />
            </div>
            <div>
              <Label htmlFor="ta-phone">Phone</Label>
              <Input id="ta-phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0901234567" />
            </div>
          </div>

          <PayRateFields
            idPrefix="new-ta-pay"
            payRateType={payRateType}
            onPayRateTypeChange={setPayRateType}
            rate={hourlyRate}
            onRateChange={setHourlyRate}
          />

          <div>
            <Label htmlFor="ta-bio">Bio</Label>
            <Textarea id="ta-bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Background and qualifications..." rows={3} />
          </div>

          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <Switch id="ta-account" checked={createAccount} onCheckedChange={setCreateAccount} />
            <Label htmlFor="ta-account" className="cursor-pointer">
              <span className="font-medium">Create login account</span>
              <p className="text-xs text-muted-foreground">Allow this TA to log in and access the teacher dashboard</p>
            </Label>
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Add Teaching Assistant"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
