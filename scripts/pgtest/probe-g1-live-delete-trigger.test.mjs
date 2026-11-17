// PROBE (review of G1, B-1): record-payment against live's payments delete
// trigger, prevent_client_payment_deletion (20251024152825).
//
// The review's probe was the suite of 1549ec07 verbatim with that trigger
// added; it failed 7 assertions, because the old record-payment undid a
// failed payment by DELETING its payments row through the admin's client,
// which the trigger refuses - leaving a payment on no bill (s9 two screens at
// 0, s9 two corrections at once, s10 bill write failing, s10 ledger insert
// failing, s12 / s13 invariants). That copy is in git history (the commit
// before this one).
//
// Fix round 1 removed the undo: the three writes are one transaction in
// public.record_admin_payment (20261117121000), and the suite itself now
// installs the trigger from the migration text with every other trigger live
// has on the money tables. So the probe is now the suite with the trigger, as
// the review defined it: this file runs record-payment.test.mjs with
// G1_PROBE_LIVE_DELETE_TRIGGER set, which adds the probe's own check (the
// trigger is the migration's text and refuses an admin's DELETE), and the
// seven scenarios pass in its sections 9, 10, 12 and 13.
process.env.G1_PROBE_LIVE_DELETE_TRIGGER = '1';
await import('./record-payment.test.mjs');
