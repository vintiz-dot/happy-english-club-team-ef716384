
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student_id  ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session_id  ON public.attendance (session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student_session ON public.attendance (student_id, session_id);

CREATE INDEX IF NOT EXISTS idx_point_transactions_student_id ON public.point_transactions (student_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_class_id   ON public.point_transactions (class_id);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created_at ON public.point_transactions (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_points_class_month ON public.student_points (class_id, month);
CREATE INDEX IF NOT EXISTS idx_student_points_student_id  ON public.student_points (student_id);

CREATE INDEX IF NOT EXISTS idx_sessions_class_id      ON public.sessions (class_id);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher_id    ON public.sessions (teacher_id);
CREATE INDEX IF NOT EXISTS idx_sessions_class_teacher ON public.sessions (class_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id    ON public.enrollments (student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id      ON public.enrollments (class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_class ON public.enrollments (student_id, class_id);

CREATE INDEX IF NOT EXISTS idx_students_linked_user_id ON public.students (linked_user_id);
CREATE INDEX IF NOT EXISTS idx_students_family_id      ON public.students (family_id);

CREATE INDEX IF NOT EXISTS idx_families_primary_user_id ON public.families (primary_user_id);

CREATE INDEX IF NOT EXISTS idx_teachers_user_id_active ON public.teachers (user_id) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_id       ON public.homework_submissions (student_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_homework_id      ON public.homework_submissions (homework_id);
CREATE INDEX IF NOT EXISTS idx_homework_submissions_student_homework ON public.homework_submissions (student_id, homework_id);

CREATE INDEX IF NOT EXISTS idx_homeworks_class_id  ON public.homeworks (class_id);
CREATE INDEX IF NOT EXISTS idx_homeworks_due_date  ON public.homeworks (due_date DESC);
CREATE INDEX IF NOT EXISTS idx_homeworks_class_due ON public.homeworks (class_id, due_date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_login_rewards_student_id   ON public.daily_login_rewards (student_id);
CREATE INDEX IF NOT EXISTS idx_daily_login_rewards_student_date ON public.daily_login_rewards (student_id, reward_date DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id      ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_student_id             ON public.invoices (student_id);
CREATE INDEX IF NOT EXISTS idx_discount_assignments_student_id ON public.discount_assignments (student_id);
CREATE INDEX IF NOT EXISTS idx_referral_bonuses_student_id     ON public.referral_bonuses (student_id);

ANALYZE public.user_roles;
ANALYZE public.attendance;
ANALYZE public.point_transactions;
ANALYZE public.student_points;
ANALYZE public.sessions;
ANALYZE public.enrollments;
ANALYZE public.students;
ANALYZE public.families;
ANALYZE public.teachers;
ANALYZE public.homework_submissions;
ANALYZE public.homeworks;
ANALYZE public.daily_login_rewards;
ANALYZE public.notifications;
ANALYZE public.invoices;
ANALYZE public.discount_assignments;
ANALYZE public.referral_bonuses;
