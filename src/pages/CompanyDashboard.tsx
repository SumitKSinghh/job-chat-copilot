import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Plus, Users, TrendingUp, LogOut, Eye } from "lucide-react";
import { Logo } from "@/components/Logo";

interface JobWithStats {
  id: string;
  title: string;
  status: string;
  created_at: string;
  applicant_count: number;
  avg_score: number | null;
}

export default function CompanyDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalApplicants, setTotalApplicants] = useState(0);

  useEffect(() => {
    if (!user) return;
    fetchJobs();
  }, [user]);

  const fetchJobs = async () => {
    const { data: jobsData } = await supabase
      .from("jobs")
      .select("id, title, status, created_at")
      .eq("created_by", user!.id)
      .order("created_at", { ascending: false });

    if (jobsData) {
      const jobsWithStats: JobWithStats[] = [];
      let total = 0;
      for (const job of jobsData) {
        const { count } = await supabase
          .from("applications")
          .select("*", { count: "exact", head: true })
          .eq("job_id", job.id);

        const appCount = count || 0;
        total += appCount;

        jobsWithStats.push({
          ...job,
          applicant_count: appCount,
          avg_score: null,
        });
      }
      setJobs(jobsWithStats);
      setTotalApplicants(total);
    }
    setLoading(false);
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                <div className="text-2xl font-bold text-foreground">—</div>
                <div className="text-sm text-muted-foreground">Avg. Score</div>
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
