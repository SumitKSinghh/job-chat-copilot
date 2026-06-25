import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { resumeId } = await req.json();
    if (!resumeId) throw new Error("resumeId required");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: resume } = await supabase.from("resumes").select("*").eq("id", resumeId).single();
    if (!resume) throw new Error("Resume not found");

    let job: any = null;
    if (resume.job_id) {
      const { data } = await supabase.from("jobs").select("*").eq("id", resume.job_id).single();
      job = data;
    }

    await supabase.from("resumes").update({ analysis_status: "running" } as any).eq("id", resumeId);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const jobBlock = job
      ? `TARGET JOB
Title: ${job.title}
Required skills: ${(job.skills || []).join(", ")}
Experience: ${job.experience || "N/A"}
Education: ${job.education || "N/A"}
Description: ${(job.description || "").slice(0, 2000)}
Additional qualifications: ${job.additional_qualifications || "None"}`
      : "No target job — produce general analysis.";

    const prompt = `You are an expert technical recruiter and resume analyst. Deeply analyze the candidate's resume against the target job (if provided). Extract structured data and assess hiring fit.

${jobBlock}

RESUME:
"""
${(resume.original_text || "").slice(0, 12000)}
"""

Return via the save_analysis tool. Be conservative — do not invent companies, dates, or credentials. If unclear, omit.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert resume analyzer. Output structured data via the tool only." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_analysis",
            description: "Save deep resume analysis",
            parameters: {
              type: "object",
              properties: {
                extracted_skills: { type: "array", items: { type: "string" } },
                parsed_experience: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      company: { type: "string" },
                      role: { type: "string" },
                      start: { type: "string", description: "YYYY-MM or YYYY" },
                      end: { type: "string", description: "YYYY-MM, YYYY, or 'present'" },
                      duration_months: { type: "number" },
                      highlights: { type: "array", items: { type: "string" } },
                    },
                    required: ["company", "role"],
                  },
                },
                parsed_education: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      institution: { type: "string" },
                      degree: { type: "string" },
                      year: { type: "string" },
                    },
                    required: ["institution"],
                  },
                },
                parsed_certifications: { type: "array", items: { type: "string" } },
                total_experience_years: { type: "number" },
                gaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      start: { type: "string" },
                      end: { type: "string" },
                      months: { type: "number" },
                    },
                  },
                },
                hiring_risks: {
                  type: "array",
                  items: { type: "string" },
                  description: "Concise risk flags: e.g. 'Short avg tenure (<1y)', 'Missing required skill: AWS', 'Education gap'",
                },
                match_breakdown: {
                  type: "object",
                  properties: {
                    skills_match: { type: "number", minimum: 0, maximum: 100 },
                    experience_match: { type: "number", minimum: 0, maximum: 100 },
                    education_match: { type: "number", minimum: 0, maximum: 100 },
                    overall: { type: "number", minimum: 0, maximum: 100 },
                  },
                  required: ["skills_match", "experience_match", "education_match", "overall"],
                },
              },
              required: [
                "extracted_skills",
                "parsed_experience",
                "parsed_education",
                "parsed_certifications",
                "total_experience_years",
                "gaps",
                "hiring_risks",
                "match_breakdown",
              ],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_analysis" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("AI error", aiResponse.status, t);
      await supabase.from("resumes").update({ analysis_status: "failed" } as any).eq("id", resumeId);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI analysis failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No analysis returned");
    const analysis = JSON.parse(toolCall.function.arguments);

    const { error: updErr } = await supabase
      .from("resumes")
      .update({
        extracted_skills: analysis.extracted_skills || [],
        parsed_experience: analysis.parsed_experience || [],
        parsed_education: analysis.parsed_education || [],
        parsed_certifications: analysis.parsed_certifications || [],
        total_experience_years: analysis.total_experience_years || 0,
        gaps: analysis.gaps || [],
        hiring_risks: analysis.hiring_risks || [],
        match_breakdown: analysis.match_breakdown || {},
        analysis_status: "completed",
      } as any)
      .eq("id", resumeId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({ success: true, analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-resume error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
