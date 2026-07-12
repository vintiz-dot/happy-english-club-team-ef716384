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
import { formatVND } from "@/lib/invoice/formatter";

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
            percent: result.discount_percent || familyData?.sibling_percent_override || 5,
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

  const handleSaveFamilyOverride = async (familyId: string) => {
    try {
      setSavingOverride(familyId);
      const override = familyOverrides[familyId];
      
      // If disabled, set to 0; otherwise use the percent value
      const percentValue = override.disabled ? 0 : override.percent;
      
      const { error } = await supabase
        .from('families')
        .update({ sibling_percent_override: percentValue })
        .eq('id', familyId);
      
      if (error) throw error;
      
      toast({
        title: "Saved",
        description: override.disabled 
          ? "Sibling discount disabled for this family" 
          : `Sibling discount set to ${percentValue}%`,
      });
      
      // Re-run preview to get updated calculations
      await handlePreview();
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
              <label className="text-sm font-medium">Month</label>
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

          <div className="text-sm text-muted-foreground space-y-1">
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
              <strong className="text-foreground">Note:</strong> Uses NET tuition (after enrollment discounts and rate adjustments) for winner selection.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {previewResults && previewResults.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No families found for this month.</p>
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
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span className="font-semibold">{result.family_name || 'Unknown Family'}</span>
                            {result.status === 'assigned' && result.winner_student_name && !isDisabled && (
                              <Badge variant="default" className="ml-2 bg-green-600">
                                Winner: {result.winner_student_name}
                              </Badge>
                            )}
                            {isDisabled && (
                              <Badge variant="secondary" className="ml-2">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          {result.students && result.students.length > 0 && (
                            <div className="text-xs text-muted-foreground ml-6">
                              Members: {result.students.map(s => s.name).join(', ')}
                            </div>
                          )}
                        </div>
                        <Badge variant={
                          isDisabled ? 'secondary' :
                          result.status === 'assigned' ? 'default' :
                          result.status === 'pending' ? 'secondary' :
                          'outline'
                        }>
                          {!isDisabled && result.status === 'assigned' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {!isDisabled && result.status === 'pending' && <AlertCircle className="h-3 w-3 mr-1" />}
                          {isDisabled ? 'DISABLED' : result.status.toUpperCase()}
                        </Badge>
                      </div>

                      {/* Family Override Controls */}
                      {(result.status === 'assigned' || result.status === 'pending') && (
                        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg border">
                          <Settings2 className="h-4 w-4 text-muted-foreground" />
                          <div className="flex items-center gap-2">
                            <Switch
                              id={`enable-${result.family_id}`}
                              checked={!isDisabled}
                              onCheckedChange={(checked) => updateFamilyOverride(result.family_id, { disabled: !checked })}
                            />
                            <Label htmlFor={`enable-${result.family_id}`} className="text-sm">
                              Enable
                            </Label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Label className="text-sm whitespace-nowrap">Discount %:</Label>
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              value={override.percent}
                              onChange={(e) => updateFamilyOverride(result.family_id, { percent: parseInt(e.target.value) || 0 })}
                              className="w-20 h-8"
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
                          <p className="text-sm font-medium">Students & Highest Classes (Net Amounts):</p>
                          <div className="space-y-1.5">
                            {result.all_students.map((student) => (
                              <div
                                key={student.student_id}
                                className={`flex items-center justify-between p-3 rounded text-sm ${
                                  student.is_winner
                                    ? 'bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800'
                                    : 'bg-muted/50'
                                }`}
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold">{student.student_name}</span>
                                    {student.is_winner && (
                                      <Badge variant="default" className="bg-green-600 text-xs">Winner</Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">{student.class_name}</span>
                                </div>
                                <span className={student.is_winner ? 'font-semibold' : ''}>
                                  {formatVND(student.projected_base)}
                                </span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="pt-2 border-t space-y-1">
                            <div className="flex justify-between text-sm">
                              <span>Discount ({effectivePercent}% on {result.winner_class_name})</span>
                              <span className="font-semibold text-green-600 dark:text-green-400">
                                -{formatVND(recalculatedDiscount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {result.status === 'pending' && result.reason === 'threshold not met' && !isDisabled && (
                        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-md border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                            ⚠️ Threshold Not Met: Only {result.positive_count} of {result.student_count} student(s) have positive net tuition
                          </p>
                          {result.all_students && result.all_students.length > 0 && (
                            <div className="space-y-2 mt-3">
                              <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">Student Breakdown:</p>
                              {result.all_students.map((student) => (
                                <div key={student.id || student.student_id} className="text-xs pl-3 border-l-2 border-yellow-400 space-y-0.5">
                                  <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                                    {student.name || student.student_name}
                                  </div>
                                  <div className="text-yellow-700 dark:text-yellow-300">
                                    Highest Class: {student.highest_class || student.class_name || 'N/A'}
                                  </div>
                                  <div className="text-yellow-700 dark:text-yellow-300">
                                    Net Tuition: {formatVND(student.projected_base)} ({student.projected_sessions || 0} sessions)
                                  </div>
                                  <div className="text-yellow-700 dark:text-yellow-300">
                                    Active Enrollments: {student.enrollment_count || 0}
                                  </div>
                                  <div className={`font-medium ${student.projected_base > 0 ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                                    Status: {student.reason || 'unknown'}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {result.status === 'none' && (
                        <p className="text-sm text-muted-foreground">{result.reason}</p>
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
    </>
  );
}
