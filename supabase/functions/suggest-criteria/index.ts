import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, experience, education, skills } = await req.json();
    if (!description && !title) throw new Error("title or description required");

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const prompt = `You are an expert technical recruiter helping write a job posting. Based on the role below, recommend:
1. "additional_criteria": 3-6 short bullet points of nice-to-have or differentiating criteria the employer should screen for (e.g. open-source contributions, startup experience, specific industry exposure). Concise, scannable.
2. "additional_qualifications": 3-6 short bullet points of recommended certifications, credentials, portfolio expectations, or qualifications beyond the basics.

Return both as plain text with one item per line prefixed by "- ". No headings, no extra commentary.

Job Title: ${title || "Not provided"}
Description: ${description || "Not provided"}
Experience: ${experience || "Not specified"}
Education: ${education || "Not specified"}
Skills: ${(skills || []).join(", ") || "Not specified"}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You suggest recruiting criteria. Always call the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "save_recommendations",
            description: "Save the suggested additional criteria and qualifications",
            parameters: {
              type: "object",
              properties: {
                additional_criteria: { type: "string", description: "Markdown bullet list of additional criteria." },
                additional_qualifications: { type: "string", description: "Markdown bullet list of additional qualifications." },
              },
              required: ["additional_criteria", "additional_qualifications"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "save_recommendations" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errText);
      if (aiResponse.status === 429)
        return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402)
        return new Response(JSON.stringify({ error: "Payment required" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI suggestion failed");
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), {
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
