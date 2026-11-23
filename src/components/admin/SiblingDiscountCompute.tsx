import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthPicker } from "@/components/MonthPicker";
import { useEarliestFinanceMonth } from "@/hooks/useEarliestFinanceMonth";
import { dayjs } from "@/lib/date";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Calculator, Loader2, Eye, CheckCircle2, AlertCircle, Users, Settings2 } from "lucide-react";
import { formatVND } from "@/lib/money";
import { useMoneyInput } from "@/components/admin/money-guard/useMoneyInput";
import { MoneyInputDialog } from "@/components/admin/money-guard/MoneyInputDialog";

interface PreviewResult {
  family_id: string;
  family_name?: string;
  status: 'assigned' | 'pending' | 'none';
  reason?: string;
  winner_student_id?: string;
  winner_student_name?: string;
  winner_class_name?: string;
  winner_base?: number;
  discount_percent?: number;
  discount_amount?: number;
  student_count?: number;
  positive_count?: number;
  students?: Array<{
    id: string;
    name: string;
  }>;
  all_students?: Array<{
    id?: string;
    student_id?: string;
    name?: string;
    student_name?: string;
    class_name?: string;
    highest_class?: string;
    projected_base: number;
    projected_sessions?: number;
    enrollment_count?: number;
    reason?: string;
    is_winner?: boolean;
  }>;
}

interface FamilyOverride {
  percent: number;
  disabled: boolean;
}

export function SiblingDiscountCompute() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewResults, setPreviewResults] = useState<PreviewResult[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [familyOverrides, setFamilyOverrides] = useState<Record<string, FamilyOverride>>({});
  const [savingOverride, setSavingOverride] = useState<string | null>(null);
  const { toast } = useToast();
  const { data: earliestMonth } = useEarliestFinanceMonth();

  const handlePreview = async () => {
    try {
      setPreviewLoading(true);
      
      const { data, error } = await supabase.functions.invoke("compute-sibling-discounts", {
        body: { month: selectedMonth, dryRun: true },
      });

      if (error) throw error;

      const allResults = data.results || [];
      // Filter out non-qualifying families (status 'none' = <2 students)
      const qualifyingResults = allResults.filter(
        (r: PreviewResult) => r.status === 'assigned' || r.status === 'pending'
      );
      setPreviewResults(qualifyingResults);
      
      // Batch fetch family overrides for qualifying families only
      const qualifyingFamilyIds = qualifyingResults.map((r: PreviewResult) => r.family_id);
      const overrides: Record<string, FamilyOverride> = {};
      
      if (qualifyingFamilyIds.length > 0) {
        const { data: familiesData } = await supabase
          .from('families')
          .select('id, sibling_percent_override')
          .in('id', qualifyingFamilyIds);
        
        const familyMap = new Map(familiesData?.map(f => [f.id, f]) || []);
        
        for (const result of qualifyingResults) {
          const familyData = familyMap.get(result.family_id);
          overrides[result.family_id] = {
            // ?? not ||: a family's 0 means "off" and must not read as the default 5.
            percent: result.discount_percent ?? familyData?.sibling_percent_override ?? 5,
            disabled: (familyData?.sibling_percent_override === 0),
          };
        }
      }
      setFamilyOverrides(overrides);
      setShowPreview(true);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setPreviewLoading(false);
    }
  };

  // D4 step 3B (G-19): a family's sibling percentage is read at calculation
  // time for every month, so it is a checked change made as the signed-in
  // admin. A family with nothing billed yet: tier 0, saved at once. A family
  // with billed months: the dialog asks for a reason.
  const overrideSaved = async (percent: unknown) => {
    toast({
      title: "Saved",
      description: Number(percent) === 0
        ? "Sibling discount disabled for this family"
        : `Sibling discount set to ${percent}%`,
    });
    // Re-run preview to get updated calculations
    await handlePreview();
  };
  const money = useMoneyInput((_result, request) => {
    void overrideSaved(request.args.percent);
  });

  const handleSaveFamilyOverride = async (familyId: string) => {
    try {
      setSavingOverride(familyId);
      const override = familyOverrides[familyId];

      // If disabled, set to 0; otherwise use the percent value
      const percentValue = override.disabled ? 0 : override.percent;

      const r = await money.run({
        entity: "family_link",
        op: "set_sibling_percent",
        args: { family_id: familyId, percent: percentValue },
      });
      if (r.status === "refused") throw new Error(r.message);
      if (r.status === "done" && !r.unchanged) await overrideSaved(percentValue);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSavingOverride(null);
    }
  };

  const handleCompute = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase.functions.invoke("compute-sibling-discounts", {
        body: { month: selectedMonth },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Processed ${data.processed} families for ${selectedMonth}. ${
          data.results?.filter((r: any) => r.status === 'assigned').length || 0
        } assigned${data.results?.some((r: any) => r.winner_class_name) ? ' (with class selection)' : ''}, ${
          data.results?.filter((r: any) => r.status === 'pending').length || 0
        } pending.`,
      });
      
      setShowPreview(false);
      setPreviewResults(null);
      setFamilyOverrides({});
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFamilyOverride = (familyId: string, updates: Partial<FamilyOverride>) => {
    setFamilyOverrides(prev => ({
      ...prev,
      [familyId]: { ...prev[familyId], ...updates }
    }));
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Compute Sibling Discounts
          </CardTitle>
          <CardDescription>
            Run on day-1 of each month to assign sibling discounts. Only families with ≥2 students having positive projected tuition will receive the discount.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
            <div className="flex-1 space-y-2">
              <label className="text-hec-small font-medium text-hec-ink">Month</label>
              <MonthPicker
                value={selectedMonth}
                onChange={setSelectedMonth}
                minMonth={earliestMonth}
                maxMonth={dayjs().add(2, "month").format("YYYY-MM")}
              />
            </div>
            <Button 
              onClick={handlePreview} 
              disabled={previewLoading || loading}
              variant="outline"
              className="gap-2"
            >
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin" />}
              {!previewLoading && <Eye className="h-4 w-4" />}
              Preview
            </Button>
            <Button 
              onClick={handleCompute} 
              disabled={loading || previewLoading}
              className="gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Apply Discounts
            </Button>
          </div>

          <div className="text-hec-small text-hec-ink-soft space-y-1">
            <p><strong>Logic:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Uses actual tuition calculation from Finance → Tuition (same as invoices)</li>
              <li>Threshold: ≥2 students with <strong>net tuition &gt; 0₫</strong> (after enrollment discounts and rate adjustments)</li>
              <li><strong>Multi-class students:</strong> System selects their highest-tuition class based on NET amount (after class-specific discounts)</li>
              <li>Winner: Student with lowest highest-class net tuition (tie → deterministic hash)</li>
              <li>Discount: Family override or default 5% <strong>applied to winner's selected class only</strong></li>
              <li>If threshold met later in month, discount applies retroactively from month start</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Discount Preview for {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}</DialogTitle>
            <DialogDescription>
              Review the discount assignments before applying them. Use the settings to adjust percentage or disable per family.
              <br />
              <strong className="text-hec-ink">Note:</strong> Uses NET tuition (after enrollment discounts and rate adjustments) for winner selection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewResults && previewResults.length === 0 && (
              <p className="text-center text-hec-body text-hec-ink-soft py-8">No families found for this month.</p>
            )}

            {previewResults?.map((result) => {
              const override = familyOverrides[result.family_id] || { percent: 5, disabled: false };
              const isDisabled = override.disabled;
              const effectivePercent = isDisabled ? 0 : override.percent;
              const recalculatedDiscount = result.winner_base 
                ? Math.round(result.winner_base * (effectivePercent / 100)) 
                : 0;

              return (
                <Card key={result.family_id} className={isDisabled ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex flex-wrap-reverse items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 basis-56 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Users className="h-4 w-4 shrink-0 text-hec-ink-soft" />
                            <span className="min-w-0 whitespace-normal break-words hyphens-none text-hec-body font-semibold text-hec-ink">{result.family_name || 'Unknown Family'}</span>
                            {result.status === 'assigned' && result.winner_student_name && !isDisabled && (
                              <Badge variant="default" className="whitespace-normal border-hec-brass/40 bg-transparent text-hec-brass">
                                Winner: {result.winner_student_name}
                              </Badge>
                            )}
                            {isDisabled && (
                              <Badge variant="secondary" className="">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          {result.students && result.students.length > 0 && (
                            <div className="whitespace-normal break-words text-hec-caption text-hec-ink-soft">
                              Members: {result.students.map(s => s.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <Badge variant={
                          isDisabled ? 'secondary' :
                          result.status === 'assigned' ? 'default' :
                          result.status === 'pending' ? 'secondary' :
                          'outline'
                        } className={(
                          isDisabled ? 'shrink-0' :
                          result.status === 'assigned' ? 'shrink-0 border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf' :
                          result.status === 'pending' ? 'shrink-0 border-hec-warn/30 bg-hec-warn-tint text-hec-warn' :
                          'shrink-0'
                        )}>
                          {!isDisabled && result.status === 'assigned' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {!isDisabled && result.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {isDisabled ? 'DISABLED' : result.status.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Family Override Controls */}
                      {(result.status === 'assigned' || result.status === 'pending') && (
                        <div className="flex flex-wrap items-center gap-4 p-3 bg-hec-sunken rounded-hec-md border border-hec-line">
                          <Settings2 className="h-4 w-4 text-hec-ink-soft" />
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`enable-${result.family_id}`}
                              checked={!isDisabled}
                              onCheckedChange={(checked) => updateFamilyOverride(result.family_id, { disabled: !checked })}
                            />
                            <Label htmlFor={`enable-${result.family_id}`} className="text-hec-small text-hec-ink">
                              Enable
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`percent-${result.family_id}`} className="text-hec-small text-hec-ink whitespace-nowrap">Discount %:</Label>
                            <Input
                              id={`percent-${result.family_id}`}
                              type="number"
                              min={0}
                              max={100}
                              value={override.percent}
                              onChange={(e) => updateFamilyOverride(result.family_id, { percent: parseInt(e.target.value) || 0 })}
                              className="w-24 tabular-nums"
                              disabled={isDisabled}
                            />
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveFamilyOverride(result.family_id)}
                            disabled={savingOverride === result.family_id}
                          >
                            {savingOverride === result.family_id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Save'
                            )}
                          </Button>
                        </div>
                      )}

                      {result.status === 'assigned' && result.all_students && !isDisabled && (
                        <div className="space-y-2">
                          <p className="text-hec-small font-medium text-hec-ink">Students & Highest Classes (Net Amounts):</p>
                          <div className="space-y-1.5">
                            {result.all_students.map((student) => (
                              <div
                                key={student.student_id}
                                className={`flex items-start justify-between gap-4 p-3 rounded-hec-md text-hec-small text-hec-ink border ${
                                  student.is_winner
                                    ? 'bg-hec-surface border-hec-brass/40'
                                    : 'bg-hec-sunken border-hec-line'
                                }`}
                              >
                                <div className="flex min-w-0 flex-1 flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="min-w-0 whitespace-normal break-words hyphens-none font-semibold">{student.student_name}</span>
                                    {student.is_winner && (
                                      <Badge variant="default" className="shrink-0 border-hec-brass/40 bg-transparent text-hec-brass">Winner</Badge>
                                    )}
                                  </div>
                                  <span className="whitespace-normal break-words text-hec-caption text-hec-ink-soft">{student.class_name}</span>
                                </div>
                                <span className={`shrink-0 whitespace-nowrap tabular-nums text-hec-ink ${student.is_winner ? 'font-semibold' : ''}`}>
                                  {formatVND(student.projected_base)}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-2 border-t border-hec-line space-y-1">
                            <div className="flex items-baseline justify-between gap-4 text-hec-small text-hec-ink">
                              <span className="min-w-0 whitespace-normal break-words text-hec-ink-soft">Discount ({effectivePercent}% on {result.winner_class_name})</span>
                              <span className="shrink-0 whitespace-nowrap font-semibold tabular-nums text-hec-ink">
                                -{formatVND(recalculatedDiscount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {result.status === 'pending' && result.reason === 'threshold not met' && !isDisabled && (
                        <div className="mt-3 p-3 bg-hec-warn-tint rounded-hec-md border border-hec-warn/30">
                          <p className="text-hec-small font-semibold text-hec-warn mb-2">
                            ⚠️ Threshold Not Met: Only {result.positive_count} of {result.student_count} student(s) have positive net tuition
                          </p>
                          {result.all_students && result.all_students.length > 0 && (
                            <div className="space-y-2 mt-3">
                              <p className="text-hec-caption font-semibold text-hec-ink">Student Breakdown:</p>
                              {result.all_students.map((student) => (
                                <div key={student.id || student.student_id} className="text-hec-caption pl-3 border-l border-hec-warn/30 space-y-0.5">
                                  <div className="whitespace-normal break-words hyphens-none font-semibold text-hec-ink">
                                    {student.name || student.student_name}
                                  </div>
                                  <div className="whitespace-normal break-words text-hec-ink-soft">
                                    Highest Class: {student.highest_class || student.class_name || 'N/A'}
                                  </div>
                                  <div className="text-hec-ink-soft tabular-nums">
                                    Net Tuition: {formatVND(student.projected_base)} ({student.projected_sessions || 0} sessions)
                                  </div>
                                  <div className="text-hec-ink-soft tabular-nums">
                                    Active Enrollments: {student.enrollment_count || 0}
                                  </div>
                                  <div className={`font-medium ${student.projected_base > 0 ? 'text-hec-leaf' : 'text-hec-danger'}`}>
                                    Status: {student.reason || 'unknown'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {result.status === 'none' && (
                        <p className="text-hec-small text-hec-ink-soft">{result.reason}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompute} disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Apply Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MoneyInputDialog
        guard={money.guard}
        subject={previewResults?.find((r) => r.family_id === money.guard.request?.args?.family_id)?.family_name}
      />
    </>
  );
}
