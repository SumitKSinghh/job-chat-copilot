import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, ArrowLeft, LogOut, User, ChevronDown, ChevronUp, Ban } from "lucide-react";
import { toast } from "sonner";

interface Candidate {
  application_id: string;
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
}

interface QA {
  question: string;
  answer: string;
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

  useEffect(() => {
    if (jobId) fetchData();
  }, [jobId]);

  const fetchData = async () => {
    const { data: jobData } = await supabase.from("jobs").select("*").eq("id", jobId!).single();
    setJob(jobData);

    const { data: apps } = await supabase
      .from("applications")
      .select("id, status, candidate_id")
      .eq("job_id", jobId!);

    if (apps) {
      const candidateList: Candidate[] = [];
      for (const app of apps) {
        const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", app.candidate_id).maybeSingle();
        const { data: interview } = await supabase
          .from("interviews")
          .select("id, status")
          .eq("application_id", app.id)
          .maybeSingle();

        let evaluation = null;
        if (interview) {
          const { data: eval_ } = await supabase
            .from("evaluations")
            .select("*")
            .eq("interview_id", interview.id)
            .maybeSingle();
          evaluation = eval_;
        }

        candidateList.push({
          application_id: app.id,
          candidate_name: profile?.full_name || "Unknown",
          candidate_email: profile?.email || "",
          status: app.status,
          interview_id: interview?.id || null,
          interview_status: interview?.status || null,
          overall_score: evaluation?.overall_score || null,
          communication_score: evaluation?.communication_score || null,
          skill_score: evaluation?.skill_score || null,
          recommendation: evaluation?.recommendation || null,
          strengths: evaluation?.strengths || null,
          weaknesses: evaluation?.weaknesses || null,
          detailed_feedback: evaluation?.detailed_feedback || null,
        });
      }
      candidateList.sort((a, b) => (b.overall_score || 0) - (a.overall_score || 0));
      setCandidates(candidateList);
    }
    setLoading(false);
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
    if (expandedCandidate === appId) {
      setExpandedCandidate(null);
    } else {
      setExpandedCandidate(appId);
      if (interviewId) loadQA(interviewId);
    }
  };

  const getRecBadge = (rec: string | null) => {
    if (rec === "hire") return <Badge className="bg-success text-success-foreground">Hire</Badge>;
    if (rec === "consider") return <Badge className="bg-warning text-warning-foreground">Consider</Badge>;
    if (rec === "reject") return <Badge variant="destructive">Reject</Badge>;
    return <Badge variant="outline">Pending</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">HireAI</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate("/company/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>

        {job && (
          <div className="mb-8">
            <h1 className="text-2xl font-display font-bold text-foreground">{job.title}</h1>
            <p className="text-muted-foreground mt-1">{job.company_name}</p>
          </div>
        )}

        <h2 className="text-lg font-display font-semibold text-foreground mb-4">
          Candidates ({candidates.length})
        </h2>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-20 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <User className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No candidates have applied yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {candidates.map(c => (
              <Card key={c.application_id} className="overflow-hidden">
                <CardContent
                  className="p-6 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => toggleCandidate(c.application_id, c.interview_id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{c.candidate_name}</h3>
                        <p className="text-sm text-muted-foreground">{c.candidate_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {c.overall_score !== null && (
                        <div className="text-right">
                          <div className="text-2xl font-bold text-primary">{c.overall_score}</div>
                          <div className="text-xs text-muted-foreground">Score</div>
                        </div>
                      )}
                      {getRecBadge(c.recommendation)}
                      {expandedCandidate === c.application_id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </div>
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

                    {c.strengths && c.strengths.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">Strengths</h4>
                        <div className="flex flex-wrap gap-2">
                          {c.strengths.map((s, i) => <Badge key={i} variant="secondary">{s}</Badge>)}
                        </div>
                      </div>
                    )}

                    {c.weaknesses && c.weaknesses.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">Areas for Improvement</h4>
                        <div className="flex flex-wrap gap-2">
                          {c.weaknesses.map((w, i) => <Badge key={i} variant="outline">{w}</Badge>)}
                        </div>
                      </div>
                    )}

                    {c.detailed_feedback && (
                      <div className="mb-4">
                        <h4 className="text-sm font-semibold text-foreground mb-2">AI Feedback</h4>
                        <p className="text-sm text-muted-foreground">{c.detailed_feedback}</p>
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
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
