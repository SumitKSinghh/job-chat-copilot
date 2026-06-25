
ALTER TABLE public.resumes
  ADD COLUMN IF NOT EXISTS parsed_experience jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parsed_education jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS parsed_certifications text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS total_experience_years numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gaps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS hiring_risks text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS match_breakdown jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS analysis_status text DEFAULT 'pending';

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS ranking_weights jsonb DEFAULT '{"resume":40,"interview":40,"experience":10,"skills":10}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_criteria jsonb DEFAULT '[]'::jsonb;

ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS custom_criteria_scores jsonb DEFAULT '[]'::jsonb;
