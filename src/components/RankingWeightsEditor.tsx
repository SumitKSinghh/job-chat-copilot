import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

export interface Weights {
  resume: number; interview: number; experience: number; skills: number;
}
export interface CustomCriterion {
  label: string; weight: number; description?: string;
}

interface Props {
  weights: Weights;
  customCriteria: CustomCriterion[];
  onChange: (w: Weights, c: CustomCriterion[]) => void;
}

const DEFAULTS: Weights = { resume: 40, interview: 40, experience: 10, skills: 10 };

export function RankingWeightsEditor({ weights: w0, customCriteria: c0, onChange }: Props) {
  const [w, setW] = useState<Weights>(w0 || DEFAULTS);
  const [criteria, setCriteria] = useState<CustomCriterion[]>(c0 || []);
  const [label, setLabel] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => { onChange(w, criteria); }, [w, criteria]);

  const total = w.resume + w.interview + w.experience + w.skills;

  const updateW = (key: keyof Weights, val: number) => {
    setW((p) => ({ ...p, [key]: Math.max(0, Math.min(100, val)) }));
  };

  const addCriterion = () => {
    if (!label.trim()) return;
    setCriteria([...criteria, { label: label.trim(), weight: 10, description: desc.trim() || undefined }]);
    setLabel(""); setDesc("");
  };

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-muted/20">
      <div>
        <Label className="text-sm font-semibold">Ranking weights</Label>
        <p className="text-xs text-muted-foreground mb-3">How candidates are scored. Total should be 100.</p>
        <div className="grid grid-cols-2 gap-3">
          {(["resume", "interview", "experience", "skills"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label className="text-xs capitalize">{k}</Label>
              <Input type="number" min={0} max={100} value={w[k]} onChange={(e) => updateW(k, parseInt(e.target.value) || 0)} />
            </div>
          ))}
        </div>
        <div className="text-xs mt-2 flex items-center gap-2">
          Total: <Badge variant={total === 100 ? "secondary" : "destructive"}>{total}</Badge>
          {total !== 100 && <span className="text-muted-foreground">(should sum to 100)</span>}
        </div>
      </div>

      <div>
        <Label className="text-sm font-semibold">Custom hiring criteria</Label>
        <p className="text-xs text-muted-foreground mb-2">AI will score each candidate on these during interview evaluation.</p>
        <div className="space-y-2">
          {criteria.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-2 rounded bg-card border border-border">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{c.label} <span className="text-xs text-muted-foreground">· weight {c.weight}</span></div>
                {c.description && <div className="text-xs text-muted-foreground truncate">{c.description}</div>}
              </div>
              <Button size="icon" variant="ghost" onClick={() => setCriteria(criteria.filter((_, j) => j !== i))}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
          <div className="flex flex-col gap-2 p-2 rounded border border-dashed border-border">
            <Input placeholder="Criterion (e.g. Leadership experience)" value={label} onChange={(e) => setLabel(e.target.value)} />
            <Input placeholder="Optional description" value={desc} onChange={(e) => setDesc(e.target.value)} />
            <Button type="button" variant="outline" size="sm" onClick={addCriterion} disabled={!label.trim()}>
              <Plus className="w-3.5 h-3.5 mr-1" /> Add criterion
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
