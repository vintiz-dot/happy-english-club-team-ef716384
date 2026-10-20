import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Save, Mail, Phone, DollarSign, GraduationCap, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { TAClassAssignment } from "./TAClassAssignment";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PayRateHistory } from "@/components/admin/staff/PayRateHistory";
import {
  describeQuantity,
  describeRate,
  payRateTypeOf,
  totalPayVnd,
} from "@/lib/payRate";
import { durationMinutes } from "@/lib/sessionDuration";

interface TAProfileDrawerProps {
  ta: any;
  onClose: () => void;
}

export function TAProfileDrawer({ ta, onClose }: TAProfileDrawerProps) {
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  useEffect(() => {
    if (ta) {
      setFullName(ta.full_name || "");
      setEmail(ta.email || "");
      setPhone(ta.phone || "");
      setBio(ta.bio || "");
      setIsActive(ta.is_active ?? true);
    }
  }, [ta]);

  // Payroll-like stats for TA
  const { data: taStats } = useQuery({
    queryKey: ["ta-stats", ta?.id, selectedMonth],
    enabled: !!ta?.id,
    queryFn: async () => {
      const [year, month] = selectedMonth.split("-");
      const startDate = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endDate = `${year}-${month}-${lastDay.toString().padStart(2, "0")}`;

      const { data: participants, error } = await supabase
        .from("session_participants")
        .select("session_id, sessions!inner(date, start_time, end_time, status, classes!inner(name))")
        .eq("teaching_assistant_id", ta.id)
        .eq("participant_type", "teaching_assistant")
        .gte("sessions.date", startDate)
        .lte("sessions.date", endDate);

      if (error) throw error;

      const sessions = participants || [];
      const held = sessions.filter((p: any) => p.sessions?.status === "Held");
      // durationMinutes rather than a dayjs diff: the diff goes negative on
      // a session that crosses midnight and silently subtracts it from the
      // TA's earnings. PayrollTab had the same bug and was fixed the same
      // way; this copy was missed.
      const minutes = held.map(
        (p: any) => durationMinutes(p.sessions?.start_time, p.sessions?.end_time) ?? 0,
      );
      const totalMinutes = minutes.reduce((n: number, m: number) => n + m, 0);

      return {
        totalSessions: sessions.length,
        heldSessions: held.length,
        totalHours: totalMinutes / 60,
        totalEarnings: totalPayVnd(ta, minutes),
      };
    },
  });

  const handleSave = async () => {
    if (!ta?.id) return;
    setIsSaving(true);
    try {
      // The rate is not written here. PayRateHistory records it against a
      // date and syncs these columns itself, so saving them from this form
      // too would undo a future-dated change the moment someone edited a
      // phone number.
      const { error } = await supabase
        .from("teaching_assistants")
        .update({
          full_name: fullName,
          email,
          phone,
          bio,
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", ta.id);
      if (error) throw error;
      toast.success("Teaching assistant updated");
      queryClient.invalidateQueries({ queryKey: ["teaching-assistants"] });
    } catch (error: any) {
      toast.error(error.message || "Failed to update");
    } finally {
      setIsSaving(false);
    }
  };

  const monthOptions = [];
  for (let i = -3; i <= 3; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() + i);
    monthOptions.push(d.toISOString().slice(0, 7));
  }

  if (!ta) return null;

  return (
    <Sheet open={!!ta} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-card to-card/80">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 ring-2 ring-border">
              <AvatarFallback className="text-lg bg-gradient-to-br from-primary/20 to-accent/20">
                {ta.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <SheetTitle className="text-xl">{ta.full_name}</SheetTitle>
                <Badge variant={ta.is_active ? "default" : "secondary"}>
                  {ta.is_active ? "Active" : "Inactive"}
                </Badge>
                {ta.user_id && <Badge variant="outline" className="text-xs">Has Account</Badge>}
              </div>
              <SheetDescription className="flex flex-col gap-0.5">
                {ta.email && <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{ta.email}</span>}
                {ta.phone && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{ta.phone}</span>}
                <span className="flex items-center gap-1.5"><DollarSign className="h-3 w-3" />{describeRate(ta)}</span>
              </SheetDescription>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-4">
          <Tabs defaultValue="schedule" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="schedule">
                <GraduationCap className="h-4 w-4 mr-1.5" />
                Schedule
              </TabsTrigger>
              <TabsTrigger value="payroll">
                <DollarSign className="h-4 w-4 mr-1.5" />
                Payroll
              </TabsTrigger>
              <TabsTrigger value="edit">
                <Save className="h-4 w-4 mr-1.5" />
                Edit Info
              </TabsTrigger>
            </TabsList>

            {/* Schedule & Assignment Tab */}
            <TabsContent value="schedule" className="mt-4">
              <TAClassAssignment taId={ta.id} />
            </TabsContent>

            {/* Payroll Tab */}
            <TabsContent value="payroll" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(m => (
                      <SelectItem key={m} value={m}>
                        {new Date(m + "-01").toLocaleDateString("en-US", { year: "numeric", month: "long" })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      Total Sessions
                    </CardDescription>
                    <CardTitle className="text-2xl">{taStats?.totalSessions || 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Held Sessions
                    </CardDescription>
                    <CardTitle className="text-2xl">{taStats?.heldSessions || 0}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                      <Clock className="h-3.5 w-3.5" />
                      {/* Hours are what an hourly TA is paid on; for a
                          per-session TA they are a fact that does not drive
                          the money, so the count of lessons leads instead. */}
                      {payRateTypeOf(ta) === "per_session" ? "Lessons Paid" : "Hours Worked"}
                    </CardDescription>
                    <CardTitle className="text-2xl">
                      {describeQuantity(ta, {
                        sessions: taStats?.heldSessions ?? 0,
                        minutes: (taStats?.totalHours ?? 0) * 60,
                      })}
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-1.5 text-xs">
                      <DollarSign className="h-3.5 w-3.5" />
                      Earnings (VND)
                    </CardDescription>
                    <CardTitle className="text-2xl">{((taStats?.totalEarnings || 0) / 1000).toFixed(0)}K</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            </TabsContent>

            {/* Edit Info Tab */}
            <TabsContent value="edit" className="mt-4 space-y-4">
              <div>
                <Label htmlFor="ta-fullName">Full Name</Label>
                <Input id="ta-fullName" value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ta-email">Email</Label>
                <Input id="ta-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ta-phone">Phone</Label>
                <Input id="ta-phone" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <PayRateHistory
                staffId={ta.id}
                staffType="assistant"
                staff={ta}
              />
              <div>
                <Label htmlFor="ta-bio">Bio</Label>
                <Textarea id="ta-bio" value={bio} onChange={e => setBio(e.target.value)} rows={3} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="ta-active">Active Status</Label>
                <Switch id="ta-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <Button onClick={handleSave} disabled={isSaving} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
