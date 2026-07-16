import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Plus, X, Award, Target, Link as LinkIcon, TrendingUp, ShieldCheck, Save } from "lucide-react";
import { toast } from "sonner";

interface PortfolioLink { label: string; url: string }
interface VerifiedSkill { name: string; confidence: number; evidence: string }

export function TalentProfileEditor() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [portfolioLinks, setPortfolioLinks] = useState<PortfolioLink[]>([]);
  const [newLink, setNewLink] = useState<PortfolioLink>({ label: "", url: "" });
  const [certifications, setCertifications] = useState<string[]>([]);
  const [newCert, setNewCert] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [prefs, setPrefs] = useState<{ role_type?: string; location?: string; remote?: string; salary_min?: string; salary_max?: string; currency?: string }>({ currency: "USD", remote: "hybrid" });

  const [verifiedSkills, setVerifiedSkills] = useState<VerifiedSkill[]>([]);
  const [perfStats, setPerfStats] = useState<any>({});
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => { if (user) load(); }, [user]);

  const load = async () => {
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
    if (data) {
      const d: any = data;
      setPortfolioLinks(d.portfolio_links || []);
      setCertifications(d.certifications || []);
      setCareerGoals(d.career_goals || "");
      setPrefs({ currency: "USD", remote: "hybrid", ...(d.work_preferences || {}) });
      setVerifiedSkills(d.verified_skills || []);
      setPerfStats(d.performance_stats || {});
      setRefreshedAt(d.profile_refreshed_at);
    }
    setLoading(false);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      portfolio_links: portfolioLinks,
      certifications,
      career_goals: careerGoals,
      work_preferences: prefs,
    } as any).eq("user_id", user!.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("refresh-talent-profile", { body: {} });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setVerifiedSkills(data.verified_skills || []);
      setPerfStats(data.performance_stats || {});
      setRefreshedAt(new Date().toISOString());
      toast.success("Profile refreshed with AI insights");
    } catch (e: any) {
      toast.error(e.message || "Failed to refresh");
    } finally {
      setRefreshing(false);
    }
  };

  const addLink = () => {
    if (!newLink.label.trim() || !newLink.url.trim()) return;
    setPortfolioLinks([...portfolioLinks, newLink]);
    setNewLink({ label: "", url: "" });
  };

  const addCert = () => {
    if (!newCert.trim()) return;
    setCertifications([...certifications, newCert.trim()]);
    setNewCert("");
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading profile...</div>;

  return (
    <div className="space-y-6">
      {/* AI-verified section */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <CardTitle className="text-lg font-display flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary" /> AI-Verified Talent Profile
              </CardTitle>
              <CardDescription>
                Grows richer with every interview. {refreshedAt ? `Last refreshed ${new Date(refreshedAt).toLocaleDateString()}` : "Not refreshed yet."}
              </CardDescription>
            </div>
            <Button onClick={refresh} disabled={refreshing} size="sm">
              <Sparkles className="w-4 h-4 mr-1" /> {refreshing ? "Refreshing..." : "Refresh with AI"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {perfStats.interviews_count > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  ["Overall", perfStats.overall_avg],
                  ["Communication", perfStats.communication_avg],
                  ["Technical", perfStats.skills_avg],
                  ["Interviews", perfStats.interviews_count],
                ].map(([label, val]) => (
                  <div key={label as string} className="rounded-lg border border-border bg-card p-3">
                    <div className="text-xs text-muted-foreground">{label}</div>
                    <div className="text-2xl font-bold text-primary">{val ?? 0}{label !== "Interviews" ? "" : ""}</div>
                    {label !== "Interviews" && <Progress value={Number(val) || 0} className="h-1 mt-1" />}
                  </div>
                ))}
              </div>

              {verifiedSkills.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Verified Skills
                  </div>
                  <div className="space-y-2">
                    {verifiedSkills.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Badge className="bg-primary/10 text-primary border-primary/30 min-w-[120px] justify-center" variant="outline">{s.name}</Badge>
                        <Progress value={s.confidence} className="h-1.5 flex-1" />
                        <span className="text-xs font-semibold w-10 text-right">{s.confidence}%</span>
                        <span className="text-xs text-muted-foreground hidden md:inline">{s.evidence}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              Complete an interview, then click "Refresh with AI" to populate verified skills & scores.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-primary" /> Portfolio & Links
          </CardTitle>
          <CardDescription>GitHub, personal site, Behance, published work — anything that shows your craft.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {portfolioLinks.map((l, i) => (
            <div key={i} className="flex items-center gap-2">
              <Badge variant="secondary" className="min-w-[90px] justify-center">{l.label}</Badge>
              <a href={l.url} target="_blank" rel="noreferrer" className="text-sm text-primary underline flex-1 truncate">{l.url}</a>
              <Button size="icon" variant="ghost" onClick={() => setPortfolioLinks(portfolioLinks.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Label (e.g. GitHub)" value={newLink.label} onChange={(e) => setNewLink({ ...newLink, label: e.target.value })} className="w-40" />
            <Input placeholder="https://..." value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} />
            <Button onClick={addLink} size="icon" variant="outline"><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" /> Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {certifications.map((c, i) => (
              <Badge key={i} variant="secondary" className="pl-3 pr-1 py-1">
                {c}
                <button onClick={() => setCertifications(certifications.filter((_, j) => j !== i))} className="ml-1 hover:bg-background rounded p-0.5"><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="e.g. AWS Certified Solutions Architect" value={newCert} onChange={(e) => setNewCert(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCert())} />
            <Button onClick={addCert} size="icon" variant="outline"><Plus className="w-4 h-4" /></Button>
          </div>
        </CardContent>
      </Card>

      {/* Work preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-display flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" /> Work Preferences & Career Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Role type</Label>
              <Input placeholder="e.g. Senior Frontend Engineer" value={prefs.role_type || ""} onChange={(e) => setPrefs({ ...prefs, role_type: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Preferred location</Label>
              <Input placeholder="e.g. Bangalore / Remote" value={prefs.location || ""} onChange={(e) => setPrefs({ ...prefs, location: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Work mode</Label>
              <Select value={prefs.remote || "hybrid"} onValueChange={(v) => setPrefs({ ...prefs, remote: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">On-site</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={prefs.currency || "USD"} onValueChange={(v) => setPrefs({ ...prefs, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Expected salary (min)</Label>
              <Input type="number" placeholder="e.g. 80000" value={prefs.salary_min || ""} onChange={(e) => setPrefs({ ...prefs, salary_min: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Expected salary (max)</Label>
              <Input type="number" placeholder="e.g. 120000" value={prefs.salary_max || ""} onChange={(e) => setPrefs({ ...prefs, salary_max: e.target.value })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Career goals (1–3 years)</Label>
            <Textarea rows={4} placeholder="Where do you see your career heading? What kind of impact do you want to make?" value={careerGoals} onChange={(e) => setCareerGoals(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving} size="lg">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  );
}
