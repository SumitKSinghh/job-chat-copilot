import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, experience, education } = await req.json();
    if (!title && !description) throw new Error("title or description required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert technical recruiter. Read this job posting and return the most relevant skills, technologies, tools, frameworks, and competencies that should be required or preferred for this role. Include both hard skills (e.g. "React", "PostgreSQL", "AWS") and a few critical soft skills (e.g. "Stakeholder Management") when relevant. Return 10-18 concise skill names. No duplicates, no generic filler like "communication" unless truly central.

Job Title: ${title || "Not provided"}
Job Description: ${description || "Not provided"}
Experience: ${experience || "Not specified"}
Education: ${education || "Not specified"}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You extract structured skill lists from job postings. Always call the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_skills",
            description: "Save the recommended skills for this job",
            parameters: {
              type: "object",
              properties: {
                skills: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of skill names, 10-18 items, concise (1-4 words each).",
                },
              },
              required: ["skills"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_skills" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429)
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402)
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI skill suggestion failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const { skills } = JSON.parse(toolCall.function.arguments);
    const cleaned = Array.from(new Set((skills as string[]).map((s) => s.trim()).filter(Boolean)));

    return new Response(JSON.stringify({ skills: cleaned }), {
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
