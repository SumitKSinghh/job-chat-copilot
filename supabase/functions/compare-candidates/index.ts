import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId, applicationIds } = await req.json();
    if (!jobId || !Array.isArray(applicationIds) || applicationIds.length < 2) {
      throw new Error("jobId and at least 2 applicationIds required");
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) throw new Error("Unauthorized");

    const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (!job || job.created_by !== userData.user.id) throw new Error("Forbidden");

    const summaries: any[] = [];
    for (const appId of applicationIds) {
      const { data: app } = await supabase.from("applications").select("*").eq("id", appId).eq("job_id", jobId).maybeSingle();
      if (!app) continue;
      const { data: profile } = await supabase.from("profiles").select("full_name, email").eq("user_id", app.candidate_id).maybeSingle();
      const { data: interview } = await supabase.from("interviews").select("id").eq("application_id", appId).maybeSingle();
      let evaluation: any = null;
      if (interview) {
        const { data } = await supabase.from("evaluations").select("*").eq("interview_id", interview.id).maybeSingle();
        evaluation = data;
      }
      const { data: resume } = await supabase
        .from("resumes")
        .select("*")
        .eq("candidate_id", app.candidate_id)
        .eq("job_id", jobId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      summaries.push({
        application_id: app.id,
        name: profile?.full_name || "Unknown",
        email: profile?.email,
        evaluation,
        resume,
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are a senior hiring manager. Compare the following candidates for the role of "${job.title}" and produce a structured side-by-side comparison plus a final recommendation.

JOB
${(job.description || "").slice(0, 1500)}
Required skills: ${(job.skills || []).join(", ")}

CANDIDATES:
${summaries.map((c, i) => `--- Candidate ${i + 1}: ${c.name} ---
Match breakdown: ${JSON.stringify((c.resume as any)?.match_breakdown || {})}
Total exp: ${(c.resume as any)?.total_experience_years || "?"} years
Skills: ${((c.resume as any)?.extracted_skills || []).join(", ")}
Hiring risks: ${((c.resume as any)?.hiring_risks || []).join("; ")}
Interview overall: ${c.evaluation?.overall_score ?? "n/a"} | Recommendation: ${c.evaluation?.recommendation ?? "n/a"}
Strengths: ${(c.evaluation?.strengths || []).join("; ")}
Concerns: ${(c.evaluation?.weaknesses || []).join("; ")}
`).join("\n")}
`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a senior hiring manager. Be specific and decisive." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_comparison",
            description: "Save the side-by-side comparison",
            parameters: {
              type: "object",
              properties: {
                top_pick_name: { type: "string" },
                rationale: { type: "string", description: "2-4 sentence reason for the top pick" },
                per_candidate: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      key_strengths: { type: "array", items: { type: "string" } },
                      key_concerns: { type: "array", items: { type: "string" } },
                      verdict: { type: "string", enum: ["hire", "consider", "reject"] },
                    },
                    required: ["name", "key_strengths", "key_concerns", "verdict"],
                  },
                },
                summary_markdown: { type: "string", description: "Short markdown summary covering tradeoffs" },
              },
              required: ["top_pick_name", "rationale", "per_candidate", "summary_markdown"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_comparison" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("compare AI error", aiResponse.status, t);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Comparison failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No comparison");
    const comparison = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ comparison, candidates: summaries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("compare-candidates error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
