#!/usr/bin/env bash
# Runs the invoice-status suite on its own, with the four migrations it needs
# (the same list as its entry in run.mjs). From the repo root:
#   bash scripts/pgtest/run-invoice-status.sh
M=supabase/migrations
exec node scripts/pgtest/invoice-status.test.mjs \
  "$M/20251117061416_2afa5f4f-f2a4-48ba-9c52-9939e4ece5e9.sql" \
  "$M/20261009120000_keep_invoice_carry_balances_correct.sql" \
  "$M/20261009130000_audit_every_admin_action.sql" \
  "$M/20261106120000_invoice_tuition_freeze.sql"
