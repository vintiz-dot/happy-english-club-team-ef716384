-- REPAIR (owner runs this in the Supabase SQL editor): bills whose saved discount is larger than their base.
-- Written 24 Nov 2026. Nothing here changes what anyone owes or has paid.
--
-- What it fixes: six saved bills show a discount bigger than the lessons they were charged for
-- (Phuc, September 2026: base 840,000, discount 1,260,000, because an old calculation also took a
-- 50% that was only for October, off the full base, after the 100% Teacher Discount). Every one of
-- the six has a total of 0, so the discount that does anything is the base: the stored discount is
-- set to the base, and the total, the payments, the status and the carry balances stay as they are.
-- Today's pricing cannot write such a bill (totalDiscount = base - total, never below 0 or above the
-- base), and a closed month keeps its saved split on purpose, so only this script corrects the six.
--
-- Run STEP 1 first and read it. Then run STEP 2 (it is a single transaction; it stops by itself if the
-- count it finds is not the count it expects). Every old value is kept in
-- public.invoices_before_discount_cap_20261124 and in audit_log.

-- ===== STEP 1: read only. Expect 6 rows, all total_amount = 0, each with will_become = base_amount. =====
select i.id as invoice_id,
       s.full_name,
       i.month,
       i.base_amount,
       i.discount_amount as discount_now,
       i.base_amount     as will_become,
       i.total_amount,
       i.recorded_payment,
       i.tuition_frozen,
       i.confirmation_status
  from public.invoices i
  join public.students s on s.id = i.student_id
 where i.discount_amount > i.base_amount
 order by i.month, s.full_name;

-- ===== STEP 2: the repair. Delete the "--@ " at the start of each line below to run it. =====
--@ begin;
--@ create table if not exists public.invoices_before_discount_cap_20261124 as
--@   select now() as copied_at, i.* from public.invoices i where false;
--@ insert into public.invoices_before_discount_cap_20261124
--@   select now(), i.* from public.invoices i
--@    where i.discount_amount > i.base_amount and i.total_amount = 0 and coalesce(i.tuition_frozen, false) = false;
--@ do $repair$
--@ declare n int;
--@ begin
--@   select count(*) into n from public.invoices_before_discount_cap_20261124 where copied_at > now() - interval '1 minute';
--@   if n <> 6 then
--@     raise exception 'Expected 6 bills to repair, found % - nothing changed. Read step 1 again.', n;
--@   end if;
--@   update public.invoices i
--@      set discount_amount = i.base_amount
--@     from public.invoices_before_discount_cap_20261124 b
--@    where b.id = i.id and b.copied_at > now() - interval '1 minute'
--@      and i.discount_amount > i.base_amount and i.total_amount = 0;
--@ end
--@ $repair$;
--@ -- Must return 0 rows, and the six totals must be unchanged.
--@ select count(*) as still_larger_than_base from public.invoices where discount_amount > base_amount;
--@ select i.id, i.base_amount, i.discount_amount, i.total_amount, i.recorded_payment
--@   from public.invoices i join public.invoices_before_discount_cap_20261124 b on b.id = i.id;
--@ commit;
