import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CreditCard, Eye, Award, Percent } from "lucide-react";
import { getPaymentStatus, getTuitionStatusBadge } from "@/lib/tuitionStatus";
import { getAvatarUrl } from "@/lib/avatars";
import { useIvory } from "@/hooks/useIvory";

interface TuitionStudentTableProps {
  items: any[];
  month: string;
  onRecordPay: (item: any) => void;
  selectionMode?: boolean;
  selectedIds: Set<string>;
  onToggleSelect: (studentId: string) => void;
  onToggleAll: () => void;
}

const fmt = (n: number) => n.toLocaleString("vi-VN") + " ₫";

/**
 * Dense table view of the tuition list — optimised for desktop power
 * admins who want to scan dozens of students at once. Mirrors the same
 * status flags as TuitionStudentCard but trades padding for density.
 */
export function TuitionStudentTable({
  items,
  month,
  onRecordPay,
  selectionMode = false,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: TuitionStudentTableProps) {
  const navigate = useNavigate();
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className={iv("overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1", "rounded-xl border surface-2 shadow-q1 overflow-hidden")}>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className={iv("hover:bg-transparent", "bg-muted/40 hover:bg-muted/40")}>
              {selectionMode && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={onToggleAll} aria-label="Select all" />
                </TableHead>
              )}
              <TableHead className="w-[260px]">Student</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Payable</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <TableHead className="text-right w-[160px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => {
              const status = getPaymentStatus({
                carryOutDebt: item.carry_out_debt ?? 0,
                carryOutCredit: item.carry_out_credit ?? 0,
                totalAmount: item.total_amount ?? 0,
                monthPayments: item.recorded_payment ?? 0,
                settledInMonth: item.settled_in_month,
              });
              const studentName = (item.students as any)?.full_name ?? "—";
              const classNames = (item as any).classes?.map((c: any) => c.name).join(", ") || "No class";
              const balance = item.balance ?? 0;
              const isSelected = selectedIds.has(item.student_id);

              return (
                <TableRow
                  key={item.id}
                  className={ivory ? (isSelected ? "bg-hec-sunken" : "hover:bg-hec-sunken/60") : `hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                  data-status={status}
                >
                  {selectionMode && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(item.student_id)}
                        aria-label={`Select ${studentName}`}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className={iv("flex min-w-0 items-start gap-3", "flex items-center gap-3 min-w-0")}>
                      <Avatar className={iv("h-8 w-8 shrink-0", "h-8 w-8 ring-1 ring-background shrink-0")}>
                        <AvatarImage
                          src={getAvatarUrl((item.students as any)?.avatar_url) || undefined}
                          alt={studentName}
                          className="object-cover"
                        />
                        <AvatarFallback className={iv("bg-hec-sunken text-hec-caption font-medium text-hec-ink-soft", "bg-primary/10 text-primary font-medium text-xs")}>
                          {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className={iv("flex flex-wrap items-center gap-2", "flex items-center gap-1.5 flex-wrap")}>
                          <span className={iv("whitespace-normal break-words hyphens-none text-balance font-medium text-hec-ink", "font-medium truncate")}>{studentName}</span>
                          {(item.students as any)?.is_active === false && (
                            <Badge
                              variant={ivory ? "secondary" : "outline"}
                              className={iv("", "h-4 px-1 text-[10px] border-muted-foreground/40 text-muted-foreground")}
                              title="No longer enrolled — shown because they were active during this month"
                            >
                              Inactive
                            </Badge>
                          )}
                          {item.hasDiscount && (
                            <Badge variant={ivory ? "secondary" : "outline"} className={iv("px-2", "h-4 px-1 gap-0.5 text-[10px] border-blue-300 text-blue-700")} title={ivory ? "Discount" : undefined}>
                              <Percent className={iv("h-3.5 w-3.5", "h-2.5 w-2.5")} aria-label={ivory ? "Discount" : undefined} />
                            </Badge>
                          )}
                          {item.hasSiblings && (
                            <Badge variant={ivory ? "secondary" : "outline"} className={iv("px-2", "h-4 px-1 gap-0.5 text-[10px] border-amber-300 text-amber-700")} title={ivory ? "Sibling" : undefined}>
                              <Award className={iv("h-3.5 w-3.5", "h-2.5 w-2.5")} aria-label={ivory ? "Sibling" : undefined} />
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className={iv("max-w-[200px] whitespace-normal break-words text-hec-small text-hec-ink-soft", "type-micro text-muted-foreground truncate max-w-[200px]")}>
                    {classNames}
                  </TableCell>
                  <TableCell>{getTuitionStatusBadge(status, item.settled_in_month)}</TableCell>
                  <TableCell className={iv("whitespace-nowrap text-right font-sans font-medium tabular-nums text-hec-ink", "text-right tabular-nums font-medium")}>
                    {fmt(item.finalPayable)}
                  </TableCell>
                  <TableCell className={iv("whitespace-nowrap text-right font-sans tabular-nums text-hec-ink", "text-right tabular-nums text-blue-600 dark:text-blue-400")}>
                    {fmt(item.recorded_payment ?? 0)}
                  </TableCell>
                  <TableCell
                    className={ivory
                      ? `whitespace-nowrap text-right font-sans font-semibold tabular-nums ${balance === 0 ? "text-hec-ink-soft" : "text-hec-ink"}`
                      : `text-right tabular-nums font-semibold ${
                      balance > 0
                        ? "text-destructive"
                        : balance < 0
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    }`}
                  >
                    {balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={iv("inline-flex items-center gap-2", "inline-flex items-center gap-1")}>
                      <Button
                        size={ivory ? "icon" : "sm"}
                        variant="ghost"
                        className={iv("", "h-8 px-2 gap-1")}
                        onClick={() => onRecordPay(item)}
                        title="Record payment"
                        aria-label="Record payment"
                      >
                        <CreditCard className={iv("h-5 w-5", "h-3.5 w-3.5")} />
                      </Button>
                      <Button
                        size={ivory ? "icon" : "sm"}
                        variant="ghost"
                        className={iv("", "h-8 px-2 gap-1")}
                        onClick={() => navigate(`/students/${item.student_id}`)}
                        title="View student"
                        aria-label="View student"
                      >
                        <Eye className={iv("h-5 w-5", "h-3.5 w-3.5")} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
