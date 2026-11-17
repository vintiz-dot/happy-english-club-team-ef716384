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
    <div className="overflow-hidden rounded-hec-lg border border-hec-line bg-hec-surface shadow-hec-1">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
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
                  className={(isSelected ? "bg-hec-sunken" : "hover:bg-hec-sunken/60")}
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
                    <div className="flex min-w-0 items-start gap-3">
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage
                          src={getAvatarUrl((item.students as any)?.avatar_url) || undefined}
                          alt={studentName}
                          className="object-cover"
                        />
                        <AvatarFallback className="bg-hec-sunken text-hec-caption font-medium text-hec-ink-soft">
                          {studentName.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="whitespace-normal break-words hyphens-none text-balance font-medium text-hec-ink">{studentName}</span>
                          {(item.students as any)?.is_active === false && (
                            <Badge
                              variant="secondary"
                              className=""
                              title="No longer enrolled — shown because they were active during this month"
                            >
                              Inactive
                            </Badge>
                          )}
                          {item.hasDiscount && (
                            <Badge variant="secondary" className="px-2" title="Discount">
                              <Percent className="h-3.5 w-3.5" aria-label="Discount" />
                            </Badge>
                          )}
                          {item.hasSiblings && (
                            <Badge variant="secondary" className="px-2" title="Sibling">
                              <Award className="h-3.5 w-3.5" aria-label="Sibling" />
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] whitespace-normal break-words text-hec-small text-hec-ink-soft">
                    {classNames}
                  </TableCell>
                  <TableCell>{getTuitionStatusBadge(status, item.settled_in_month)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-sans font-medium tabular-nums text-hec-ink">
                    {fmt(item.finalPayable)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-sans tabular-nums text-hec-ink">
                    {fmt(item.recorded_payment ?? 0)}
                  </TableCell>
                  <TableCell
                    className={`whitespace-nowrap text-right font-sans font-semibold tabular-nums ${balance === 0 ? "text-hec-ink-soft" : "text-hec-ink"}`}
                  >
                    {balance > 0 ? fmt(balance) : balance < 0 ? `+${fmt(Math.abs(balance))}` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className=""
                        onClick={() => onRecordPay(item)}
                        title="Record payment"
                        aria-label="Record payment"
                      >
                        <CreditCard className="h-5 w-5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className=""
                        onClick={() => navigate(`/students/${item.student_id}`)}
                        title="View student"
                        aria-label="View student"
                      >
                        <Eye className="h-5 w-5" />
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
