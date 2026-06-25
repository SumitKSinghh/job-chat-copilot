import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ChatMessage { role: "user" | "assistant"; content: string }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, jobId } = await req.json() as { messages: ChatMessage[]; jobId?: string };
    if (!Array.isArray(messages) || messages.length === 0) throw new Error("messages required");

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
    const userId = userData.user.id;

    // Build snapshot scoped to this employer's jobs
    const jobsQuery = supabase.from("jobs").select("*").eq("created_by", userId);
    if (jobId) jobsQuery.eq("id", jobId);
    const { data: jobs } = await jobsQuery;
    if (!jobs?.length) {
      return new Response(JSON.stringify({ reply: "You don't have any jobs posted yet. Post a job first and applicants will appear here." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const jobIds = jobs.map((j) => j.id);
    const { data: apps } = await supabase.from("applications").select("*").in("job_id", jobIds);
    const appIds = (apps || []).map((a) => a.id);

    const { data: interviews } = appIds.length
      ? await supabase.from("interviews").select("*").in("application_id", appIds)
      : { data: [] as any[] };
    const intIds = (interviews || []).map((i: any) => i.id);
    const { data: evals } = intIds.length
      ? await supabase.from("evaluations").select("*").in("interview_id", intIds)
      : { data: [] as any[] };

    const candidateIds = Array.from(new Set((apps || []).map((a) => a.candidate_id)));
    const { data: profiles } = candidateIds.length
      ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", candidateIds)
      : { data: [] as any[] };
    const { data: resumes } = appIds.length
      ? await supabase.from("resumes").select("*").in("job_id", jobIds)
      : { data: [] as any[] };

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    const intByApp = new Map((interviews || []).map((i: any) => [i.application_id, i]));
    const evalByInt = new Map((evals || []).map((e: any) => [e.interview_id, e]));

    const snapshot = jobs.map((j) => ({
      id: j.id,
      title: j.title,
      skills: j.skills,
      candidates: (apps || []).filter((a) => a.job_id === j.id).map((a) => {
        const interview: any = intByApp.get(a.id);
        const ev: any = interview ? evalByInt.get(interview.id) : null;
        const r: any = (resumes || []).find((rr: any) => rr.candidate_id === a.candidate_id && rr.job_id === j.id);
        const p: any = profileMap.get(a.candidate_id);
        return {
          name: p?.full_name || "Unknown",
          email: p?.email,
          status: a.status,
          interview_status: interview?.status || null,
          overall_score: ev?.overall_score ?? null,
          recommendation: ev?.recommendation ?? null,
          strengths: ev?.strengths ?? [],
          concerns: ev?.weaknesses ?? [],
          extracted_skills: r?.extracted_skills ?? [],
          total_experience_years: r?.total_experience_years ?? null,
          hiring_risks: r?.hiring_risks ?? [],
          match_breakdown: r?.match_breakdown ?? null,
        };
      }),
    }));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const system = `You are RecruitIQ, an AI hiring assistant for an employer. Answer questions about their candidate pool using ONLY the JSON snapshot below. Be concise, decisive, and use markdown tables/lists when helpful. If data is missing, say so.

SNAPSHOT (JSON):
${JSON.stringify(snapshot).slice(0, 60000)}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!aiResponse.ok) {
      const t = await aiResponse.text();
      console.error("assistant AI error", aiResponse.status, t);
      if (aiResponse.status === 429) return new Response(JSON.stringify({ error: "Rate limited" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResponse.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("Assistant failed");
    }

    const aiData = await aiResponse.json();
    const reply = aiData.choices?.[0]?.message?.content?.trim() || "I couldn't generate a response.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recruitiq-assistant error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
