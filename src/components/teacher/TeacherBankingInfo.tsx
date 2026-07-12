import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, CreditCard, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

interface TeacherBankingInfoProps {
  teacherId: string;
}

interface BankingInfo {
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  swift_code?: string;
  branch_name?: string;
}

export function TeacherBankingInfo({ teacherId }: TeacherBankingInfoProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [bankingInfo, setBankingInfo] = useState<BankingInfo>({
    bank_name: "",
    account_number: "",
    account_holder_name: "",
    swift_code: "",
    branch_name: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadBankingInfo();
  }, [teacherId]);

  const loadBankingInfo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("teacher_banking_info")
        .select("*")
        .eq("teacher_id", teacherId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setBankingInfo({
          bank_name: data.bank_name || "",
          account_number: data.account_number || "",
          account_holder_name: data.account_holder_name || "",
          swift_code: data.swift_code || "",
          branch_name: data.branch_name || "",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error loading banking information",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!bankingInfo.bank_name || !bankingInfo.account_number || !bankingInfo.account_holder_name) {
      toast({
        title: "Missing required fields",
        description: "Please fill in bank name, account number, and account holder name",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("teacher_banking_info")
        .upsert({
          teacher_id: teacherId,
          bank_name: bankingInfo.bank_name,
          account_number: bankingInfo.account_number,
          account_holder_name: bankingInfo.account_holder_name,
          swift_code: bankingInfo.swift_code || null,
          branch_name: bankingInfo.branch_name || null,
          updated_by: user?.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Banking information saved successfully",
      });

      setEditing(false);
      loadBankingInfo();
    } catch (error: any) {
      toast({
        title: "Error saving banking information",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const hasInfo = bankingInfo.bank_name && bankingInfo.account_number;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Banking Information
            </CardTitle>
            <CardDescription>
              {hasInfo ? "Manage your payment details" : "Add your banking details for payroll"}
            </CardDescription>
          </div>
          {hasInfo && !editing && (
            <Badge variant="outline" className="bg-green-500/10 text-green-700 dark:text-green-400">
              <CreditCard className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!editing && hasInfo ? (
          // Display mode
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Bank Name</Label>
                <p className="font-medium">{bankingInfo.bank_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Account Holder</Label>
                <p className="font-medium">{bankingInfo.account_holder_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Account Number</Label>
                <p className="font-mono font-medium">••••••{bankingInfo.account_number.slice(-4)}</p>
              </div>
              {bankingInfo.branch_name && (
                <div>
                  <Label className="text-xs text-muted-foreground">Branch</Label>
                  <p className="font-medium">{bankingInfo.branch_name}</p>
                </div>
              )}
              {bankingInfo.swift_code && (
                <div>
                  <Label className="text-xs text-muted-foreground">SWIFT Code</Label>
                  <p className="font-mono font-medium">{bankingInfo.swift_code}</p>
                </div>
              )}
            </div>
            <Button onClick={() => setEditing(true)} variant="outline" className="w-full mt-4">
              Edit Banking Information
            </Button>
          </div>
        ) : (
          // Edit mode
          <div className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name *</Label>
                <Input
                  id="bank_name"
                  value={bankingInfo.bank_name}
                  onChange={(e) => setBankingInfo({ ...bankingInfo, bank_name: e.target.value })}
                  placeholder="e.g., Vietcombank, BIDV, Techcombank"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                <Input
                  id="account_holder_name"
                  value={bankingInfo.account_holder_name}
                  onChange={(e) => setBankingInfo({ ...bankingInfo, account_holder_name: e.target.value })}
                  placeholder="Full name as shown on account"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  value={bankingInfo.account_number}
                  onChange={(e) => setBankingInfo({ ...bankingInfo, account_number: e.target.value })}
                  placeholder="Enter account number"
                  type="text"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_name">Branch Name</Label>
                <Input
                  id="branch_name"
                  value={bankingInfo.branch_name}
                  onChange={(e) => setBankingInfo({ ...bankingInfo, branch_name: e.target.value })}
                  placeholder="e.g., Hanoi Branch, HCMC Branch (optional)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="swift_code">SWIFT Code</Label>
                <Input
                  id="swift_code"
                  value={bankingInfo.swift_code}
                  onChange={(e) => setBankingInfo({ ...bankingInfo, swift_code: e.target.value })}
                  placeholder="For international transfers (optional)"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Save Information
              </Button>
              {hasInfo && (
                <Button onClick={() => {
                  setEditing(false);
                  loadBankingInfo();
                }} variant="outline" disabled={saving}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
