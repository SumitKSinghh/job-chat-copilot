import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AuthPage from "./pages/Auth";
import Landing from "./pages/Landing";
import CandidateHome from "./pages/CandidateHome";
import CandidateDashboard from "./pages/CandidateDashboard";
import CompanyDashboard from "./pages/CompanyDashboard";
import CreateJob from "./pages/CreateJob";
import JobDetail from "./pages/JobDetail";
import InterviewPage from "./pages/InterviewPage";
import ResumeBuilder from "./pages/ResumeBuilder";
import CandidateCompare from "./pages/CandidateCompare";
import RecruitIQAssistant from "./pages/RecruitIQAssistant";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    );
  }

  if (role === "company") {
    return (
      <Routes>
        <Route path="/" element={<Navigate to="/company/dashboard" replace />} />
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/create-job" element={<CreateJob />} />
        <Route path="/company/job/:jobId" element={<JobDetail />} />
        <Route path="/company/job/:jobId/compare" element={<CandidateCompare />} />
        <Route path="/company/assistant" element={<RecruitIQAssistant />} />
        <Route path="/auth" element={<Navigate to="/company/dashboard" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    );
  }

  // candidate or no role yet
  return (
    <Routes>
      <Route path="/" element={<CandidateHome />} />
      <Route path="/candidate/dashboard" element={<CandidateDashboard />} />
      <Route path="/interview/:interviewId" element={<InterviewPage />} />
      <Route path="/candidate/resume-builder" element={<ResumeBuilder />} />
      <Route path="/auth" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
