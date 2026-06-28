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
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  hide_salary: boolean | null;
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
      .select("id, title, status, created_at, description, skills, experience, education, salary_min, salary_max, company_name")
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
      [j.title, j.description, j.company_name, ...(j.skills || [])]
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


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-9 md:h-11" />
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
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Your Job Postings</h2>
            <p className="text-sm text-muted-foreground">Manage roles, review candidates, and track hiring progress.</p>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search jobs, skills..."
                className="pl-9 h-9"
              />
            </div>
            <Button variant="outline" onClick={() => navigate("/company/create-job")} className="h-9">
              <Plus className="w-4 h-4 mr-1" /> New
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-32 bg-muted rounded" /></CardContent></Card>
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
        ) : filteredJobs.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <h3 className="font-medium text-foreground mb-1">No jobs match "{search}"</h3>
              <p className="text-sm text-muted-foreground">Try a different search term.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredJobs.map(job => {
              const salary = fmtSalary(job);
              const visibleSkills = (job.skills || []).slice(0, 6);
              const moreSkills = (job.skills || []).length - visibleSkills.length;
              return (
                <Card
                  key={job.id}
                  className="group hover:shadow-card-hover hover:border-primary/30 transition-all cursor-pointer flex flex-col"
                  onClick={() => navigate(`/company/job/${job.id}`)}
                >
                  <CardContent className="p-6 flex flex-col gap-4 flex-1">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge
                            variant={job.status === "active" ? "default" : "secondary"}
                            className="capitalize"
                          >
                            {job.status === "active" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {job.status}
                          </Badge>
                          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(job.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="font-display font-semibold text-lg text-foreground truncate group-hover:text-primary transition-colors">
                          {job.title}
                        </h3>
                        {job.company_name && (
                          <p className="text-sm text-muted-foreground truncate">{job.company_name}</p>
                        )}
                      </div>
                      <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </div>

                    {/* Meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                      {salary && (
                        <span className="inline-flex items-center gap-1">
                          <DollarSign className="w-3.5 h-3.5" /> {salary}
                        </span>
                      )}
                      {job.experience && (
                        <span className="inline-flex items-center gap-1">
                          <Briefcase className="w-3.5 h-3.5" /> {job.experience}
                        </span>
                      )}
                      {job.education && (
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="w-3.5 h-3.5" /> {job.education}
                        </span>
                      )}
                    </div>

                    {/* Description */}
                    {job.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                    )}

                    {/* Skills */}
                    {visibleSkills.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {visibleSkills.map((s) => (
                          <Badge key={s} variant="outline" className="text-[11px] font-normal">{s}</Badge>
                        ))}
                        {moreSkills > 0 && (
                          <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">+{moreSkills} more</Badge>
                        )}
                      </div>
                    )}

                    {/* Stats footer */}
                    <div className="mt-auto pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="text-base font-semibold text-foreground inline-flex items-center gap-1 justify-center">
                          <Users className="w-3.5 h-3.5 text-muted-foreground" />
                          {job.applicant_count}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Applicants</div>
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground">{job.interviewed_count}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Interviewed</div>
                      </div>
                      <div>
                        <div className="text-base font-semibold text-foreground">{job.avg_score ?? "—"}</div>
                        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Score</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); navigate(`/company/job/${job.id}`); }}
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> View candidates
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); navigate(`/company/job/${job.id}?tab=insights`); }}
                      >
                        <TrendingUp className="w-3.5 h-3.5 mr-1" /> Insights
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
