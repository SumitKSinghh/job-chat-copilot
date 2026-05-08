import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, LogOut, X, Plus, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function CreateJob() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experience, setExperience] = useState("");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [education, setEducation] = useState("");
  const [additionalCriteria, setAdditionalCriteria] = useState("");
  const [additionalQualifications, setAdditionalQualifications] = useState("");
  const [interviewInstructions, setInterviewInstructions] = useState("");
  const [companyName, setCompanyName] = useState("");

  const addSkill = () => {
    if (skillInput.trim() && !skills.includes(skillInput.trim())) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput("");
    }
  };

  const removeSkill = (s: string) => setSkills(skills.filter((sk) => sk !== s));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);

    try {
      const { data: job, error } = await supabase
        .from("jobs")
        .insert({
          created_by: user.id,
          title,
          description,
          skills,
          experience: experience || null,
          salary_min: salaryMin ? parseInt(salaryMin) : null,
          salary_max: salaryMax ? parseInt(salaryMax) : null,
          education: education || null,
          additional_criteria: additionalCriteria || null,
          company_name: companyName || null,
        })
        .select()
        .single();

      if (error) throw error;

      // Generate questions via AI
      try {
        await supabase.functions.invoke("generate-questions", {
          body: { jobId: job.id },
        });
      } catch (aiErr) {
        console.error("AI question generation failed:", aiErr);
      }

      toast.success("Job posted successfully!");
      navigate("/company/dashboard");
    } catch (err: any) {
      toast.error(err.message || "Failed to create job");
    } finally {
      setLoading(false);
    }
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

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate("/company/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Dashboard
        </Button>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="font-display">Create Job Posting</CardTitle>
            <CardDescription>Fill in the details and AI will generate interview questions</CardDescription>
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
                <Label>Required Skills</Label>
                <div className="flex gap-2">
                  <Input value={skillInput} onChange={(e) => setSkillInput(e.target.value)} placeholder="Add a skill" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                  <Button type="button" variant="outline" onClick={addSkill}><Plus className="w-4 h-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {skills.map(s => (
                    <Badge key={s} variant="secondary" className="gap-1">
                      {s} <X className="w-3 h-3 cursor-pointer" onClick={() => removeSkill(s)} />
                    </Badge>
                  ))}
                </div>
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="salaryMin">Salary Min ($)</Label>
                  <Input id="salaryMin" type="number" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="e.g. 80000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="salaryMax">Salary Max ($)</Label>
                  <Input id="salaryMax" type="number" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="e.g. 120000" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="criteria">Additional Criteria</Label>
                <Textarea id="criteria" value={additionalCriteria} onChange={(e) => setAdditionalCriteria(e.target.value)} rows={2} placeholder="Any other requirements..." />
              </div>

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
