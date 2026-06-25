import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, GraduationCap, Award, AlertTriangle, Clock } from "lucide-react";

interface Experience { company: string; role: string; start?: string; end?: string; duration_months?: number; highlights?: string[] }
interface Education { institution: string; degree?: string; year?: string }
interface Gap { start?: string; end?: string; months?: number }
interface MatchBreakdown { skills_match?: number; experience_match?: number; education_match?: number; overall?: number }

interface Props {
  experience?: Experience[] | null;
  education?: Education[] | null;
  certifications?: string[] | null;
  totalYears?: number | null;
  gaps?: Gap[] | null;
  risks?: string[] | null;
  matchBreakdown?: MatchBreakdown | null;
  status?: string | null;
}

export function ResumeIntelligencePanel({
  experience, education, certifications, totalYears, gaps, risks, matchBreakdown, status,
}: Props) {
  if (status === "pending" || status === "running") {
    return (
      <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
        AI is analyzing this resume...
      </div>
    );
  }
  if (status === "failed") {
    return (
      <div className="rounded-lg border border-dashed border-destructive/40 p-4 text-sm text-destructive">
        Resume analysis failed.
      </div>
    );
  }
  const hasAny = (experience?.length || education?.length || certifications?.length || (totalYears ?? 0) > 0 || gaps?.length || risks?.length || matchBreakdown);
  if (!hasAny) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <span className="w-1.5 h-4 bg-primary rounded-full" /> Resume Intelligence
      </h4>

      {matchBreakdown && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            ["Skills", matchBreakdown.skills_match],
            ["Experience", matchBreakdown.experience_match],
            ["Education", matchBreakdown.education_match],
            ["Overall fit", matchBreakdown.overall],
          ] as const).map(([label, val]) => (
            <div key={label}>
              <div className="text-xs text-muted-foreground mb-1">{label}</div>
              <Progress value={val || 0} className="h-1.5" />
              <div className="text-xs font-semibold mt-1">{val ?? "—"}/100</div>
            </div>
          ))}
        </div>
      )}

      {(totalYears ?? 0) > 0 && (
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{totalYears} years</span>
          <span className="text-muted-foreground">total experience</span>
        </div>
      )}

      {experience && experience.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Briefcase className="w-3 h-3" /> Experience
          </div>
          <div className="space-y-2">
            {experience.slice(0, 5).map((e, i) => (
              <div key={i} className="text-sm border-l-2 border-primary/30 pl-3">
                <div className="font-medium">{e.role}{e.company ? ` · ${e.company}` : ""}</div>
                <div className="text-xs text-muted-foreground">
                  {e.start || "?"} – {e.end || "present"}
                  {e.duration_months ? ` · ${Math.round(e.duration_months / 12 * 10) / 10}y` : ""}
                </div>
                {e.highlights && e.highlights.length > 0 && (
                  <ul className="text-xs text-muted-foreground mt-1 list-disc list-inside">
                    {e.highlights.slice(0, 3).map((h, j) => <li key={j}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {education && education.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <GraduationCap className="w-3 h-3" /> Education
          </div>
          <div className="space-y-1">
            {education.map((e, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{e.degree || "Degree"}</span> · {e.institution}{e.year ? ` (${e.year})` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {certifications && certifications.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <Award className="w-3 h-3" /> Certifications
          </div>
          <div className="flex flex-wrap gap-1.5">
            {certifications.map((c, i) => <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>)}
          </div>
        </div>
      )}

      {gaps && gaps.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Employment gaps</div>
          <div className="flex flex-wrap gap-1.5">
            {gaps.map((g, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                {g.start || "?"} → {g.end || "?"}{g.months ? ` (${g.months}mo)` : ""}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {risks && risks.length > 0 && (
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-warning" /> Hiring risks
          </div>
          <div className="flex flex-wrap gap-1.5">
            {risks.map((r, i) => (
              <Badge key={i} className="bg-warning/10 text-warning border-warning/30 text-xs" variant="outline">{r}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
