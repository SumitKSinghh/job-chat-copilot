import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, LogOut, Sparkles, Loader2, Trophy } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Comparison {
  top_pick_name: string;
  rationale: string;
  per_candidate: Array<{ name: string; key_strengths: string[]; key_concerns: string[]; verdict: string }>;
  summary_markdown: string;
}

export default function CandidateCompare() {
  const { jobId } = useParams<{ jobId: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!jobId || ids.length < 2) { setLoading(false); return; }
      try {
        const { data, error } = await supabase.functions.invoke("compare-candidates", {
          body: { jobId, applicationIds: ids },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        setComparison(data.comparison);
        setCandidates(data.candidates || []);
      } catch (e: any) {
        toast.error(e.message || "Comparison failed");
      } finally {
        setLoading(false);
      }
    })();
  }, [jobId, ids.join(",")]);

  const verdictBadge = (v: string) => {
    if (v === "hire") return <Badge className="bg-success text-success-foreground">Hire</Badge>;
    if (v === "consider") return <Badge className="bg-warning text-warning-foreground">Consider</Badge>;
    return <Badge variant="destructive">Reject</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-9 md:h-11" />
            <span className="font-display font-bold text-lg text-foreground">RecruitIQ</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Button variant="ghost" onClick={() => navigate(`/company/job/${jobId}`)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to job
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Candidate Comparison
          </h1>
          <p className="text-muted-foreground mt-1">Side-by-side analysis powered by RecruitIQ AI.</p>
        </div>

        {ids.length < 2 && (
          <Card><CardContent className="p-8 text-center text-muted-foreground">Select at least 2 candidates from the job page to compare.</CardContent></Card>
        )}

        {loading && (
          <Card><CardContent className="p-8 text-center text-muted-foreground flex flex-col items-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" /> Comparing candidates...
          </CardContent></Card>
        )}

        {!loading && comparison && (
          <>
            <Card className="mb-6 border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Trophy className="w-5 h-5 text-primary mt-0.5" />
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Top pick</div>
                    <div className="text-lg font-semibold text-foreground">{comparison.top_pick_name}</div>
                    <p className="text-sm text-foreground mt-1">{comparison.rationale}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6 overflow-x-auto">
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left">
                    <tr>
                      <th className="p-3 sticky left-0 bg-muted/40">Attribute</th>
                      {candidates.map((c) => (
                        <th key={c.application_id} className="p-3 font-semibold">{c.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label: "Interview score", val: (c: any) => c.evaluation?.overall_score ? `${c.evaluation.overall_score}/100` : "—" },
                      { label: "AI recommendation", val: (c: any) => c.evaluation?.recommendation || "—" },
                      { label: "Match (overall)", val: (c: any) => c.resume?.match_breakdown?.overall ? `${c.resume.match_breakdown.overall}/100` : "—" },
                      { label: "Skills match", val: (c: any) => c.resume?.match_breakdown?.skills_match ? `${c.resume.match_breakdown.skills_match}/100` : "—" },
                      { label: "Experience", val: (c: any) => c.resume?.total_experience_years ? `${c.resume.total_experience_years}y` : "—" },
                      { label: "Skills", val: (c: any) => (c.resume?.extracted_skills || []).slice(0, 6).join(", ") || "—" },
                      { label: "Certifications", val: (c: any) => (c.resume?.parsed_certifications || []).join(", ") || "—" },
                      { label: "Strengths", val: (c: any) => (c.evaluation?.strengths || []).join("; ") || "—" },
                      { label: "Concerns", val: (c: any) => (c.evaluation?.weaknesses || []).join("; ") || "—" },
                      { label: "Hiring risks", val: (c: any) => (c.resume?.hiring_risks || []).join("; ") || "—" },
                      { label: "Salary expectation", val: () => "Not provided" },
                    ].map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-3 font-medium text-muted-foreground sticky left-0 bg-card">{row.label}</td>
                        {candidates.map((c) => (
                          <td key={c.application_id} className="p-3 align-top">{row.val(c)}</td>
                        ))}
                      </tr>
                    ))}
                    <tr className="border-t border-border bg-muted/20">
                      <td className="p-3 font-medium text-muted-foreground sticky left-0 bg-muted/20">AI verdict</td>
                      {candidates.map((c) => {
                        const pc = comparison.per_candidate.find((p) => p.name === c.name);
                        return <td key={c.application_id} className="p-3">{pc ? verdictBadge(pc.verdict) : "—"}</td>;
                      })}
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" /> AI Comparison Summary
                </h3>
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{comparison.summary_markdown}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
