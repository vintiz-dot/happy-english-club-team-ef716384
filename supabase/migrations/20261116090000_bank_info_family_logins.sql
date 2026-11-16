-- Families' own logins can read the school's bank details.
-- docs/evidence/FIX-streaks-bank-uploads.md, item 2.
--
-- The SELECT policy on bank_info (20251015032902) lets in an admin, a
-- `family`-role account, or a child's linked login. Most family logins are
-- none of those: on 16 Nov 2026, 27 of the 32 accounts that are a family's
-- primary_user_id held the `student` role (that is the role sign-up gives,
-- 20261113100000) and were not a child's linked login, so the payment page
-- showed them no account to pay into.
--
-- This replaces that one policy with the same three conditions plus "the
-- caller is a family's primary login", asked through a SECURITY DEFINER
-- helper so the answer does not depend on the policies of `families`. The
-- helper takes no argument: it answers only for the caller (auth.uid()), so
-- it cannot be used to ask about anyone else. Nobody else is let in: not
-- teachers, not anon (the policy is TO authenticated; anon could never pass
-- its conditions, auth.uid() being NULL). "Admins can manage bank info" is
-- left alone, so only an admin writes.
--
-- Re-runnable. Rollback: the block in the evidence file.

CREATE OR REPLACE FUNCTION public.caller_is_family_login()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.families f WHERE f.primary_user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.caller_is_family_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_is_family_login() TO authenticated;

DROP POLICY IF EXISTS "Admins and families can view bank info" ON public.bank_info;
CREATE POLICY "Admins and families can view bank info"
  ON public.bank_info FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR has_role(auth.uid(), 'family')
    OR EXISTS (
      SELECT 1 FROM public.students
      WHERE linked_user_id = auth.uid()
    )
    OR public.caller_is_family_login()
  );
