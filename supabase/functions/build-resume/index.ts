import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId, resumeText } = await req.json();
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error("Please provide a resume with at least 50 characters of content.");
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

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const userId = userData.user.id;

    let job: any = null;
    if (jobId) {
      const { data } = await supabase.from("jobs").select("*").eq("id", jobId).maybeSingle();
      job = data;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const jobContext = job
      ? `TARGET JOB:
Title: ${job.title}
Company: ${job.company_name || "N/A"}
Description: ${job.description}
Required Skills: ${(job.skills || []).join(", ")}
Experience: ${job.experience || "N/A"}
Education: ${job.education || "N/A"}
Additional Qualifications: ${job.additional_qualifications || "None"}`
      : "No specific job selected — produce a strong general-purpose resume.";

    const prompt = `You are an elite resume writer and ATS optimization expert. Rewrite the candidate's resume into a high-conversion, ATS-friendly resume tailored to the target job. Maximize keyword alignment, quantify achievements where the source supports it (never fabricate), and use strong action verbs.

${jobContext}

CANDIDATE'S CURRENT RESUME:
"""
${resumeText.slice(0, 12000)}
"""

Requirements:
- Output clean Markdown only (no code fences, no commentary).
- Sections in order: # Full Name, contact line, ## Professional Summary, ## Core Skills (bulleted, mirror job keywords), ## Experience (role, company, dates, 3-5 quantified bullets each), ## Education, ## Projects/Certifications (if relevant).
- Keep it concise (1 page equivalent ~ 500-700 words).
- Honestly reflect candidate experience — do not invent jobs, degrees, or metrics.
- Naturally weave in the job's required skills the candidate genuinely has.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert resume writer. Output only clean Markdown." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in workspace billing." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const markdown: string = aiData.choices?.[0]?.message?.content?.trim() || "";
    if (!markdown) throw new Error("Empty AI response");

    const { data: saved, error: insErr } = await supabase
      .from("resumes")
      .insert({
        candidate_id: userId,
        job_id: jobId || null,
        original_text: resumeText.slice(0, 20000),
        generated_markdown: markdown,
      })
      .select()
      .single();
    if (insErr) throw insErr;

    // Kick off deep resume analysis in background (don't block)
    if (jobId) {
      try {
        fetch(`${supabaseUrl}/functions/v1/analyze-resume`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ resumeId: saved.id }),
        }).catch((e) => console.error("analyze-resume trigger failed", e));
      } catch (e) {
        console.error("analyze-resume trigger error", e);
      }
    }

    return new Response(JSON.stringify({ resume: saved }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
