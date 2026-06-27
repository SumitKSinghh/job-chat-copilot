import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Briefcase, Upload, Sparkles, Copy, Download, ArrowLeft, FileText, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface Job {
  id: string;
  title: string;
  company_name: string | null;
}

export default function ResumeBuilder() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobId, setJobId] = useState<string>(params.get("job") || "");
  const [resumeText, setResumeText] = useState("");
  const [generated, setGenerated] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("jobs")
      .select("id, title, company_name")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => data && setJobs(data));
  }, []);

  const handleFile = async (file: File) => {
    setParsing(true);
    try {
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
        setResumeText(text.trim());
        toast.success(`Extracted ${pdf.numPages} page(s) from PDF`);
      } else {
        const text = await file.text();
        setResumeText(text);
        toast.success("Resume loaded");
      }
    } catch (e: any) {
      toast.error("Could not read file. Try pasting your resume text instead.");
    } finally {
      setParsing(false);
    }
  };

  const handleGenerate = async () => {
    if (!resumeText.trim() || resumeText.trim().length < 50) {
      return toast.error("Please paste or upload your resume first (min 50 characters).");
    }
    setLoading(true);
    setGenerated("");
    try {
      const { data, error } = await supabase.functions.invoke("build-resume", {
        body: { jobId: jobId || null, resumeText },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGenerated(data.resume.generated_markdown);
      toast.success("Your tailored resume is ready!");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate resume");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generated);
    toast.success("Copied to clipboard");
  };

  const handleDownload = () => {
    const blob = new Blob([generated], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "resume.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    const html = document.getElementById("resume-preview")?.innerHTML || "";
    w.document.write(`<!doctype html><html><head><title>Resume</title>
      <style>
        body{font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:780px;margin:40px auto;padding:0 24px;color:#111;line-height:1.55}
        h1{font-size:28px;margin:0 0 4px;border-bottom:2px solid #111;padding-bottom:6px}
        h2{font-size:16px;text-transform:uppercase;letter-spacing:.06em;margin:22px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}
        h3{font-size:14px;margin:14px 0 4px}
        ul{margin:6px 0 6px 20px;padding:0}
        li{margin:2px 0}
        p{margin:4px 0}
        @media print{body{margin:0;padding:20px}}
      </style></head><body>${html}<script>window.onload=()=>window.print()</script></body></html>`);
    w.document.close();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <Logo className="h-9 md:h-11" />
            <span className="font-display font-bold text-lg text-foreground">RecruitIQ</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Jobs
            </Button>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-1" /> Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" /> AI Resume Builder
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-2">
            Land more interviews with a tailored resume
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pick the job you want, upload your current resume, and our AI rewrites it to match — ATS-optimized and recruiter-ready.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Input */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-display">1. Your details</CardTitle>
              <CardDescription>Select a target job and provide your existing resume.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Target job (optional but recommended)</Label>
                <Select value={jobId} onValueChange={setJobId}>
                  <SelectTrigger><SelectValue placeholder="Pick a job from the marketplace" /></SelectTrigger>
                  <SelectContent>
                    {jobs.map((j) => (
                      <SelectItem key={j.id} value={j.id}>
                        {j.title}{j.company_name ? ` — ${j.company_name}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Your current resume</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.md,text/plain,application/pdf"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={parsing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {parsing ? "Reading file..." : "Upload PDF or TXT"}
                </Button>
                <Textarea
                  placeholder="...or paste your resume text here"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  className="min-h-[280px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">{resumeText.length} characters</p>
              </div>

              <Button
                className="w-full h-11"
                onClick={handleGenerate}
                disabled={loading || parsing || resumeText.trim().length < 50}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                    Crafting your resume...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate AI Resume
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Output */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-display">2. Your AI resume</CardTitle>
                <CardDescription>Tailored, ATS-friendly, ready to send.</CardDescription>
              </div>
              {generated && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={handleCopy}><Copy className="w-4 h-4" /></Button>
                  <Button size="sm" variant="ghost" onClick={handleDownload}><Download className="w-4 h-4" /></Button>
                  <Button size="sm" variant="outline" onClick={handlePrint}>
                    <FileText className="w-4 h-4 mr-1" /> PDF
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {!generated && !loading && (
                <div className="text-center py-20 text-muted-foreground">
                  <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">Your tailored resume will appear here.</p>
                </div>
              )}
              {loading && (
                <div className="space-y-3 animate-pulse">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-4 bg-muted rounded" style={{ width: `${60 + Math.random() * 40}%` }} />
                  ))}
                </div>
              )}
              {generated && (
                <div
                  id="resume-preview"
                  className="prose prose-sm max-w-none dark:prose-invert prose-headings:font-display prose-h1:text-2xl prose-h1:border-b prose-h1:pb-2 prose-h2:text-sm prose-h2:uppercase prose-h2:tracking-wide prose-h2:mt-6 prose-h2:border-b prose-h2:pb-1"
                >
                  <ReactMarkdown>{generated}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
