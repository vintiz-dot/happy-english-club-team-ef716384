# FIX: attendance streaks, family bank details, long phone videos

Where I am / next step: items 1 (streaks) and 2 (bank details) written and tested; next step is item 3 (long videos), then the full check run and this file's final write-up.

## 2. Families cannot see the school's bank details

Rollback (recreates the live SELECT policy as 20251015032902 wrote it, and removes the helper). `scripts/pgtest/bank-info-family.test.mjs` installs this block as the "before", and runs it again as the rollback.

<!-- rollback bank_info -->
```sql
DROP POLICY IF EXISTS "Admins and families can view bank info" ON public.bank_info;
CREATE POLICY "Admins and families can view bank info"
  ON public.bank_info FOR SELECT
  USING (
    has_role(auth.uid(), 'admin') 
    OR has_role(auth.uid(), 'family')
    OR EXISTS (
      SELECT 1 FROM public.students 
      WHERE linked_user_id = auth.uid()
    )
  );
DROP FUNCTION IF EXISTS public.caller_is_family_login();
```
