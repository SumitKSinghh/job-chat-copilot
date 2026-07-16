import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Aggregate all resumes for skills / experience
    const { data: resumes } = await supabase
      .from("resumes")
      .select("extracted_skills, parsed_certifications, total_experience_years, original_text, created_at")
      .eq("candidate_id", user.id);

    // Aggregate all evaluations via application -> interview
    const { data: apps } = await supabase
      .from("applications")
      .select("id")
      .eq("candidate_id", user.id);

    const appIds = (apps || []).map((a: any) => a.id);
    let evaluations: any[] = [];
    if (appIds.length) {
      const { data: interviews } = await supabase.from("interviews").select("id, application_id").in("application_id", appIds);
      const interviewIds = (interviews || []).map((i: any) => i.id);
      if (interviewIds.length) {
        const { data: evals } = await supabase
          .from("evaluations")
          .select("overall_score, communication_score, skill_score, recommendation, strengths, weaknesses")
          .in("interview_id", interviewIds);
        evaluations = evals || [];
      }
    }

    // Compute performance stats
    const scored = evaluations.filter((e) => e.overall_score !== null);
    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
    const performance_stats = {
      interviews_count: evaluations.length,
      overall_avg: avg(scored.map((e) => e.overall_score || 0)),
      communication_avg: avg(scored.map((e) => e.communication_score || 0)),
      skills_avg: avg(scored.map((e) => e.skill_score || 0)),
      hire_count: evaluations.filter((e) => e.recommendation === "hire").length,
      consider_count: evaluations.filter((e) => e.recommendation === "consider").length,
      last_updated: new Date().toISOString(),
    };

    // Ask AI to synthesize verified skills from evidence
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let verified_skills: any[] = [];
    if (LOVABLE_API_KEY && (resumes?.length || evaluations.length)) {
      const evidence = {
        resume_skills: (resumes || []).flatMap((r: any) => r.extracted_skills || []),
        strengths: evaluations.flatMap((e: any) => e.strengths || []),
        weaknesses: evaluations.flatMap((e: any) => e.weaknesses || []),
        resume_snippets: (resumes || []).map((r: any) => (r.original_text || "").slice(0, 1500)).join("\n---\n").slice(0, 8000),
        interviews_count: evaluations.length,
        avg_scores: { overall: performance_stats.overall_avg, comm: performance_stats.communication_avg, skills: performance_stats.skills_avg },
      };

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{
            role: "user",
            content: `You are building a Living Talent Profile. Given this candidate's resume skills, interview strengths/weaknesses, and performance data, produce a list of VERIFIED skills with a confidence score (0-100) and evidence source.

DATA:
${JSON.stringify(evidence, null, 2)}

Return via the save_skills tool. Only include skills backed by evidence. Confidence should be higher when a skill appears in BOTH resume AND interview strengths, or across multiple interviews. Max 20 skills.`,
          }],
          tools: [{
            type: "function",
            function: {
              name: "save_skills",
              description: "Save the verified skills list",
              parameters: {
                type: "object",
                properties: {
                  verified_skills: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        confidence: { type: "number" },
                        evidence: { type: "string", description: "Brief: e.g. 'resume + 2 interviews'" },
                      },
                      required: ["name", "confidence", "evidence"],
                    },
                  },
                },
                required: ["verified_skills"],
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "save_skills" } },
        }),
      });

      if (aiResponse.ok) {
        const aiData = await aiResponse.json();
        const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall) {
          try {
            const parsed = JSON.parse(toolCall.function.arguments);
            verified_skills = parsed.verified_skills || [];
          } catch { /* ignore */ }
        }
      }
    }

    await supabase.from("profiles").update({
      verified_skills,
      performance_stats,
      profile_refreshed_at: new Date().toISOString(),
    } as any).eq("user_id", user.id);

    return new Response(JSON.stringify({ verified_skills, performance_stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
