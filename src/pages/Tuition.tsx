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
import { getPaymentStatus, getIvoryTuitionStatusBadge } from "@/lib/tuitionStatus";
import { SmartFamilyPaymentModal } from "@/components/admin/SmartFamilyPaymentModal";
import { Button } from "@/components/ui/button";
import { Wallet } from "lucide-react";
import { PageLoading } from "@/components/ui/loading";

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
            <p className="text-hec-body text-hec-ink-soft">Access denied. This page is for students and families only.</p>
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
            <p className="text-hec-body text-hec-ink-soft">Please select a student profile</p>
          </CardContent>
        </Card>
      </Layout>
    );
  }

  if (isLoading) {
    return (
      <Layout title="Tuition">
        <PageLoading message="Loading tuition" />
      </Layout>
    );
  }

  // Calculate status using shared utility
  const statusBadge = tuitionData ? getIvoryTuitionStatusBadge(getPaymentStatus({
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
        <div className="flex flex-wrap items-center justify-between gap-4">
          <MonthPicker value={month} onChange={setMonth} maxMonth={currentMonth} />
          {tuitionData && studentId && <InvoiceDownloadButton studentId={studentId} month={month} />}
        </div>

        {!tuitionData || tuitionData.totalAmount === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-hec-body text-hec-ink-soft">No tuition record found for {dayjs(month).format("MMMM YYYY")}</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardDescription>Current Balance</CardDescription>
                  {statusBadge}
                </div>
                {/* An amount: sans, ink, tabular (DS s.14) - never the CardTitle serif. */}
                <CardTitle className="whitespace-nowrap font-sans text-hec-display font-semibold tabular-nums text-hec-ink">{getBalanceDisplay()}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-hec-small text-hec-ink-soft">Base Amount</dt>
                    <dd className="whitespace-nowrap text-hec-h3 font-semibold tabular-nums text-hec-ink">{formatVND(tuitionData.baseAmount)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-hec-small text-hec-ink-soft">Discounts</dt>
                    <dd className="whitespace-nowrap text-hec-h3 font-semibold tabular-nums text-hec-ink">
                      -{formatVND(tuitionData.totalDiscount)}
                    </dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-hec-small text-hec-ink-soft">Total Payable</dt>
                    <dd className="whitespace-nowrap text-hec-h3 font-semibold tabular-nums text-hec-ink">{formatVND(tuitionData.totalAmount)}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-hec-small text-hec-ink-soft">Recorded Pay</dt>
                    <dd className="whitespace-nowrap text-hec-h3 font-semibold tabular-nums text-hec-ink">{formatVND(tuitionData.monthPayments)}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {tuitionData?.sessionDetails && tuitionData.sessionDetails.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Session Details</CardTitle>
                  <CardDescription>Classes attended in {dayjs(month).format("MMMM YYYY")}</CardDescription>
                </CardHeader>
                <CardContent className="px-4 sm:px-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="px-2 sm:px-4">Date</TableHead>
                        <TableHead className="px-2 text-right sm:px-4">Rate</TableHead>
                        <TableHead className="px-2 sm:px-4">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tuitionData.sessionDetails.map((session, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="px-2 tabular-nums sm:whitespace-nowrap sm:px-4">{dayjs(session.date).format("MMM D, YYYY")}</TableCell>
                          <TableCell className="whitespace-nowrap px-2 text-right tabular-nums sm:px-4">{formatVND(session.rate)}</TableCell>
                          <TableCell className="px-2 sm:px-4">
                            <span
                              className={`inline-flex items-center rounded-full border px-2 py-1 sm:px-3 text-hec-caption font-medium ${
                                session.status === "Held" ? "border-hec-leaf/30 bg-hec-leaf-tint text-hec-leaf" : "border-hec-line bg-hec-sunken text-hec-ink-soft"
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
