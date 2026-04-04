import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { interviewId } = await req.json();
    if (!interviewId) throw new Error("interviewId required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch interview + application + job
    const { data: interview } = await supabase
      .from("interviews")
      .select("*, applications!inner(job_id, candidate_id)")
      .eq("id", interviewId)
      .single();
    if (!interview) throw new Error("Interview not found");

    const appData = Array.isArray(interview.applications) ? interview.applications[0] : interview.applications;

    const { data: job } = await supabase.from("jobs").select("*").eq("id", appData.job_id).single();
    if (!job) throw new Error("Job not found");

    // Fetch responses with questions
    const { data: responses } = await supabase
      .from("responses")
      .select("answer_text, questions!inner(question_text, type)")
      .eq("interview_id", interviewId);

    if (!responses || responses.length === 0) throw new Error("No responses found");

    const transcript = responses.map((r: any) => {
      const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
      return `Q (${q.type}): ${q.question_text}\nA: ${r.answer_text}`;
    }).join("\n\n");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `Evaluate this candidate's interview for the position of "${job.title}".

Job Requirements:
- Skills: ${(job.skills || []).join(", ")}
- Experience: ${job.experience || "Not specified"}
- Description: ${job.description}

Interview Transcript:
${transcript}

Evaluate the candidate on:
1. Overall performance (0-100)
2. Communication clarity (0-100)
3. Skill match (0-100)
4. Key strengths (list 3-5)
5. Areas for improvement (list 2-4)
6. Recommendation: hire, consider, or reject
7. Detailed feedback paragraph`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an expert hiring evaluator. Evaluate candidates objectively and provide structured feedback." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_evaluation",
            description: "Save the candidate evaluation",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", minimum: 0, maximum: 100 },
                communication_score: { type: "number", minimum: 0, maximum: 100 },
                skill_score: { type: "number", minimum: 0, maximum: 100 },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                recommendation: { type: "string", enum: ["hire", "consider", "reject"] },
                detailed_feedback: { type: "string" },
              },
              required: ["overall_score", "communication_score", "skill_score", "strengths", "weaknesses", "recommendation", "detailed_feedback"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_evaluation" } },
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
      throw new Error("AI evaluation failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const evaluation = JSON.parse(toolCall.function.arguments);

    // Insert evaluation using service role (bypasses RLS)
    const { error: evalErr } = await supabase.from("evaluations").insert({
      interview_id: interviewId,
      overall_score: evaluation.overall_score,
      communication_score: evaluation.communication_score,
      skill_score: evaluation.skill_score,
      strengths: evaluation.strengths,
      weaknesses: evaluation.weaknesses,
      recommendation: evaluation.recommendation,
      detailed_feedback: evaluation.detailed_feedback,
    });
    if (evalErr) throw evalErr;

    // Update interview status
    await supabase.from("interviews").update({ status: "evaluated" }).eq("id", interviewId);
    // Update application status
    await supabase.from("applications").update({ status: "evaluated" }).eq("id", interview.application_id);

    return new Response(JSON.stringify({ success: true, evaluation }), {
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
