import { Card, CardContent } from "@/components/ui/card";
import { Check, Circle, Sparkles } from "lucide-react";

export interface HiringTimelineStep {
  label: string;
  count?: number | null;
  done: boolean;
}

interface Props {
  jobTitle: string;
  steps: HiringTimelineStep[];
}

export function HiringTimeline({ jobTitle, steps }: Props) {
  const completedCount = steps.filter((s) => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-1 gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <h3 className="font-display font-semibold text-foreground">AI Hiring Timeline</h3>
          </div>
          <div className="text-xs text-muted-foreground">
            {completedCount} of {steps.length} stages · {pct}%
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">{jobTitle}</p>

        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <ol className="relative">
          {steps.map((s, i) => {
            const isLast = i === steps.length - 1;
            return (
              <li key={s.label} className="relative pl-9 pb-5 last:pb-0">
                {!isLast && (
                  <span
                    className={`absolute left-3 top-6 bottom-0 w-px ${
                      s.done ? "bg-primary/60" : "bg-border"
                    }`}
                  />
                )}
                <span
                  className={`absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center border ${
                    s.done
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-muted-foreground border-border"
                  }`}
                >
                  {s.done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-2.5 h-2.5" />}
                </span>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span
                    className={`text-sm ${
                      s.done ? "text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {s.label}
                  </span>
                  {s.count !== undefined && s.count !== null && (
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded ${
                        s.done
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {s.count}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
