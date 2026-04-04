-- Create role enum
CREATE TYPE public.app_role AS ENUM ('company', 'candidate');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roles" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company_name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  skills TEXT[] DEFAULT '{}',
  experience TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  education TEXT,
  additional_criteria TEXT,
  company_name TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'draft')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active jobs" ON public.jobs
  FOR SELECT USING (status = 'active' OR auth.uid() = created_by);
CREATE POLICY "Companies can create jobs" ON public.jobs
  FOR INSERT WITH CHECK (auth.uid() = created_by AND public.has_role(auth.uid(), 'company'));
CREATE POLICY "Companies can update own jobs" ON public.jobs
  FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Companies can delete own jobs" ON public.jobs
  FOR DELETE USING (auth.uid() = created_by);

CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Interview strategies
CREATE TABLE public.interview_strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  role_type TEXT,
  difficulty_level TEXT,
  evaluation_focus TEXT[],
  core_skills TEXT[],
  strategy_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.interview_strategies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Job owners can view strategies" ON public.interview_strategies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND created_by = auth.uid())
    OR public.has_role(auth.uid(), 'candidate')
  );
CREATE POLICY "System can insert strategies" ON public.interview_strategies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND created_by = auth.uid())
  );

-- Questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('screening', 'skill', 'scenario', 'behavioral')),
  question_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view questions" ON public.questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Job owners can insert questions" ON public.questions
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND created_by = auth.uid())
  );

-- Applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'interviewing', 'evaluated', 'hired', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (job_id, candidate_id)
);
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Candidates can view own applications" ON public.applications
  FOR SELECT USING (
    auth.uid() = candidate_id
    OR EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND created_by = auth.uid())
  );
CREATE POLICY "Candidates can apply" ON public.applications
  FOR INSERT WITH CHECK (auth.uid() = candidate_id AND public.has_role(auth.uid(), 'candidate'));
CREATE POLICY "Update own or owned job applications" ON public.applications
  FOR UPDATE USING (
    auth.uid() = candidate_id
    OR EXISTS (SELECT 1 FROM public.jobs WHERE id = job_id AND created_by = auth.uid())
  );

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'evaluated')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view interviews" ON public.interviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.applications a
      WHERE a.id = application_id
      AND (a.candidate_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND j.created_by = auth.uid()))
    )
  );
CREATE POLICY "Candidates can start interviews" ON public.interviews
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND candidate_id = auth.uid())
  );
CREATE POLICY "Participants can update interviews" ON public.interviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.applications WHERE id = application_id AND candidate_id = auth.uid())
  );

-- Responses table
CREATE TABLE public.responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view responses" ON public.responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.applications a ON a.id = i.application_id
      WHERE i.id = interview_id
      AND (a.candidate_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND j.created_by = auth.uid()))
    )
  );
CREATE POLICY "Candidates can insert responses" ON public.responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.applications a ON a.id = i.application_id
      WHERE i.id = interview_id AND a.candidate_id = auth.uid()
    )
  );

-- Evaluations table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES public.interviews(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
  skill_score INTEGER CHECK (skill_score >= 0 AND skill_score <= 100),
  strengths TEXT[],
  weaknesses TEXT[],
  recommendation TEXT CHECK (recommendation IN ('hire', 'consider', 'reject')),
  detailed_feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view evaluations" ON public.evaluations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interviews i
      JOIN public.applications a ON a.id = i.application_id
      WHERE i.id = interview_id
      AND (a.candidate_id = auth.uid() OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = a.job_id AND j.created_by = auth.uid()))
    )
  );
CREATE POLICY "System can insert evaluations" ON public.evaluations
  FOR INSERT WITH CHECK (true);

-- Indexes
CREATE INDEX idx_user_roles_user ON public.user_roles(user_id);
CREATE INDEX idx_jobs_created_by ON public.jobs(created_by);
CREATE INDEX idx_jobs_status ON public.jobs(status);
CREATE INDEX idx_applications_candidate ON public.applications(candidate_id);
CREATE INDEX idx_applications_job ON public.applications(job_id);
CREATE INDEX idx_interviews_application ON public.interviews(application_id);
CREATE INDEX idx_questions_job ON public.questions(job_id);
CREATE INDEX idx_responses_interview ON public.responses(interview_id);
CREATE INDEX idx_evaluations_interview ON public.evaluations(interview_id);