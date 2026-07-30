-- WITHDRAWN 2026-07-30 — this migration is intentionally a no-op.
-- ================================================================
-- It used to seed four demo accounts with PUBLISHED passwords:
--   admin@demo.com / teacher@demo.com / student@demo.com / family@demo.com
--
-- THIS IS A LIVE APP WITH REAL STUDENT AND FAMILY DATA. An admin-role
-- account with a password printed on the login page grants anyone the whole
-- database: every real student, family, attendance record and invoice.
--
-- The privileged accounts are revoked by 20260730110000. The body of this
-- migration was removed rather than left in place so that a fresh
-- environment (where migrations replay from zero) never creates them at all.
--
-- The ONLY demo account now is student@demo.com, which ships LOCKED. An
-- admin enables it and sets its password from the admin dashboard
-- (Settings → Demo access → manage-demo-student function). Never re-add a
-- privileged demo account, and never seed a password into source control.

SELECT 1;
