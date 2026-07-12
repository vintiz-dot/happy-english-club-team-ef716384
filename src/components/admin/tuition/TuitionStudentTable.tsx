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

  const allSelected = items.length > 0 && selectedIds.size === items.length;

  return (
    <div className="rounded-xl border surface-2 shadow-q1 overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              {selectionMode && (
                <TableHead className="w-10">
                  <Checkbox checked={allSelected} onCheckedChange={onToggleAll} />
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
                  className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5" : ""}`}
                  data-status={status}
                >
                  {selectionMode && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect(item.student_id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 ring-1 ring-background shrink-0">
                        <AvatarImage
                          src={getAvatarUrl((item.students as any)?.avatar_url) || undefined}
                          alt={studentName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                          {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-medium truncate">{studentName}</span>
                          {item.hasDiscount && (
                            <Badge variant="outline" className="h-4 px-1 gap-0.5 text-[10px] border-blue-300 text-blue-700">
                              <Percent className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                          {item.hasSiblings && (
                            <Badge variant="outline" className="h-4 px-1 gap-0.5 text-[10px] border-amber-300 text-amber-700">
                              <Award className="h-2.5 w-2.5" />
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="type-micro text-muted-foreground truncate max-w-[200px]">
                    {classNames}
                  </TableCell>
                  <TableCell>{getTuitionStatusBadge(status, item.settled_in_month)}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(item.finalPayable)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-blue-600 dark:text-blue-400">
                    {fmt(item.recorded_payment ?? 0)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-semibold ${
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
                    <div className="inline-flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 gap-1"
                        onClick={() => onRecordPay(item)}
                        title="Record payment"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 gap-1"
                        onClick={() => navigate(`/students/${item.student_id}`)}
                        title="View student"
                      >
                        <Eye className="h-3.5 w-3.5" />
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
