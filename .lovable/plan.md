## What we're building

Four employer-side upgrades, scoped to keep existing flows intact:

1. **AI Resume Intelligence** — deep parse + risk analysis
2. **Weighted Ranking Engine** — per-job custom criteria
3. **Candidate Comparison Workspace** — side-by-side compare
4. **RecruitIQ AI Assistant** — natural-language candidate Q&A (per-job widget + global page)

---

## 1. Resume Intelligence (upgrade)

**Database** — extend `resumes` table:
- `parsed_experience` (jsonb) — array of {company, role, duration_months, highlights}
- `parsed_education` (jsonb) — array of {institution, degree, year}
- `parsed_certifications` (text[])
- `total_experience_years` (numeric)
- `gaps` (jsonb) — array of {start, end, months}
- `hiring_risks` (text[]) — short-tenure, job hopping, skill mismatch, etc.
- `match_breakdown` (jsonb) — {skills_match, experience_match, education_match, overall}

**Edge function** — new `analyze-resume`:
- Takes `resume_id` + `job_id`
- Runs Lovable AI (`google/gemini-3-flash-preview`) with structured output (Zod)
- Writes parsed fields back to the row
- Triggered automatically right after candidate uploads/saves a resume against a job

**UI** — `JobDetail.tsx` candidate row gets a "Resume Intelligence" panel showing experience timeline, education, certs, gaps, risks, and the match breakdown bars.

---

## 2. Weighted Ranking Engine (upgrade)

**Database** — extend `jobs` table:
- `ranking_weights` (jsonb, default `{"resume":40,"interview":40,"experience":10,"skills":10}`)
- `custom_criteria` (jsonb) — array of {label, weight, description} added by employer

**UI**
- `CreateJob.tsx` / new edit dialog: weight sliders that must sum to 100, plus add-custom-criteria control.
- `JobDetail.tsx` computes `weighted_score` per candidate from resume match, interview overall_score, experience years, skills overlap, and custom criteria scores produced by the AI evaluator. Hire/Consider/Reject thresholds: ≥75 / 50–74 / <50.

**Edge function** — `evaluate-interview` extended to also output a score for each `custom_criteria` entry.

---

## 3. Candidate Comparison Workspace (new)

**Route** — `/jobs/:jobId/compare?ids=a,b,c`

**Flow** — `JobDetail.tsx` adds checkboxes on candidate rows + "Compare selected (2–4)" button → navigates to compare page.

**Page** — `CandidateCompare.tsx` renders a sticky-header table with columns per candidate and rows for: weighted score, recommendation, skills match, total experience, education, certifications, interview score, strengths, concerns, salary expectation (from profile, falls back to "Not provided"), AI verdict. Includes an "AI Comparison Summary" panel calling a new `compare-candidates` edge function that returns a structured comparison + final pick rationale.

---

## 4. RecruitIQ AI Assistant (new)

Per `chat-agent-ui-contract`: **one conversation, no persistence** (recruiter ad-hoc questioning — keeps scope tight, no thread mgmt).

**Two surfaces**
- Per-job widget: collapsible side panel on `JobDetail.tsx`, scoped to that job's candidates.
- Global page: new route `/assistant` linked from `CompanyDashboard.tsx`, scoped to all jobs owned by the employer.

**Backend** — new `recruitiq-assistant` edge function:
- Uses AI SDK `streamText` with Lovable AI Gateway (`google/gemini-3-flash-preview`)
- System prompt receives a compact JSON snapshot of the employer's jobs + applicants + evaluations (server-built; never trusts client filter ids)
- Verifies JWT, scopes data to `auth.uid()` company
- Returns `toUIMessageStreamResponse`

**Frontend** — AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`) installed via `bun x ai-elements@latest add ...`. `useChat` + `DefaultChatTransport` pointed at the edge function URL. Assistant rendered with `MessageResponse` (markdown). Quick-prompt chips: "Top 3 candidates", "Who has React + 5y exp?", "Any red flags?".

---

## Files

**New**
- `supabase/functions/analyze-resume/index.ts`
- `supabase/functions/compare-candidates/index.ts`
- `supabase/functions/recruitiq-assistant/index.ts`
- `src/pages/CandidateCompare.tsx`
- `src/pages/RecruitIQAssistant.tsx`
- `src/components/RecruitIQPanel.tsx` (per-job widget)
- `src/components/ResumeIntelligencePanel.tsx`
- `src/components/RankingWeightsEditor.tsx`
- AI Elements files under `src/components/ai-elements/`

**Migrations**
- Add columns to `resumes` and `jobs` as listed above (+ GRANTs preserved)

**Edited**
- `src/App.tsx` — add `/jobs/:jobId/compare`, `/assistant` routes
- `src/pages/JobDetail.tsx` — checkboxes, compare button, resume intel panel, recruitiq widget, weighted score
- `src/pages/CreateJob.tsx` — weights editor + custom criteria
- `src/pages/CompanyDashboard.tsx` — link to global assistant
- `supabase/functions/evaluate-interview/index.ts` — emit custom-criteria scores
- `supabase/functions/build-resume/index.ts` — trigger `analyze-resume` after save (or call from client post-upload)

---

## Out of scope (call out so you can confirm)
- Salary expectations capture UI for candidates (we'll show "Not provided" until you ask for it).
- Persisting the assistant chat history across sessions.
- Bulk resume re-analysis for existing resumes (we'll only analyze new uploads; can add a backfill button later).

Reply **go** to build this, or tell me what to adjust (e.g. "add salary capture", "persist assistant chats", "skip weights editor").