import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, LogOut, User, ChevronDown, ChevronUp, Ban, Star, FileText, Users, CheckCircle2, TrendingUp, Sparkles, GitCompare } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ResumeIntelligencePanel } from "@/components/ResumeIntelligencePanel";
import { RecruitIQChat } from "@/components/RecruitIQChat";
import { toast } from "sonner";

interface ResumeInfo {
  id: string;
  original_text: string;
  generated_markdown: string;
  extracted_skills: string[] | null;
  parsed_experience?: any[] | null;
  parsed_education?: any[] | null;
  parsed_certifications?: string[] | null;
  total_experience_years?: number | null;
  gaps?: any[] | null;
  hiring_risks?: string[] | null;
  match_breakdown?: any | null;
  analysis_status?: string | null;
}

interface Candidate {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email: string;
  status: string;
  rejection_reason: string | null;
  interview_id: string | null;
  interview_status: string | null;
  overall_score: number | null;
  communication_score: number | null;
  skill_score: number | null;
  recommendation: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  detailed_feedback: string | null;
  resume: ResumeInfo | null;
  weighted_score: number | null;
}

interface QA { question: string; answer: string; }

// Simple skills extractor: intersect job's required skills with resume text
function extractSkills(resumeText: string, jobSkills: string[] | null): string[] {
  if (!resumeText || !jobSkills?.length) return [];
  const lower = resumeText.toLowerCase();
  return jobSkills.filter((s) => lower.includes(s.toLowerCase()));
}

function pipelineStage(c: Candidate): "applied" | "interview_completed" | "shortlisted" | "rejected" {
  if (c.status === "rejected") return "rejected";
  if (c.status === "shortlisted") return "shortlisted";
  if (c.interview_status === "completed") return "interview_completed";
  return "applied";
}

export default function JobDetail() {
  const { jobId } = useParams<{ jobId: string }>();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<any>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [qaData, setQaData] = useState<Record<string, QA[]>>({});
  const [rejectTarget, setRejectTarget] = useState<Candidate | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [resumePreview, setResumePreview] = useState<ResumeInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showChat, setShowChat] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else if (n.size < 4) n.add(id);
      else toast.error("Compare up to 4 candidates at a time");
      return n;
    });
  };

  const goCompare = () => {
    if (selectedIds.size < 2) return toast.error("Select at least 2 candidates");
    navigate(`/company/job/${jobId}/compare?ids=${Array.from(selectedIds).join(",")}`);
  };

  useEffect(() => { if (jobId) fetchData(); }, [jobId]);

  const fetchData = async () => {
    const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId!).single();
    setJob(jobData);

    const { data: apps } = await supabase
      .from("applications")
      .select("id, status, candidate_id, rejection_reason")
      .eq("job_id", jobId!);

    if (apps) {
      const candidateList: Candidate[] = [];
      for (const app of apps) {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", app.candidate_id).maybeSingle();
        const { data: interview } = await supabase
          .from("interviews").select("id, status").eq("application_id", app.id).maybeSingle();

        let evaluation: any = null;
        if (interview) {
          const { data } = await supabase.from("evaluations").select("*").eq("interview_id", interview.id).maybeSingle();
          evaluation = data;
        }

        const { data: resume } = await supabase
          .from("resumes")
          .select("*")
          .eq("candidate_id", app.candidate_id)
          .eq("job_id", jobId!)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        let resumeInfo: ResumeInfo | null = null;
        if (resume) {
          const r: any = resume;
          const skills = r.extracted_skills?.length
            ? r.extracted_skills
            : extractSkills(r.original_text || "", jobData?.skills || []);
          resumeInfo = { ...r, extracted_skills: skills };
        }

        const w = (jobData as any)?.ranking_weights || { resume: 40, interview: 40, experience: 10, skills: 10 };
        const wTotal = (w.resume || 0) + (w.interview || 0) + (w.experience || 0) + (w.skills || 0) || 100;
        const resumeScore = (resumeInfo as any)?.match_breakdown?.overall ?? 0;
        const interviewScore = evaluation?.overall_score ?? 0;
        const expScore = Math.min(100, ((resumeInfo as any)?.total_experience_years || 0) * 10);
        const skillsScore = (resumeInfo as any)?.match_breakdown?.skills_match
          ?? (resumeInfo?.extracted_skills?.length && jobData?.skills?.length
              ? Math.round((resumeInfo.extracted_skills.length / jobData.skills.length) * 100)
              : 0);
        const weighted = Math.round(
          (resumeScore * w.resume + interviewScore * w.interview + expScore * w.experience + skillsScore * w.skills) / wTotal,
        );

        candidateList.push({
          application_id: app.id,
          candidate_id: app.candidate_id,
          candidate_name: profile?.full_name || "Unknown",
          candidate_email: profile?.email || "",
          status: app.status,
          rejection_reason: app.rejection_reason || null,
          interview_id: interview?.id || null,
          interview_status: interview?.status || null,
          overall_score: evaluation?.overall_score ?? null,
          communication_score: evaluation?.communication_score ?? null,
          skill_score: evaluation?.skill_score ?? null,
          recommendation: evaluation?.recommendation ?? null,
          strengths: evaluation?.strengths ?? null,
          weaknesses: evaluation?.weaknesses ?? null,
          detailed_feedback: evaluation?.detailed_feedback ?? null,
          resume: resumeInfo,
          weighted_score: weighted || null,
        });
      }
      candidateList.sort((a, b) => (b.weighted_score || b.overall_score || 0) - (a.weighted_score || a.overall_score || 0));
      setCandidates(candidateList);
    }
    setLoading(false);
  };

  const analytics = useMemo(() => {
    const total = candidates.length;
    const completed = candidates.filter((c) => c.interview_status === "completed").length;
    const scored = candidates.filter((c) => c.overall_score !== null);
    const avg = scored.length ? Math.round(scored.reduce((s, c) => s + (c.overall_score || 0), 0) / scored.length) : 0;
    const recs = { hire: 0, consider: 0, reject: 0 };
    candidates.forEach((c) => { if (c.recommendation && c.recommendation in recs) (recs as any)[c.recommendation]++; });
    const stages = { applied: 0, interview_completed: 0, shortlisted: 0, rejected: 0 };
    candidates.forEach((c) => { stages[pipelineStage(c)]++; });
    return { total, completed, avg, recs, stages };
  }, [candidates]);

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) { toast.error("Please provide a reason"); return; }
    setRejecting(true);
    const { error } = await supabase
      .from("applications")
      .update({ status: "rejected", rejection_reason: rejectReason.trim() })
      .eq("id", rejectTarget.application_id);
    setRejecting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Application rejected");
    setRejectTarget(null); setRejectReason(""); fetchData();
  };

  const handleShortlist = async (c: Candidate) => {
    const { error } = await supabase
      .from("applications")
      .update({ status: "shortlisted", rejection_reason: null })
      .eq("id", c.application_id);
    if (error) { toast.error(error.message); return; }
    toast.success(`${c.candidate_name} shortlisted`);
    fetchData();
  };

  const loadQA = async (interviewId: string) => {
    if (qaData[interviewId]) return;
    const { data } = await supabase
      .from("responses")
      .select("answer_text, questions!inner(question_text)")
      .eq("interview_id", interviewId);
    if (data) {
      const qa: QA[] = data.map((r: any) => ({
        question: Array.isArray(r.questions) ? r.questions[0].question_text : r.questions.question_text,
        answer: r.answer_text,
      }));
      setQaData((prev) => ({ ...prev, [interviewId]: qa }));
    }
  };

  const toggleCandidate = (appId: string, interviewId: string | null) => {
    if (expandedCandidate === appId) setExpandedCandidate(null);
    else { setExpandedCandidate(appId); if (interviewId) loadQA(interviewId); }
  };

  const getRecBadge = (rec: string | null) => {
    if (rec === "hire") return <Badge className="bg-success text-success-foreground">Hire</Badge>;
    if (rec === "consider") return <Badge className="bg-warning text-warning-foreground">Consider</Badge>;
    if (rec === "reject") return <Badge variant="destructive">Reject</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  const renderCandidateCard = (c: Candidate) => (
    <Card key={c.application_id} className="overflow-hidden">
      <CardContent
        className="p-6 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => toggleCandidate(c.application_id, c.interview_id)}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{c.candidate_name}</h3>
              <p className="text-sm text-muted-foreground">{c.candidate_email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {c.overall_score !== null && (
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{c.overall_score}</div>
                <div className="text-xs text-muted-foreground">Match score</div>
              </div>
            )}
            {c.status === "rejected" ? <Badge variant="destructive">Rejected</Badge>
              : c.status === "shortlisted" ? <Badge className="bg-success text-success-foreground">Shortlisted</Badge>
              : getRecBadge(c.recommendation)}
            {c.resume && (
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setResumePreview(c.resume); }}>
                <FileText className="w-3.5 h-3.5 mr-1" /> Resume
              </Button>
            )}
            {c.status !== "rejected" && c.status !== "shortlisted" && (
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); handleShortlist(c); }}>
                <Star className="w-3.5 h-3.5 mr-1" /> Shortlist
              </Button>
            )}
            {c.status !== "rejected" && (
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); setRejectTarget(c); setRejectReason(""); }}>
                <Ban className="w-3.5 h-3.5 mr-1" /> Reject
              </Button>
            )}
            {expandedCandidate === c.application_id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </div>
        </div>
        {c.status === "rejected" && c.rejection_reason && (
          <p className="text-xs text-destructive mt-3 pl-14">Reason: {c.rejection_reason}</p>
        )}
      </CardContent>

      {expandedCandidate === c.application_id && (
        <div className="border-t border-border p-6 bg-muted/10 animate-fade-in">
          {c.overall_score !== null && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Overall</p>
                <Progress value={c.overall_score || 0} className="h-2" />
                <p className="text-sm font-semibold text-foreground mt-1">{c.overall_score}/100</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Communication</p>
                <Progress value={c.communication_score || 0} className="h-2" />
                <p className="text-sm font-semibold text-foreground mt-1">{c.communication_score}/100</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Skills</p>
                <Progress value={c.skill_score || 0} className="h-2" />
                <p className="text-sm font-semibold text-foreground mt-1">{c.skill_score}/100</p>
              </div>
            </div>
          )}

          {c.resume?.extracted_skills && c.resume.extracted_skills.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-foreground mb-2">Extracted Skills (matched to job)</h4>
              <div className="flex flex-wrap gap-2">
                {c.resume.extracted_skills.map((s, i) => (
                  <Badge key={i} className="bg-primary/10 text-primary border-primary/30" variant="outline">{s}</Badge>
                ))}
              </div>
            </div>
          )}

          {(c.strengths?.length || c.weaknesses?.length || c.detailed_feedback) && (
            <div className="mb-4 p-4 rounded-lg border border-border bg-card">
              <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> AI Candidate Summary
              </h4>
              {c.strengths && c.strengths.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Strengths</p>
                  <div className="flex flex-wrap gap-2">
                    {c.strengths.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
                  </div>
                </div>
              )}
              {c.weaknesses && c.weaknesses.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Concerns</p>
                  <div className="flex flex-wrap gap-2">
                    {c.weaknesses.map((w, i) => <Badge key={i} variant="outline">{w}</Badge>)}
                  </div>
                </div>
              )}
              {c.detailed_feedback && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Recommendation</p>
                  <p className="text-sm text-foreground">{c.detailed_feedback}</p>
                </div>
              )}
            </div>
          )}

          {c.interview_id && qaData[c.interview_id] && (
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-3">Interview Transcript</h4>
              <div className="space-y-4">
                {qaData[c.interview_id].map((qa, i) => (
                  <div key={i} className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Q: {qa.question}</p>
                    <p className="text-sm text-muted-foreground pl-4 border-l-2 border-primary/20">{qa.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );

  const stages: Array<{ key: keyof typeof analytics.stages; label: string }> = [
    { key: "applied", label: "Applied" },
    { key: "interview_completed", label: "Interview Completed" },
    { key: "shortlisted", label: "Shortlisted" },
    { key: "rejected", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <span className="font-display font-bold text-lg text-foreground">RecruitIQ</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Button variant="ghost" onClick={() => navigate("/company/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>

        {job && (
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-foreground">{job.title}</h1>
            <p className="text-muted-foreground mt-1">{job.company_name}</p>
          </div>
        )}

        {/* Analytics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <Card><CardContent className="p-4 flex items-center gap-3">
            <Users className="w-5 h-5 text-primary" />
            <div><div className="text-xl font-bold">{analytics.total}</div><div className="text-xs text-muted-foreground">Total Applicants</div></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-secondary" />
            <div><div className="text-xl font-bold">{analytics.completed}</div><div className="text-xs text-muted-foreground">Interviews Done</div></div>
          </CardContent></Card>
          <Card><CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-accent" />
            <div><div className="text-xl font-bold">{analytics.avg || "—"}</div><div className="text-xs text-muted-foreground">Avg. Score</div></div>
          </CardContent></Card>
          <Card><CardContent className="p-4">
            <div className="text-xs text-muted-foreground mb-2">Recommendations</div>
            <div className="flex gap-2 text-xs">
              <span className="px-2 py-0.5 rounded bg-success/10 text-success">Hire {analytics.recs.hire}</span>
              <span className="px-2 py-0.5 rounded bg-warning/10 text-warning">Consider {analytics.recs.consider}</span>
              <span className="px-2 py-0.5 rounded bg-destructive/10 text-destructive">Reject {analytics.recs.reject}</span>
            </div>
          </CardContent></Card>
        </div>

        {/* Pipeline tabs */}
        <Tabs defaultValue="all" className="mb-4">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="all">All ({analytics.total})</TabsTrigger>
            {stages.map((s) => (
              <TabsTrigger key={s.key} value={s.key}>{s.label} ({analytics.stages[s.key]})</TabsTrigger>
            ))}
          </TabsList>

          {loading ? (
            <div className="space-y-4 mt-4">
              {[1, 2].map(i => <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>)}
            </div>
          ) : candidates.length === 0 ? (
            <Card className="text-center py-12 mt-4"><CardContent>
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No candidates have applied yet</p>
            </CardContent></Card>
          ) : (
            <>
              <TabsContent value="all" className="space-y-4 mt-4">
                {candidates.map(renderCandidateCard)}
              </TabsContent>
              {stages.map((s) => (
                <TabsContent key={s.key} value={s.key} className="space-y-4 mt-4">
                  {candidates.filter((c) => pipelineStage(c) === s.key).map(renderCandidateCard)}
                  {candidates.filter((c) => pipelineStage(c) === s.key).length === 0 && (
                    <Card className="text-center py-8"><CardContent><p className="text-sm text-muted-foreground">No candidates in this stage</p></CardContent></Card>
                  )}
                </TabsContent>
              ))}
            </>
          )}
        </Tabs>
      </main>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Application</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting {rejectTarget?.candidate_name}. This will be recorded with the application.
            </DialogDescription>
          </DialogHeader>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. Insufficient experience..." rows={4} maxLength={500} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)} disabled={rejecting}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting || !rejectReason.trim()}>
              {rejecting ? "Rejecting..." : "Confirm Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resume preview dialog */}
      <Dialog open={!!resumePreview} onOpenChange={(o) => !o && setResumePreview(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Candidate Resume</DialogTitle>
            <DialogDescription>Uploaded resume content with skills extracted against this job's requirements.</DialogDescription>
          </DialogHeader>
          {resumePreview && (
            <div className="space-y-4">
              {resumePreview.extracted_skills && resumePreview.extracted_skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Extracted Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {resumePreview.extracted_skills.map((s, i) => (
                      <Badge key={i} className="bg-primary/10 text-primary border-primary/30" variant="outline">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h4 className="text-sm font-semibold mb-2">AI-Optimized Resume</h4>
                <pre className="text-xs bg-muted/40 p-4 rounded-md whitespace-pre-wrap font-sans border border-border">{resumePreview.generated_markdown}</pre>
              </div>
              <div>
                <h4 className="text-sm font-semibold mb-2">Original Uploaded Resume</h4>
                <pre className="text-xs bg-muted/40 p-4 rounded-md whitespace-pre-wrap font-sans border border-border">{resumePreview.original_text}</pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
