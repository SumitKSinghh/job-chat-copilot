
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS portfolio_links jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS certifications text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS work_preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS career_goals text,
  ADD COLUMN IF NOT EXISTS verified_skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS performance_stats jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_refreshed_at timestamptz;

DROP POLICY IF EXISTS "Employers can view candidate profiles" ON public.profiles;
CREATE POLICY "Employers can view candidate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.applications a
    JOIN public.jobs j ON j.id = a.job_id
    WHERE a.candidate_id = profiles.user_id
      AND j.created_by = auth.uid()
  )
);
