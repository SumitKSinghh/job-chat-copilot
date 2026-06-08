import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, DollarSign, Clock, Search, LogOut, User, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Job {
  id: string;
  title: string;
  description: string;
  skills: string[];
  experience: string | null;
  salary_min: number | null;
  salary_max: number | null;
  company_name: string | null;
  created_at: string;
}

export default function CandidateHome() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [appliedJobs, setAppliedJobs] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchJobs();
    if (user) fetchAppliedJobs();
  }, [user]);

  const fetchJobs = async () => {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (data) setJobs(data);
    setLoading(false);
  };

  const fetchAppliedJobs = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("applications")
      .select("job_id")
      .eq("candidate_id", user.id);
    if (data) setAppliedJobs(new Set(data.map((a) => a.job_id)));
  };

  const handleApply = async (jobId: string) => {
    if (!user) return navigate("/auth");
    try {
      const { data: app, error } = await supabase
        .from("applications")
        .insert({ job_id: jobId, candidate_id: user.id })
        .select()
        .single();
      if (error) throw error;

      // Create interview
      const { data: interview, error: intErr } = await supabase
        .from("interviews")
        .insert({ application_id: app.id })
        .select()
        .single();
      if (intErr) throw intErr;

      toast.success("Application submitted! Starting interview...");
      navigate(`/interview/${interview.id}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to apply");
    }
  };

  const filteredJobs = jobs.filter(
    (j) =>
      j.title.toLowerCase().includes(search.toLowerCase()) ||
      j.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      j.skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo size={36} />
            <span className="font-display font-bold text-lg text-foreground">RecruitIQ</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/candidate/resume-builder")}>
              <Sparkles className="w-4 h-4 mr-1" /> AI Resume
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/candidate/dashboard")}>
              <User className="w-4 h-4 mr-1" /> Dashboard
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="gradient-hero py-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl font-display font-bold text-primary-foreground mb-4">
            Find Your Dream Job
          </h1>
          <p className="text-primary-foreground/70 text-lg mb-8 max-w-xl mx-auto">
            Browse opportunities and take AI-powered interviews from the comfort of your home
          </p>
          <div className="max-w-lg mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search jobs, skills, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-12 text-base bg-card border-border"
            />
          </div>
        </div>
      </section>

      {/* Job Listings */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-display font-semibold text-foreground">
            {filteredJobs.length} Open Position{filteredJobs.length !== 1 ? "s" : ""}
          </h2>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6 space-y-3">
                  <div className="h-5 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-20 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
              <p className="text-muted-foreground">Check back later for new opportunities</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredJobs.map((job) => (
              <Card key={job.id} className="hover:shadow-card-hover transition-shadow group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-display group-hover:text-primary transition-colors">
                        {job.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building2Icon className="w-3.5 h-3.5" />
                        {job.company_name || "Company"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {job.skills?.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {job.experience && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {job.experience}
                      </span>
                    )}
                    {(job.salary_min || job.salary_max) && (
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-3 h-3" />
                        {job.salary_min && job.salary_max
                          ? `$${(job.salary_min / 1000).toFixed(0)}k - $${(job.salary_max / 1000).toFixed(0)}k`
                          : job.salary_min
                          ? `From $${(job.salary_min / 1000).toFixed(0)}k`
                          : `Up to $${((job.salary_max || 0) / 1000).toFixed(0)}k`}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {appliedJobs.has(job.id) ? (
                      <Button variant="secondary" className="flex-1" disabled>
                        Already Applied
                      </Button>
                    ) : (
                      <Button className="flex-1" onClick={() => handleApply(job.id)}>
                        Apply Now
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      title="Build AI-tailored resume for this job"
                      onClick={() => navigate(`/candidate/resume-builder?job=${job.id}`)}
                    >
                      <Sparkles className="w-4 h-4" />
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

function Building2Icon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
    </svg>
  );
}
