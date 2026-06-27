import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { Logo } from "@/components/Logo";
import { RecruitIQChat } from "@/components/RecruitIQChat";

export default function RecruitIQAssistant() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="h-9 md:h-11" />
            <span className="font-display font-bold text-lg text-foreground">RecruitIQ</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-1" /> Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Button variant="ghost" onClick={() => navigate("/company/dashboard")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to dashboard
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold text-foreground">RecruitIQ Hiring Assistant</h1>
          <p className="text-muted-foreground mt-1">Search candidates across all your jobs in natural language.</p>
        </div>
        <RecruitIQChat
          scopeLabel="All your jobs and candidates"
          quickPrompts={[
            "Who are my strongest candidates this week?",
            "List candidates with 5+ years of React experience",
            "Any red flags I should review before interviews?",
            "Summarize hiring pipeline health",
          ]}
        />
      </main>
    </div>
  );
}
