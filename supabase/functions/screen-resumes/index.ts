import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobTitle, jobDescription, requiredSkills, shortlistCount, resumes } = await req.json();

    if (!jobDescription || String(jobDescription).trim().length < 30) {
      throw new Error("A job description of at least 30 characters is required");
    }
    if (!Array.isArray(resumes) || resumes.length === 0) {
      throw new Error("At least one resume is required");
    }
    const limit = Math.max(1, Math.min(Number(shortlistCount) || 3, resumes.length));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const candidateBlocks = resumes
      .slice(0, 40)
      .map((r: any, i: number) => `--- CANDIDATE ${i + 1} (id: ${i + 1}, file: ${r.name || `resume-${i + 1}`}) ---
${String(r.text || "").slice(0, 8000)}`)
      .join("\n\n");

    const prompt = `You are an expert technical recruiter. Screen the resumes below against the job and rank ALL candidates.

JOB TITLE: ${jobTitle || "Not specified"}
REQUIRED SKILLS: ${(requiredSkills || []).join(", ") || "See description"}
JOB DESCRIPTION:
"""
${String(jobDescription).slice(0, 6000)}
"""

RESUMES:
${candidateBlocks}

Rules:
- Score every candidate 0-100 on overall fit against this specific job.
- Mark exactly the top ${limit} candidates as shortlisted: true (highest match_score first).
- Extract the candidate's real name from the resume if present, otherwise use the file name.
- Be evidence-based. Do not invent skills, employers or credentials.
Return everything through the save_screening tool.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a precise resume screening engine. Respond only via the tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_screening",
            description: "Save the ranked screening results",
            parameters: {
              type: "object",
              properties: {
                candidates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      id: { type: "number", description: "The candidate id given in the prompt" },
                      name: { type: "string" },
                      match_score: { type: "number", minimum: 0, maximum: 100 },
                      skills_match: { type: "number", minimum: 0, maximum: 100 },
                      experience_match: { type: "number", minimum: 0, maximum: 100 },
                      education_match: { type: "number", minimum: 0, maximum: 100 },
                      total_experience_years: { type: "number" },
                      top_skills: { type: "array", items: { type: "string" } },
                      missing_skills: { type: "array", items: { type: "string" } },
                      strengths: { type: "array", items: { type: "string" } },
                      concerns: { type: "array", items: { type: "string" } },
                      summary: { type: "string", description: "2-3 sentence fit summary" },
                      shortlisted: { type: "boolean" },
                    },
                    required: ["id", "name", "match_score", "skills_match", "experience_match", "education_match", "top_skills", "missing_skills", "strengths", "concerns", "summary", "shortlisted"],
                  },
                },
                overall_notes: { type: "string", description: "Short markdown note on the talent pool and the shortlist rationale" },
              },
              required: ["candidates", "overall_notes"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_screening" } },
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("screen-resumes AI error", aiResponse.status, t);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests right now. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("Screening failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No screening result returned");
    const result = JSON.parse(toolCall.function.arguments);

    const ranked = (result.candidates || [])
      .map((c: any) => ({
        ...c,
        file_name: resumes[(c.id || 1) - 1]?.name || `resume-${c.id}`,
      }))
      .sort((a: any, b: any) => (b.match_score || 0) - (a.match_score || 0))
      .map((c: any, i: number) => ({ ...c, rank: i + 1, shortlisted: i < limit }));

    return new Response(JSON.stringify({ candidates: ranked, overall_notes: result.overall_notes, shortlist_count: limit }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("screen-resumes error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
