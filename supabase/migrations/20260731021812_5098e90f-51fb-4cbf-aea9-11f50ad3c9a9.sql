UPDATE auth.users
SET banned_until = TIMESTAMPTZ '2999-01-01 00:00:00+00'
WHERE banned_until = 'infinity'::timestamptz;