
ALTER TABLE public.jobs
  ADD COLUMN interview_instructions text,
  ADD COLUMN additional_qualifications text;

ALTER TABLE public.applications
  ADD COLUMN rejection_reason text;
