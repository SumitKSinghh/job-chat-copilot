ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS salary_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS hide_salary boolean NOT NULL DEFAULT false;