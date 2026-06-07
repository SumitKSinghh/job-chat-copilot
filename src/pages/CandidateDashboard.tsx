import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, LogOut, CheckCircle, Clock, XCircle, Sparkles } from "lucide-react";

interface Application {
  id: string;
  status: string;
  created_at: string;
  job: {
    title: string;
    company_name: string | null;
  };
  interview?: {
    id: string;
    status: string;
    evaluation?: {
      overall_score: number | null;
      recommendation: string | null;
    };
  };
}

export default function CandidateDashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchApplications();
  }, [user]);

  const fetchApplications = async () => {
    const { data } = await supabase
      .from("applications")
      .select(`
        id, status, created_at,
        jobs!inner(title, company_name)
      `)
      .eq("candidate_id", user!.id)
      .order("created_at", { ascending: false });

    if (data) {
      const apps: Application[] = [];
      for (const app of data) {
        const { data: interviews } = await supabase
          .from("interviews")
          .select("id, status")
          .eq("application_id", app.id)
          .maybeSingle();

        let evaluation = undefined;
        if (interviews) {
          const { data: eval_ } = await supabase
            .from("evaluations")
            .select("overall_score, recommendation")
            .eq("interview_id", interviews.id)
            .maybeSingle();
          evaluation = eval_ || undefined;
        }

        const jobData = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
        apps.push({
          id: app.id,
          status: app.status,
          created_at: app.created_at,
          job: { title: jobData.title, company_name: jobData.company_name },
          interview: interviews ? { ...interviews, evaluation } : undefined,
        });
      }
      setApplications(apps);
    }
    setLoading(false);
  };

  const getStatusBadge = (app: Application) => {
    if (app.interview?.evaluation) {
      const rec = app.interview.evaluation.recommendation;
      if (rec === "hire") return <Badge className="bg-success text-success-foreground">Recommended</Badge>;
      if (rec === "consider") return <Badge className="bg-warning text-warning-foreground">Under Review</Badge>;
      return <Badge variant="destructive">Not Selected</Badge>;
    }
    if (app.interview?.status === "completed") return <Badge className="bg-info text-info-foreground">Evaluating</Badge>;
    if (app.interview?.status === "in_progress") return <Badge variant="secondary">Interview Pending</Badge>;
    return <Badge variant="outline">Applied</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-lg text-foreground">RecruitIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>Browse Jobs</Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/candidate/resume-builder")}>
              <Sparkles className="w-4 h-4 mr-1" /> AI Resume
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-display font-bold text-foreground mb-6">My Applications</h1>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse"><CardContent className="p-6"><div className="h-16 bg-muted rounded" /></CardContent></Card>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No applications yet</h3>
              <p className="text-muted-foreground mb-4">Start applying for jobs to see them here</p>
              <Button onClick={() => navigate("/")}>Browse Jobs</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {applications.map(app => (
              <Card key={app.id} className="hover:shadow-card-hover transition-shadow">
                <CardContent className="p-6 flex items-center justify-between">
                  <div>
                    <h3 className="font-display font-semibold text-foreground">{app.job.title}</h3>
                    <p className="text-sm text-muted-foreground">{app.job.company_name || "Company"}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Applied {new Date(app.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(app)}
                    {app.interview?.status === "in_progress" && (
                      <Button size="sm" onClick={() => navigate(`/interview/${app.interview!.id}`)}>
                        Continue Interview
                      </Button>
                    )}
                    {app.interview?.evaluation && (
                      <div className="text-right">
                        <div className="text-2xl font-bold text-primary">
                          {app.interview.evaluation.overall_score}
                        </div>
                        <div className="text-xs text-muted-foreground">Score</div>
                      </div>
                    )}
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
