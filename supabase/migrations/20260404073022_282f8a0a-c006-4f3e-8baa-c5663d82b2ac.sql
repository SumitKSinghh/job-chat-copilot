DROP POLICY "System can insert evaluations" ON public.evaluations;
CREATE POLICY "Authenticated can insert evaluations" ON public.evaluations
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.applications a ON a.id = i.application_id
      WHERE i.id = interview_id
      AND (a.candidate_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND j.created_by = auth.uid()))
    )
  );