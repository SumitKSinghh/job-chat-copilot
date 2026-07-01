import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Briefcase, LogOut, X, Plus, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RankingWeightsEditor, type Weights, type CustomCriterion } from "@/components/RankingWeightsEditor";
import { toast } from "sonner";

export default function CreateJob() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { jobId } = useParams<{ jobId: string }>();
  const isEdit = Boolean(jobId);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(isEdit);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState<"USD" | "INR">("USD");
  const [hideSalary, setHideSalary] = useState(false);
  const [education, setEducation] = useState("");
  const [additionalCriteria, setAdditionalCriteria] = useState("");
  const [additionalQualifications, setAdditionalQualifications] = useState("");
  const [interviewInstructions, setInterviewInstructions] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [weights, setWeights] = useState<Weights>({ resume: 40, interview: 40, experience: 10, skills: 10 });
  const [customCriteria, setCustomCriteria] = useState<CustomCriterion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([]);
  const [suggestingCriteria, setSuggestingCriteria] = useState(false);

  const addSkill = (raw?: string) => {
    const value = (raw ?? skillInput).trim();
    if (value && !skills.includes(value)) {
      setSkills([...skills, value]);
      if (!raw) setSkillInput("");
    }
    setSuggestedSkills((prev) => prev.filter((s) => s !== value));
  };

  const removeSkill = (s: string) => setSkills(skills.filter((sk) => sk !== s));

  const suggestSkills = async () => {
    if (!title.trim() && !description.trim()) {
      toast.error("Add a job title or description first");
      return;
    }
    setSuggesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-skills", {
        body: { title, description, experience, education },
      });
      if (error) throw error;
      const incoming: string[] = (data?.skills || []).filter(
        (s: string) => s && !skills.map((x) => x.toLowerCase()).includes(s.toLowerCase()),
      );
      if (!incoming.length) {
        toast.info("No new skills found — try adding more detail to the description");
      } else {
        setSuggestedSkills(incoming);
        toast.success(`Suggested ${incoming.length} skills`);
      }
    } catch (err: any) {
      toast.error(err.message || "Could not generate skills");
    } finally {
      setSuggesting(false);
    }
  };

  const suggestCriteria = async () => {
    if (!description.trim()) {
      toast.error("Add a job description first");
      return;
    }
    setSuggestingCriteria(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-criteria", {
        body: { title, description, experience, education, skills },
      });
      if (error) throw error;
      if (data?.additional_criteria) setAdditionalCriteria(data.additional_criteria);
      if (data?.additional_qualifications) setAdditionalQualifications(data.additional_qualifications);
      toast.success("AI recommendations added");
    } catch (err: any) {
      toast.error(err.message || "Could not generate recommendations");
    } finally {
      setSuggestingCriteria(false);
    }
  };

  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      const { data, error } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      if (error || !data) {
        toast.error("Could not load job");
        navigate("/company/dashboard");
        return;
      }
      setTitle(data.title || "");
      setDescription(data.description || "");
      setSkills(data.skills || []);
      setExperience(data.experience || "");
      setSalaryMin(data.salary_min?.toString() || "");
      setSalaryMax(data.salary_max?.toString() || "");
      setSalaryCurrency((data.salary_currency as "USD" | "INR") || "USD");
      setHideSalary(Boolean(data.hide_salary));
      setEducation(data.education || "");
      setAdditionalCriteria(data.additional_criteria || "");
      setAdditionalQualifications(data.additional_qualifications || "");
      setInterviewInstructions(data.interview_instructions || "");
      setCompanyName(data.company_name || "");
      if (data.ranking_weights) setWeights(data.ranking_weights as any);
      if (data.custom_criteria) setCustomCriteria(data.custom_criteria as any);
      setInitializing(false);
    })();
  }, [isEdit, jobId, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const payload = {
        title,
        description,
        skills,
        experience: experience || null,
        salary_min: salaryMin ? parseInt(salaryMin) : null,
        salary_max: salaryMax ? parseInt(salaryMax) : null,
        salary_currency: salaryCurrency,
        hide_salary: hideSalary,
        education: education || null,
        additional_criteria: additionalCriteria || null,
        additional_qualifications: additionalQualifications || null,
        interview_instructions: interviewInstructions || null,
        company_name: companyName || null,
        ranking_weights: weights as any,
        custom_criteria: customCriteria as any,
      };

      if (isEdit) {
        const { error } = await supabase.from("jobs").update(payload as any).eq("id", jobId!);
        if (error) throw error;
        toast.success("Job updated");
      } else {
        const { data: job, error } = await supabase
          .from("jobs")
          .insert({ created_by: user.id, ...payload } as any)
          .select()
          .single();
        if (error) throw error;
        // Generate questions via AI
        try {
          await supabase.functions.invoke("generate-questions", { body: { jobId: job.id } });
        } catch (aiErr) {
          console.error("AI question generation failed:", aiErr);
        }
        toast.success("Job posted successfully!");
      }
      navigate("/company/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to save job");
    } finally {
      setLoading(false);
    }
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/company/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>

        {initializing ? (
          <Card className="shadow-card"><CardContent className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent></Card>
        ) : (
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">{isEdit ? "Edit Job Posting" : "Create Job Posting"}</CardTitle>
            <CardDescription>{isEdit ? "Update the details for this role" : "Fill in the details and AI will generate interview questions"}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Job Title *</Label>
                  <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g. Senior React Developer" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Your company" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Job Description *</Label>
                <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required rows={5} placeholder="Describe the role, responsibilities, and requirements..." />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <Label>Required Skills</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={suggestSkills}
                    disabled={suggesting}
                    className="h-8 gap-1.5"
                  >
                    {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {suggesting ? "Thinking..." : "Suggest with AI"}
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add a skill" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                  <Button type="button" variant="outline" onClick={() => addSkill()}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map(s => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s} <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkill(s)} />
                    </Badge>
                  ))}
                </div>
                {suggestedSkills.length > 0 && (
                  <div className="mt-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        AI-suggested skills — click to add
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          suggestedSkills.forEach((s) => addSkill(s));
                          setSuggestedSkills([]);
                        }}
                        className="text-xs text-primary hover:underline"
                      >
                        Add all
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {suggestedSkills.map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => addSkill(s)}
                          className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-background border border-primary/30 hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Plus className="w-3 h-3" /> {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience Required</Label>
                  <Input id="experience" value={experience} onChange={(e) => setExperience(e.target.value)} placeholder="e.g. 3-5 years" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="education">Education</Label>
                  <Input id="education" value={education} onChange={(e) => setEducation(e.target.value)} placeholder="e.g. Bachelor's in CS" />
                </div>
              </div>

              <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <Label className="text-sm font-semibold">Salary</Label>
                  <div className="w-32">
                    <Select value={salaryCurrency} onValueChange={(v) => setSalaryCurrency(v as "USD" | "INR")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="INR">INR (₹)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="salaryMin">Min ({salaryCurrency === "INR" ? "₹" : "$"})</Label>
                    <Input id="salaryMin" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder={salaryCurrency === "INR" ? "e.g. 800000" : "e.g. 80000"} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="salaryMax">Max ({salaryCurrency === "INR" ? "₹" : "$"})</Label>
                    <Input id="salaryMax" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder={salaryCurrency === "INR" ? "e.g. 1500000" : "e.g. 120000"} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <Label htmlFor="hideSalary" className="text-sm">Hide salary from candidates</Label>
                    <p className="text-xs text-muted-foreground">Candidates won't see this range on the listing</p>
                  </div>
                  <Switch id="hideSalary" checked={hideSalary} onCheckedChange={setHideSalary} />
                </div>
              </div>

              <div className="flex items-center justify-between flex-wrap gap-2">
                <Label className="text-sm font-semibold">AI recommendations</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={suggestCriteria}
                  disabled={suggestingCriteria}
                  className="h-8 gap-1.5"
                >
                  {suggestingCriteria ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  {suggestingCriteria ? "Thinking..." : "Suggest criteria & qualifications"}
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="criteria">Additional Criteria</Label>
                <Textarea id="criteria" value={additionalCriteria} onChange={(e) => setAdditionalCriteria(e.target.value)} rows={4} placeholder="Any other requirements... (or use AI Suggest above)" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="qualifications">Additional Qualifications</Label>
                <Textarea id="qualifications" value={additionalQualifications} onChange={(e) => setAdditionalQualifications(e.target.value)} rows={4} placeholder="e.g. Certifications, language requirements, portfolio expectations... (or use AI Suggest above)" />
                <p className="text-xs text-muted-foreground">These will be considered during candidate evaluation</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="instructions">Interview Instructions</Label>
                <Textarea id="instructions" value={interviewInstructions} onChange={(e) => setInterviewInstructions(e.target.value)} rows={3} placeholder="e.g. Focus on system design, ask scenario-based questions about leadership, avoid coding puzzles, emphasize cultural fit..." />
                <p className="text-xs text-muted-foreground">Tell the AI how to conduct the interview for this role</p>
              </div>

              <RankingWeightsEditor
                weights={weights}
                customCriteria={customCriteria}
                onChange={(w, c) => { setWeights(w); setCustomCriteria(c); }}
              />


              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin mr-1" /> Creating...</> : "Post Job & Generate Questions"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
