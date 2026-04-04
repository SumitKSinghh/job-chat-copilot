import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Briefcase, Send, CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  question_text: string;
  type: string;
  order_index: number;
}

interface ChatMessage {
  role: "ai" | "user";
  content: string;
}

export default function InterviewPage() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (interviewId) fetchInterview();
  }, [interviewId]);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const fetchInterview = async () => {
    // Get interview → application → job_id → questions
    const { data: interview } = await supabase
      .from("interviews")
      .select("*, applications!inner(job_id, candidate_id)")
      .eq("id", interviewId!)
      .single();

    if (!interview) {
      toast.error("Interview not found");
      navigate("/");
      return;
    }

    const appData = Array.isArray(interview.applications) ? interview.applications[0] : interview.applications;

    if (interview.status === "completed" || interview.status === "evaluated") {
      setCompleted(true);
      setLoading(false);
      return;
    }

    const { data: qs } = await supabase
      .from("questions")
      .select("*")
      .eq("job_id", appData.job_id)
      .order("order_index");

    if (!qs || qs.length === 0) {
      // No questions generated yet — show message
      setMessages([{ role: "ai", content: "Questions are being prepared for this interview. Please try again in a moment." }]);
      setLoading(false);
      return;
    }

    // Check existing responses to resume
    const { data: existing } = await supabase
      .from("responses")
      .select("question_id")
      .eq("interview_id", interviewId!);

    const answeredIds = new Set(existing?.map(r => r.question_id) || []);
    const remainingQs = qs.filter(q => !answeredIds.has(q.id));

    setQuestions(qs);
    const startIdx = qs.length - remainingQs.length;
    setCurrentIndex(startIdx);

    // Build chat history
    const chatHistory: ChatMessage[] = [];
    for (let i = 0; i < startIdx; i++) {
      chatHistory.push({ role: "ai", content: qs[i].question_text });
      chatHistory.push({ role: "user", content: "(answered)" });
    }
    if (remainingQs.length > 0) {
      chatHistory.push({ role: "ai", content: remainingQs[0].question_text });
    }
    setMessages(chatHistory);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!answer.trim() || submitting) return;
    setSubmitting(true);
    const currentQ = questions[currentIndex];

    // Save response
    const { error } = await supabase.from("responses").insert({
      interview_id: interviewId!,
      question_id: currentQ.id,
      answer_text: answer.trim(),
    });

    if (error) {
      toast.error("Failed to save response");
      setSubmitting(false);
      return;
    }

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: answer.trim() }];
    setAnswer("");

    const nextIndex = currentIndex + 1;
    if (nextIndex >= questions.length) {
      // Interview complete
      setMessages(newMessages);
      setCompleted(true);
      setEvaluating(true);

      // Update interview status
      await supabase.from("interviews").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", interviewId!);

      // Trigger evaluation
      try {
        await supabase.functions.invoke("evaluate-interview", {
          body: { interviewId },
        });
        toast.success("Interview completed! Your responses are being evaluated.");
      } catch (err) {
        console.error("Evaluation error:", err);
      }
      setEvaluating(false);
    } else {
      newMessages.push({ role: "ai", content: questions[nextIndex].question_text });
      setMessages(newMessages);
      setCurrentIndex(nextIndex);
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center shadow-card">
          <CardContent className="p-8">
            <CheckCircle className="w-16 h-16 mx-auto text-success mb-4" />
            <h2 className="text-2xl font-display font-bold text-foreground mb-2">Interview Complete!</h2>
            <p className="text-muted-foreground mb-6">
              {evaluating ? "Your responses are being evaluated by AI..." : "Your interview has been submitted and evaluated."}
            </p>
            <Button onClick={() => navigate("/candidate/dashboard")}>View Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
              <Briefcase className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-foreground">AI Interview</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Question {currentIndex + 1} of {questions.length}
            </span>
          </div>
        </div>
        <div className="container mx-auto mt-2">
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      {/* Chat Area */}
      <div ref={chatRef} className="flex-1 overflow-y-auto p-4">
        <div className="container mx-auto max-w-2xl space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-foreground rounded-bl-md shadow-sm"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <div className="container mx-auto max-w-2xl flex gap-3">
          <Input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Type your answer..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={submitting}
            className="flex-1"
          />
          <Button onClick={handleSend} disabled={!answer.trim() || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
