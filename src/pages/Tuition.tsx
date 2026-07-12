import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { dayjs } from "@/lib/date";
import Layout from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { AdminTuitionList } from "@/components/admin/AdminTuitionList";
import { MonthPicker } from "@/components/MonthPicker";
import { useStudentProfile } from "@/contexts/StudentProfileContext";
import { InvoiceDownloadButton } from "@/components/invoice/InvoiceDownloadButton";
import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStudentMonthFinance, formatVND } from "@/hooks/useStudentMonthFinance";
import { getPaymentStatus, getTuitionStatusBadge } from "@/lib/tuitionStatus";
import { SmartFamilyPaymentModal } from "@/components/admin/SmartFamilyPaymentModal";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";

export default function Tuition() {
  const { role } = useAuth();
  const { studentId } = useStudentProfile();
  const [month, setMonth] = useState(dayjs().format("YYYY-MM"));
  const currentMonth = dayjs().format("YYYY-MM");
  const [smartPayOpen, setSmartPayOpen] = useState(false);

  // Admin tuition page
  if (role === "admin") {
    return (
      <Layout title="Tuition">
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <MonthPicker value={month} onChange={setMonth} maxMonth={currentMonth} />
            <Button onClick={() => setSmartPayOpen(true)} variant="outline" className="gap-2">
              <Wallet className="h-4 w-4" />
              Smart Family Payment
            </Button>
          </div>
          <AdminTuitionList month={month} />
        </div>
        <SmartFamilyPaymentModal open={smartPayOpen} onClose={() => setSmartPayOpen(false)} />
      </Layout>
    );
  }

  // Teacher access denied
  if (role === "teacher") {
    return (
      <Layout title="Tuition">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Access denied. This page is for students and families only.</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  // Use the same hook as StudentTuitionTab for consistent data
  const { data: tuitionData, isLoading } = useStudentMonthFinance(studentId, month);

  if (!studentId) {
    return (
      <Layout title="Tuition">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Please select a student profile</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (isLoading) {
    return <Layout title="Tuition">Loading...</Layout>;
  }

  // Calculate status using shared utility
  const statusBadge = tuitionData ? getTuitionStatusBadge(getPaymentStatus({
    carryOutDebt: tuitionData.carryOutDebt,
    carryOutCredit: tuitionData.carryOutCredit,
    totalAmount: tuitionData.totalAmount,
    monthPayments: tuitionData.monthPayments,
    settledInMonth: tuitionData.settledInMonth,
  }), tuitionData.settledInMonth) : null;

  // Display balance correctly based on debt/credit
  const getBalanceDisplay = () => {
    if (!tuitionData) return formatVND(0);
    if (tuitionData.carryOutDebt > 0) {
      return formatVND(tuitionData.carryOutDebt);
    }
    if (tuitionData.carryOutCredit > 0) {
      return `+${formatVND(tuitionData.carryOutCredit)}`;
    }
    return formatVND(0);
  };

  return (
    <Layout title="Tuition">
      <div className="space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <MonthPicker value={month} onChange={setMonth} maxMonth={currentMonth} />
          {tuitionData && studentId && <InvoiceDownloadButton studentId={studentId} month={month} />}
        </div>

        {!tuitionData || tuitionData.totalAmount === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No tuition record found for {dayjs(month).format("MMMM YYYY")}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription>Current Balance</CardDescription>
                  {statusBadge}
                </div>
                <CardTitle className="text-4xl">{getBalanceDisplay()}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Base Amount</p>
                    <p className="text-lg font-semibold">{formatVND(tuitionData.baseAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discounts</p>
                    <p className="text-lg font-semibold text-green-600">
                      -{formatVND(tuitionData.totalDiscount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Payable</p>
                    <p className="text-lg font-semibold">{formatVND(tuitionData.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Recorded Pay</p>
                    <p className="text-lg font-semibold text-blue-600">{formatVND(tuitionData.monthPayments)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {tuitionData?.sessionDetails && tuitionData.sessionDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Session Details</CardTitle>
                  <CardDescription>Classes attended in {dayjs(month).format("MMMM YYYY")}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tuitionData.sessionDetails.map((session, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{dayjs(session.date).format("MMM D, YYYY")}</TableCell>
                          <TableCell>{formatVND(session.rate)}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded-full text-xs ${
                                session.status === "Held" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"
                              }`}
                            >
                              {session.status}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
