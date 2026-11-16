# OVERPAYMENT: leftover family payment becomes credit on the next bill

Owner's decision (MONEY: YES): money a family pays beyond what the chosen bills owe shows as CREDIT on the family's next bill, instead of being recorded only in the ledger as "unapplied cash".

Where I am / next step: design settled (below); changing family-payment, then smart-family-payment, then the screens and tests.

Design (from reading the code): the leftover is FOLDED into the chosen child's allocation, exactly as a Manual split amount above what is owed already is: one `payment_allocations` row, one DR CASH/BANK / CR AR ledger pair keyed `family-payment-<payment>-<child>-...` / `smart-family-<payment>-<child>-...`, and the whole amount added to that child's bill of the payment month through `addToRecordedPayment` (compare-and-set). The carry trigger then turns the amount above the payable into `carry_out_credit`, and the next month's bill opens with it as `carry_in_credit`. delete-payment already takes such an allocation off the bill whole (its AR credit per child and month), so it needs no change.
