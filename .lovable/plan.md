## Goal

Help students who forgot their password create a brand-new login (e.g. `firstname@english.com` / `1234567`) that is linked to the same student record as their old account. The old account keeps working. Shown only after a student logs in, only once, and only until they create the new account.

## User flow (after a student successfully logs in)

1. **Full-page overlay** appears: "Want to switch to our new website?" with a big Yes / "Not now" choice.
   - "Not now" → dismiss for this session only (will show again on next login, since one-time = "until they create the new account").
2. **Yes** → next screen: "Do you remember your username (email) and password?"
   - **Yes, I remember** → close overlay, open `https://user.hanoienglish.vip/` in a new tab. Still not marked as "completed", will show again next login.
   - **No, I forgot** → continue to step 3.
3. **Create new account** screen:
   - Suggested email pre-filled as `{firstname}@english.com` (lowercased, ASCII-safe slug from student's `full_name`).
   - Student can edit the email; password is fixed at `1234567` (shown, not editable, per request).
   - "Create my new login" button.
4. **Backend creates the auth user**, links it to the same student record, marks the migration as completed for this student, and returns the final email.
5. **Confirmation screen**: shows the new email + password in a large, copyable card with a "📝 Write this down somewhere safe!" warning, a Copy button, and an "Open new website" button that links to `https://user.hanoienglish.vip/`.

After confirmation the overlay is dismissed permanently for that student (never shows again on this old account).

## Technical design

### Database (one migration)

- Add `students.secondary_user_id uuid NULL` — the new auth user that also resolves to this student.
- Add `students.migration_completed_at timestamptz NULL` — set when the new account is created. Used to suppress the overlay forever after.
- Update three SECURITY DEFINER helpers so the new user can also see the same student data:
  - `can_view_student` — accept rows where `s.secondary_user_id = user_id`.
  - `is_student_enrolled_in_class` — same OR clause.
  - `can_view_classmate` — same OR clause on the viewer side.
- Index: `CREATE INDEX students_secondary_user_id_idx ON students(secondary_user_id);`

### Edge function: `student-create-migration-account`

Service-role function (so it can call `auth.admin.createUser`). Steps:
1. Verify caller is authenticated and the caller's `auth.uid()` matches the student's existing `linked_user_id` (so only the real student can do this for themselves).
2. Reject if `students.migration_completed_at IS NOT NULL` (idempotent, one-time).
3. Take the requested email; if it already exists in `auth.users`, append `2`, `3`, … until free (auto-suffix as chosen).
4. Create the new auth user via admin API with password `1234567` and `email_confirm: true` so they can sign in immediately.
5. Assign the `student` role in `user_roles` for the new user.
6. Update the student row: `secondary_user_id = new_user_id`, `migration_completed_at = now()`.
7. Return `{ email, password: "1234567" }`.

Rate-limit: one successful creation per student (DB enforces via the `migration_completed_at` check).

### Frontend

- New component `src/components/migration/NewSiteMigrationOverlay.tsx` — the full-page multi-step flow (steps: intro → remember? → create → done).
- Mount it inside `Layout.tsx` (or wherever the student dashboard renders) and show only when:
  - `role === "student"` AND
  - the student row has `migration_completed_at IS NULL` AND
  - not dismissed for this session (`sessionStorage` flag for "Not now" / "Yes I remember").
- Reuse the existing kid-friendly premium styling (matching the auth-page upgrade banner already in place).

### Out of scope (per user's answers)

- Teachers do not see this flow.
- We are not changing the existing student auth account, just adding a second one tied to the same student.
- We are not migrating any data — both accounts read the same student record going forward.

## Files to add / change

```text
supabase/migrations/<new>.sql                              (new)
supabase/functions/student-create-migration-account/      (new)
src/components/migration/NewSiteMigrationOverlay.tsx      (new)
src/components/Layout.tsx                                  (mount overlay)
```

## Open question

Password `1234567` is intentionally weak so kids remember it. The new site (`user.hanoienglish.vip`) presumably accepts it — confirming this is the right shared default before we ship.
