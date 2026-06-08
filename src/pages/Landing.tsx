import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  BarChart3,
  MessageSquareText,
  Briefcase,
  Shield,
  Zap,
  Users,
  CheckCircle2,
  Star,
  ChevronRight,
  Sparkles,
} from "lucide-react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

const stats = [
  { value: "85%", label: "Time Saved on Screening" },
  { value: "3x", label: "Faster Hiring Cycles" },
  { value: "94%", label: "Candidate Satisfaction" },
  { value: "10K+", label: "Interviews Conducted" },
];

const features = [
  {
    icon: Brain,
    title: "AI-Powered Interviews",
    description:
      "Intelligent, adaptive text-based interviews that evaluate candidates on skills, communication, and problem-solving.",
  },
  {
    icon: BarChart3,
    title: "Smart Scoring Engine",
    description:
      "Get detailed candidate scorecards with skill breakdowns, strengths, weaknesses, and hire/reject recommendations.",
  },
  {
    icon: MessageSquareText,
    title: "Structured Conversations",
    description:
      "Scenario-based, behavioral, and technical questions auto-generated from your job description.",
  },
  {
    icon: Briefcase,
    title: "Job Marketplace",
    description:
      "Candidates discover and apply to roles in a polished marketplace with one-click applications.",
  },
  {
    icon: Shield,
    title: "Bias-Free Evaluation",
    description:
      "Consistent, objective assessments for every candidate — no more gut feelings or inconsistent interviews.",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description:
      "Evaluations are generated immediately after interview completion. No waiting days for feedback.",
  },
];

const steps = [
  {
    step: "01",
    title: "Post a Job",
    description: "Create a detailed job listing with requirements, skills, and evaluation criteria.",
  },
  {
    step: "02",
    title: "AI Analyzes & Prepares",
    description: "Our AI studies your JD and generates a tailored interview strategy and question set.",
  },
  {
    step: "03",
    title: "Candidates Interview",
    description: "Applicants take a structured, chat-based interview on their own schedule.",
  },
  {
    step: "04",
    title: "Review & Hire",
    description: "Get scored reports, ranked candidates, and AI recommendations — all in one dashboard.",
  },
];

const testimonials = [
  {
    name: "Sarah Chen",
    role: "VP of Engineering, TechScale",
    quote:
      "We cut our screening time by 80% and found better candidates. The AI interview questions are surprisingly nuanced.",
    rating: 5,
  },
  {
    name: "Marcus Williams",
    role: "Head of Talent, GrowthLoop",
    quote:
      "The scoring engine is incredibly consistent. We finally have a fair, data-driven hiring process that candidates love.",
    rating: 5,
  },
  {
    name: "Priya Patel",
    role: "Founder, DevHire",
    quote:
      "From posting a job to getting ranked candidates with detailed reports — it all happens in hours, not weeks.",
    rating: 5,
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <Logo size={40} />
            <span className="text-lg font-display font-bold tracking-tight">
              RecruitIQ
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Testimonials
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Sign In
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="gradient-primary border-0 text-primary-foreground shadow-md hover:shadow-lg transition-shadow">
                Get Started Free
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        {/* Background grid */}
        <div className="absolute inset-0 -z-10">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
              backgroundSize: "64px 64px",
            }}
          />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-secondary/5 blur-[100px]" />
        </div>

        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial="hidden"
              animate="visible"
              custom={0}
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 mb-8"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-medium text-primary">
                AI-Powered Hiring Platform
              </span>
            </motion.div>

            <motion.h1
              initial="hidden"
              animate="visible"
              custom={1}
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold tracking-tight leading-[1.1] mb-6"
            >
              Hire smarter with{" "}
              <span className="relative">
                <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  AI interviews
                </span>
              </span>
              <br />
              that actually work
            </motion.h1>

            <motion.p
              initial="hidden"
              animate="visible"
              custom={2}
              variants={fadeUp}
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
            >
              Post jobs, let AI conduct structured interviews, and get scored
              candidate reports — all on autopilot. Cut screening time by 85%
              without sacrificing quality.
            </motion.p>

            <motion.div
              initial="hidden"
              animate="visible"
              custom={3}
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link to="/auth">
                <Button
                  size="lg"
                  className="gradient-primary border-0 text-primary-foreground h-12 px-8 text-base shadow-lg hover:shadow-xl transition-all"
                >
                  Start Hiring for Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                  See How It Works
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </a>
            </motion.div>
          </div>

          {/* Hero visual — mock dashboard */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mt-16 md:mt-24 max-w-5xl mx-auto"
          >
            <div className="relative rounded-xl border border-border/60 bg-card shadow-xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3 bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="bg-muted rounded-md px-4 py-1 text-xs text-muted-foreground font-mono">
                    recruitiq.app/company/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="p-6 md:p-8 grid md:grid-cols-3 gap-4">
                {[
                  { label: "Open Positions", value: "12", change: "+3 this week", icon: Briefcase },
                  { label: "Interviews Completed", value: "148", change: "+24 today", icon: MessageSquareText },
                  { label: "Top Candidates", value: "37", change: "Ready for review", icon: Users },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-lg border border-border/60 bg-background p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {item.label}
                      </span>
                      <item.icon className="h-4 w-4 text-muted-foreground/60" />
                    </div>
                    <p className="text-2xl font-display font-bold">{item.value}</p>
                    <p className="text-xs text-secondary mt-1">{item.change}</p>
                  </div>
                ))}
                {/* Candidate list preview */}
                <div className="md:col-span-3 rounded-lg border border-border/60 bg-background p-4 mt-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
                    Recent Candidates
                  </p>
                  <div className="space-y-2">
                    {[
                      { name: "Alex Rivera", score: 92, rec: "Hire" },
                      { name: "Jordan Lee", score: 78, rec: "Consider" },
                      { name: "Sam Nguyen", score: 85, rec: "Hire" },
                    ].map((c) => (
                      <div
                        key={c.name}
                        className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                            {c.name[0]}
                          </div>
                          <span className="text-sm font-medium">{c.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-display font-bold">{c.score}/100</span>
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              c.rec === "Hire"
                                ? "bg-success/10 text-success"
                                : "bg-warning/10 text-warning"
                            }`}
                          >
                            {c.rec}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {/* Glow under card */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-16 bg-primary/10 blur-3xl rounded-full -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-border/60 bg-muted/20">
        <div className="container mx-auto px-6 py-12 md:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="text-center"
              >
                <p className="text-3xl md:text-4xl font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  {s.value}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">
              Features
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
              Everything you need to hire with confidence
            </h2>
            <p className="text-muted-foreground text-lg">
              From job posting to final recommendation — our AI handles the
              heavy lifting so your team can focus on what matters.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Card className="h-full border-border/60 bg-card hover:shadow-card-hover hover:border-primary/20 transition-all duration-300 group">
                  <CardContent className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                      <f.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 md:py-32 bg-muted/20 border-y border-border/60">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3 block">
              How It Works
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
              Four steps to your next great hire
            </h2>
            <p className="text-muted-foreground text-lg">
              A streamlined workflow that takes you from job description to
              scored candidate shortlist.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {steps.map((s, i) => (
              <motion.div
                key={s.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
                className="relative text-center md:text-left"
              >
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-[calc(50%+32px)] right-[-16px] h-px border-t-2 border-dashed border-border" />
                )}
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full gradient-primary text-primary-foreground font-display font-bold text-sm mb-4">
                  {s.step}
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-3 block">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-4">
              Trusted by fast-growing teams
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                custom={i}
                variants={fadeUp}
              >
                <Card className="h-full border-border/60 bg-card">
                  <CardContent className="p-6">
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: t.rating }).map((_, idx) => (
                        <Star
                          key={idx}
                          className="h-4 w-4 fill-warning text-warning"
                        />
                      ))}
                    </div>
                    <p className="text-sm leading-relaxed mb-6 text-foreground/90">
                      "{t.quote}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full gradient-accent flex items-center justify-center text-xs font-bold text-accent-foreground">
                        {t.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{t.name}</p>
                        <p className="text-xs text-muted-foreground">{t.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-6">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            custom={0}
            variants={fadeUp}
            className="relative max-w-4xl mx-auto rounded-2xl gradient-hero p-10 md:p-16 text-center overflow-hidden"
          >
            <div className="absolute inset-0 opacity-10">
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "radial-gradient(hsl(var(--primary-foreground)) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground tracking-tight mb-4">
                Ready to transform your hiring?
              </h2>
              <p className="text-primary-foreground/70 text-lg max-w-xl mx-auto mb-8">
                Join hundreds of companies using AI-powered interviews to find
                the best talent faster and fairer.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/auth">
                  <Button
                    size="lg"
                    className="bg-primary-foreground text-foreground hover:bg-primary-foreground/90 h-12 px-8 text-base shadow-lg"
                  >
                    Get Started — It's Free
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 py-10">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-sm font-display font-bold">RecruitIQ</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</a>
            <a href="#testimonials" className="hover:text-foreground transition-colors">Testimonials</a>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RecruitIQ. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
