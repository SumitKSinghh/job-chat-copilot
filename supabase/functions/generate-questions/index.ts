import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { jobId } = await req.json();
    if (!jobId) throw new Error("jobId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch job
    const { data: job, error: jobErr } = await supabase.from("jobs").select("*").eq("id", jobId).single();
    if (jobErr || !job) throw new Error("Job not found");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert hiring interviewer. Based on the following job posting, generate exactly 8 interview questions.

Job Title: ${job.title}
Job Description: ${job.description}
Required Skills: ${(job.skills || []).join(", ")}
Experience: ${job.experience || "Not specified"}
Education: ${job.education || "Not specified"}
Additional Criteria: ${job.additional_criteria || "None"}

Generate questions in these categories:
- 2 screening questions (basic fit, motivation)
- 3 skill-based questions (technical knowledge)
- 2 scenario questions (problem-solving)
- 1 behavioral question (teamwork, leadership)

Return a JSON array of objects with fields: "type" (screening/skill/scenario/behavioral), "question_text", "order_index" (0-7)`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You generate structured interview questions. Always respond with valid JSON array only, no markdown." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_questions",
            description: "Save generated interview questions",
            parameters: {
              type: "object",
              properties: {
                questions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["screening", "skill", "scenario", "behavioral"] },
                      question_text: { type: "string" },
                      order_index: { type: "number" },
                    },
                    required: ["type", "question_text", "order_index"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_questions" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const { questions } = JSON.parse(toolCall.function.arguments);

    // Insert questions
    const questionsToInsert = questions.map((q: any) => ({
      job_id: jobId,
      type: q.type,
      question_text: q.question_text,
      order_index: q.order_index,
    }));

    const { error: insertErr } = await supabase.from("questions").insert(questionsToInsert);
    if (insertErr) throw insertErr;

    // Also create interview strategy
    await supabase.from("interview_strategies").insert({
      job_id: jobId,
      role_type: job.title,
      difficulty_level: "medium",
      evaluation_focus: job.skills || [],
      core_skills: job.skills || [],
      strategy_notes: `Auto-generated strategy for ${job.title}`,
    });

    return new Response(JSON.stringify({ success: true, count: questions.length }), {
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
