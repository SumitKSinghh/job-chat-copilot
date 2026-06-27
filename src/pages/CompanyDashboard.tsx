import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Briefcase, Plus, Users, TrendingUp, LogOut, Eye, Sparkles,
  MapPin, DollarSign, GraduationCap, Clock, Search, ArrowUpRight, CheckCircle2,
} from "lucide-react";
import { Logo } from "@/components/Logo";

interface JobWithStats {
  id: string;
  title: string;
  status: string;
  created_at: string;
  description: string | null;
  skills: string[] | null;
  experience: string | null;
  education: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  company_name: string | null;
  applicant_count: number;
  interviewed_count: number;
  avg_score: number | null;
}

export default function CompanyDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalApplicants, setTotalApplicants] = useState(0);
  const [avgScore, setAvgScore] = useState<number | null>(null);
  const [recBreakdown, setRecBreakdown] = useState({ hire: 0, consider: 0, reject: 0 });

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, title, status, created_at, description, skills, experience, education, location, salary_min, salary_max, company_name")
      .eq("created_by", user!.id)
      .order("created_at", { ascending: false });

    if (jobsData) {
      const jobIds = jobsData.map((j) => j.id);
      const jobsWithStats: JobWithStats[] = [];
      let total = 0;

      // Per-job applicant + interview counts
      for (const job of jobsData) {
        const [{ count: appCount }, { data: jobApps }] = await Promise.all([
          supabase.from("applications").select("*", { count: "exact", head: true }).eq("job_id", job.id),
          supabase.from("applications").select("id").eq("job_id", job.id),
        ]);
        const ac = appCount || 0;
        total += ac;

        let interviewedCount = 0;
        let jobAvg: number | null = null;
        const jobAppIds = (jobApps || []).map((a) => a.id);
        if (jobAppIds.length) {
          const { data: ints } = await supabase
            .from("interviews").select("id, status").in("application_id", jobAppIds);
          interviewedCount = (ints || []).filter((i) => i.status === "completed").length;
          const intIds = (ints || []).map((i) => i.id);
          if (intIds.length) {
            const { data: evals } = await supabase
              .from("evaluations").select("overall_score").in("interview_id", intIds);
            const scored = (evals || []).filter((e) => e.overall_score != null);
            if (scored.length) jobAvg = Math.round(scored.reduce((s, e) => s + (e.overall_score || 0), 0) / scored.length);
          }
        }

        jobsWithStats.push({
          ...(job as any),
          applicant_count: ac,
          interviewed_count: interviewedCount,
          avg_score: jobAvg,
        });
      }

      // Aggregate evaluations across all this employer's jobs
      if (jobIds.length) {
        const { data: apps } = await supabase
          .from("applications")
          .select("id")
          .in("job_id", jobIds);
        const appIds = (apps || []).map((a) => a.id);
        if (appIds.length) {
          const { data: interviews } = await supabase
            .from("interviews").select("id").in("application_id", appIds);
          const intIds = (interviews || []).map((i) => i.id);
          if (intIds.length) {
            const { data: evals } = await supabase
              .from("evaluations").select("overall_score, recommendation").in("interview_id", intIds);
            if (evals?.length) {
              const scored = evals.filter((e) => e.overall_score != null);
              if (scored.length) setAvgScore(Math.round(scored.reduce((s, e) => s + (e.overall_score || 0), 0) / scored.length));
              const rb = { hire: 0, consider: 0, reject: 0 };
              evals.forEach((e) => { if (e.recommendation && e.recommendation in rb) (rb as any)[e.recommendation]++; });
              setRecBreakdown(rb);
            }
          }
        }
      }

      setJobs(jobsWithStats);
      setTotalApplicants(total);
    }
    setLoading(false);
  };

  const filteredJobs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((j) =>
      [j.title, j.description, j.location, j.company_name, ...(j.skills || [])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [jobs, search]);

  const fmtSalary = (job: JobWithStats) => {
    if (job.salary_min && job.salary_max) return `$${(job.salary_min / 1000).toFixed(0)}k–$${(job.salary_max / 1000).toFixed(0)}k`;
    if (job.salary_min) return `From $${(job.salary_min / 1000).toFixed(0)}k`;
    if (job.salary_max) return `Up to $${(job.salary_max / 1000).toFixed(0)}k`;
    return null;
  };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <span className="font-display font-bold text-lg text-foreground">RecruitIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/company/assistant")}>
              <Sparkles className="w-4 h-4 mr-1" /> AI Assistant
            </Button>
            <Button onClick={() => navigate("/company/create-job")}>
              <Plus className="w-4 h-4 mr-1" /> Post Job
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{jobs.length}</div>
                <div className="text-sm text-muted-foreground">Active Jobs</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-secondary/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{totalApplicants}</div>
                <div className="text-sm text-muted-foreground">Total Applicants</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">{avgScore ?? "—"}</div>
                <div className="text-sm text-muted-foreground">Avg. Match Score</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-sm text-muted-foreground mb-2">AI Recommendations</div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 rounded bg-success/10 text-success font-medium">Hire {recBreakdown.hire}</span>
                <span className="px-2 py-1 rounded bg-warning/10 text-warning font-medium">Consider {recBreakdown.consider}</span>
                <span className="px-2 py-1 rounded bg-destructive/10 text-destructive font-medium">Reject {recBreakdown.reject}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Jobs List */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-display font-semibold text-foreground">Your Job Postings</h2>
          <Button variant="outline" onClick={() => navigate("/company/create-job")}>
            <Plus className="w-4 h-4 mr-1" /> New Job
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Plus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No jobs posted yet</h3>
              <p className="text-muted-foreground mb-4">Create your first job posting to start receiving AI-screened candidates</p>
              <Button onClick={() => navigate("/company/create-job")}>Post Your First Job</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map(job => (
              <Card key={job.id} className="hover:shadow-card-hover transition-shadow cursor-pointer" onClick={() => navigate(`/company/job/${job.id}`)}>
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-lg font-semibold text-foreground">{job.applicant_count}</div>
                      <div className="text-xs text-muted-foreground">Applicants</div>
                    </div>
                    <Badge variant={job.status === "active" ? "default" : "secondary"}>
                      {job.status}
                    </Badge>
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
