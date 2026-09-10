import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft, Upload, FileText, X, Sparkles, Trophy, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";

interface ParsedResume {
  name: string;
  text: string;
}

interface ScreenedCandidate {
  id: number;
  rank: number;
  name: string;
  file_name: string;
  match_score: number;
  skills_match: number;
  experience_match: number;
  education_match: number;
  total_experience_years?: number;
  top_skills: string[];
  missing_skills: string[];
  strengths: string[];
  concerns: string[];
  summary: string;
  shortlisted: boolean;
}

export default function BulkScreening() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [jobs, setJobs] = useState<{ id: string; title: string; description: string | null; skills: string[] | null }[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>("manual");
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [shortlistCount, setShortlistCount] = useState(3);

  const [resumes, setResumes] = useState<ParsedResume[]>([]);
  const [parsing, setParsing] = useState(false);
  const [screening, setScreening] = useState(false);
  const [results, setResults] = useState<ScreenedCandidate[] | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("jobs")
        .select("id, title, description, skills")
        .eq("created_by", data.user.id)
        .order("created_at", { ascending: false })
        .then(({ data: rows }) => rows && setJobs(rows as any));
    });
  }, []);

  const pickJob = (id: string) => {
    setSelectedJobId(id);
    if (id === "manual") return;
    const job = jobs.find((j) => j.id === id);
    if (job) {
      setJobTitle(job.title);
      setJobDescription(job.description || "");
    }
  };

  const extractText = async (file: File): Promise<string> => {
    if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
      const pdfjs: any = await import("pdfjs-dist");
      const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
      const buf = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: buf }).promise;
      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += content.items.map((it: any) => it.str).join(" ") + "\n\n";
      }
      return text.trim();
    }
    return (await file.text()).trim();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setParsing(true);
    const parsed: ParsedResume[] = [];
    const failed: string[] = [];
    for (const file of Array.from(files).slice(0, 40)) {
      try {
        const text = await extractText(file);
        if (text.length < 40) failed.push(file.name);
        else parsed.push({ name: file.name, text });
      } catch {
        failed.push(file.name);
      }
    }
    setResumes((prev) => [...prev, ...parsed].slice(0, 40));
    setParsing(false);
    if (parsed.length) toast.success(`${parsed.length} resume(s) ready`);
    if (failed.length) toast.error(`Could not read: ${failed.join(", ")}`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const runScreening = async () => {
    if (jobDescription.trim().length < 30) return toast.error("Add a job description first (at least 30 characters).");
    if (resumes.length === 0) return toast.error("Upload at least one resume.");
    setScreening(true);
    setResults(null);
    try {
      const job = jobs.find((j) => j.id === selectedJobId);
      const { data, error } = await supabase.functions.invoke("screen-resumes", {
        body: {
          jobTitle,
          jobDescription,
          requiredSkills: job?.skills || [],
          shortlistCount,
          resumes,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResults((data as any).candidates || []);
      setNotes((data as any).overall_notes || "");
      toast.success("Screening complete");
    } catch (e: any) {
      toast.error(e?.message || "Screening failed. Please try again.");
    } finally {
      setScreening(false);
    }
  };

  const shortlisted = (results || []).filter((c) => c.shortlisted);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/company/dashboard")}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <button onClick={() => navigate("/")} className="flex items-center">
              <Logo />
            </button>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="w-3 h-3" /> AI Bulk Screening
          </Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Bulk Resume Screening</h1>
          <p className="text-sm text-muted-foreground">
            Describe the role, drop in every resume you received, and let the AI rank and shortlist the best fits.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label>Use one of your posted jobs</Label>
                <Select value={selectedJobId} onValueChange={pickJob}>
                  <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual">Write the description manually</SelectItem>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Role title</Label>
                <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" />
              </div>

              <div className="space-y-2">
                <Label>Job description & requirements</Label>
                <Textarea
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  rows={10}
                  placeholder="Responsibilities, must-have skills, experience level, education..."
                />
              </div>

              <div className="space-y-2">
                <Label>How many candidates to shortlist</Label>
                <Input
                  type="number"
                  min={1}
                  max={Math.max(1, resumes.length || 40)}
                  value={shortlistCount}
                  onChange={(e) => setShortlistCount(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-4">
              <Label>Candidate resumes (PDF or text, up to 40)</Label>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                {parsing ? (
                  <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
                ) : (
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                )}
                <p className="text-sm mt-2 font-medium">Drop resumes here or click to browse</p>
                <p className="text-xs text-muted-foreground">Select multiple files at once</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md,text/plain,application/pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />

              {resumes.length > 0 && (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{resumes.length} resume(s) loaded</span>
                    <Button variant="ghost" size="sm" onClick={() => setResumes([])}>Clear all</Button>
                  </div>
                  {resumes.map((r, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded border border-border bg-muted/20">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate flex-1">{r.name}</span>
                      <Button size="icon" variant="ghost" onClick={() => setResumes(resumes.filter((_, j) => j !== i))}>
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button className="w-full" onClick={runScreening} disabled={screening || parsing}>
                {screening ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing {resumes.length} resume(s)...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Screen & shortlist top {shortlistCount}</>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {results && results.length > 0 && (
          <div className="space-y-4">
            {notes && (
              <Card className="border-primary/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                    <Sparkles className="w-4 h-4 text-primary" /> AI shortlist rationale
                  </div>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{notes}</p>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Ranked candidates</h2>
              <Badge variant="secondary">{shortlisted.length} shortlisted of {results.length}</Badge>
            </div>

            {results.map((c) => (
              <Card key={c.rank} className={c.shortlisted ? "border-primary/50 bg-primary/5" : ""}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground">#{c.rank}</span>
                        <h3 className="font-semibold truncate">{c.name}</h3>
                        {c.shortlisted && (
                          <Badge className="gap-1"><CheckCircle2 className="w-3 h-3" /> Shortlisted</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{c.file_name}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-bold">{Math.round(c.match_score)}</div>
                      <div className="text-xs text-muted-foreground">match</div>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{c.summary}</p>

                  <div className="grid sm:grid-cols-3 gap-3">
                    {([["Skills", c.skills_match], ["Experience", c.experience_match], ["Education", c.education_match]] as const).map(([label, val]) => (
                      <div key={label} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{label}</span>
                          <span className="font-medium">{Math.round(val || 0)}%</span>
                        </div>
                        <Progress value={val || 0} className="h-1.5" />
                      </div>
                    ))}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs font-semibold mb-1">Strengths</div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {(c.strengths || []).map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="text-xs font-semibold mb-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Concerns
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        {(c.concerns || []).map((s, i) => <li key={i}>• {s}</li>)}
                      </ul>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(c.top_skills || []).map((s) => <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>)}
                    {(c.missing_skills || []).map((s) => <Badge key={s} variant="outline" className="text-xs text-muted-foreground">missing: {s}</Badge>)}
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
