// The admin tuition screen with one of its dialogs open over it, made-up props.
//   &dialog=close    CloseMonthDialog   (default)
//   &dialog=payment  RecordPaymentDialog for a child who owes (bill + an older month owing)
// Both are Radix modals, so one at a time; closing it leaves the tuition screen.
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Tuition from "@/pages/Tuition";
import { CloseMonthDialog } from "@/components/admin/CloseMonthDialog";
import { RecordPaymentDialog } from "@/components/admin/RecordPaymentDialog";
import { liveTuitionItem } from "@/lib/liveTuitionItem";
import { dayjs } from "@/lib/date";
import { BILL_OF, PAYMENT_DEMO_CLASSES, PAYMENT_DEMO_STUDENT, bulkAnswer } from "./adminFixtures";

export default function AdminDialogs() {
  const [params] = useSearchParams();
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(params.get("month") ?? "") ? params.get("month")! : dayjs().format("YYYY-MM");
  const which = params.get("dialog") === "payment" ? "payment" : "close";
  const [open, setOpen] = useState(true);

  const item = liveTuitionItem(
    PAYMENT_DEMO_STUDENT,
    bulkAnswer(BILL_OF(PAYMENT_DEMO_STUDENT.id), month),
    month,
    { classes: PAYMENT_DEMO_CLASSES, hasDiscount: false, hasSiblings: false },
  );

  return (
    <>
      <Tuition />
      {which === "close" ? (
        <CloseMonthDialog open={open} month={month} onClose={() => setOpen(false)} />
      ) : (
        <RecordPaymentDialog open={open} onClose={() => setOpen(false)} item={item} month={month} />
      )}
    </>
  );
}
