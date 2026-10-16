import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { UserPlus } from "lucide-react";
import { PayRateFields } from "@/components/admin/staff/PayRateFields";
import { payRateError, type PayRateType } from "@/lib/payRate";

export function TeacherForm({ onSuccess }: { onSuccess?: () => void }) {
  const { toast } = useToast();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [hourlyRate, setHourlyRate] = useState("200000");
  const [payRateType, setPayRateType] = useState<PayRateType>("hourly");
  const [bio, setBio] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName || !email) {
      toast({
        title: "Missing Information",
        description: "Please fill in name and email",
        variant: "destructive",
      });
      return;
    }

    const rateError = payRateError(payRateType, hourlyRate);
    if (rateError) {
      toast({ title: "Check the pay rate", description: rateError, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-teacher', {
        body: {
          fullName,
          email,
          phone,
          hourlyRate,
          payRateType,
          bio
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({
        title: "Success",
        description: `Teacher created. Temp password: ${data.tempPassword}`,
      });

      // Reset form
      setFullName("");
      setEmail("");
      setPhone("");
      setHourlyRate("200000");
      setBio("");
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create teacher",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Create New Teacher
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g: Nguyen Van A"
              />
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com"
              />
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0901234567"
              />
            </div>

          </div>

          <PayRateFields
            idPrefix="new-teacher-pay"
            payRateType={payRateType}
            onPayRateTypeChange={setPayRateType}
            rate={hourlyRate}
            onRateChange={setHourlyRate}
          />

          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Teacher background and qualifications..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? "Creating..." : "Create Teacher"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
