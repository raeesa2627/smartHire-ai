"use client";

import { useCallback, useEffect, useState } from "react";
import { motion, type Variants } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Users,
  TrendingUp,
  Sparkles,
  Upload,
  ArrowRight,
  RefreshCw,
  Brain,
  CheckCircle2,
  AlertCircle,
  Plus,
  Clock,
  ScanLine,
  UserCheck,
} from "lucide-react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type DashboardActivity = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: string;
};

type DashboardData = {
  activeJobs: number;
  totalCandidates: number;
  averageMatchScore: number;
  totalAIAnalyses: number;
  recentActivities: DashboardActivity[];
};

type CandidateAnalysisData = {
  _id: string;
  candidateId?: string;
  resumeId?: string;
  jobId?: string;
  overallScore?: number;
  matchScore?: number;
  skillMatch?: number;
  experienceMatch?: number;
  educationMatch?: number;
  projectMatch?: number;
  matchingSkills?: string[];
  skillGaps?: string[];
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
  recommendation?: string;
  confidence?: number;
  candidateName?: string;
  resumeName?: string;
  createdAt?: string;
};

const initialDashboardData: DashboardData = {
  activeJobs: 0,
  totalCandidates: 0,
  averageMatchScore: 0,
  totalAIAnalyses: 0,
  recentActivities: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();

  if (Number.isNaN(diff)) {
    return "just now";
  }

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getRecommendation(score: number, recommendation?: string) {
  const normalized = recommendation?.toLowerCase() ?? "";

  if (normalized.includes("strong hire")) {
    return { label: "Strong Hire", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  }

  if (normalized.includes("not recommended")) {
    return { label: "Not Recommended", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
  }

  if (normalized.includes("consider")) {
    return { label: "Consider", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  }

  if (score >= 80) {
    return { label: "Strong Hire", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  }

  if (score >= 60) {
    return { label: "Consider", className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  }

  return { label: "Not Recommended", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
}

// ─── Animation Variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

// ─── Activity Config ──────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ className?: string }>;

interface ActivityConfig {
  iconBg: string;
  iconColor: string;
  borderColor: string;
  icon: IconComponent;
}

const activityConfigs: Record<string, ActivityConfig> = {
  job: {
    iconBg: "bg-blue-50 dark:bg-blue-950/30",
    iconColor: "text-blue-600 dark:text-blue-400",
    borderColor: "border-blue-100 dark:border-blue-900/30",
    icon: Briefcase,
  },
  resume: {
    iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-100 dark:border-emerald-900/30",
    icon: Upload,
  },
  analysis: {
    iconBg: "bg-violet-50 dark:bg-violet-950/30",
    iconColor: "text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-100 dark:border-violet-900/30",
    icon: Sparkles,
  },
  shortlist: {
    iconBg: "bg-amber-50 dark:bg-amber-950/30",
    iconColor: "text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-100 dark:border-amber-900/30",
    icon: Users,
  },
};

const fallbackActivityConfig: ActivityConfig = activityConfigs.analysis;

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [dashboardData, setDashboardData] =
    useState<DashboardData>(initialDashboardData);
  const [candidates, setCandidates] = useState<CandidateAnalysisData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshDashboard = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const data = (await response.json()) as DashboardData;
      setDashboardData({
        activeJobs: data.activeJobs ?? 0,
        totalCandidates: data.totalCandidates ?? 0,
        averageMatchScore: data.averageMatchScore ?? 0,
        totalAIAnalyses: data.totalAIAnalyses ?? 0,
        recentActivities: data.recentActivities ?? [],
      });

      // Fetch /api/candidate-analyses only if the dashboard API does not already provide
      // the required candidate analysis information.
      // Since /api/dashboard only returns simple activity logs and counts,
      // it doesn't contain detailed candidate analysis fields (e.g. candidateName, overallScore).
      // We only perform this fetch if candidate records actually exist.
      if (data.totalCandidates > 0) {
        setIsLoadingCandidates(true);
        try {
          const res = await fetch("/api/candidate-analyses", { cache: "no-store" });
          if (res.ok) {
            const analyses = (await res.json()) as CandidateAnalysisData[];
            setCandidates(analyses);
          }
        } catch (e) {
          console.error("Failed to load candidate analyses", e);
        } finally {
          setIsLoadingCandidates(false);
        }
      } else {
        setCandidates([]);
      }
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
      setDashboardData(initialDashboardData);
      setCandidates([]);
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // Avoid calling setState synchronously within an effect
    const initTimer = setTimeout(() => {
      void refreshDashboard();
    }, 0);

    const interval = window.setInterval(() => {
      void refreshDashboard();
    }, 15000);

    const handleFocus = () => {
      void refreshDashboard();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearTimeout(initTimer);
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshDashboard]);

  // ─── Derived Values ─────────────────────────────────────────────────────────

  const {
    activeJobs,
    totalCandidates,
    averageMatchScore,
    totalAIAnalyses,
    recentActivities,
  } = dashboardData;

  const analysisCoverage =
    totalCandidates > 0
      ? Math.min(100, Math.round((totalAIAnalyses / totalCandidates) * 100))
      : 0;

  const scoreRating =
    averageMatchScore >= 80
      ? {
          label: "Excellent",
          textColor: "text-emerald-600 dark:text-emerald-400",
          bgColor: "bg-emerald-50 dark:bg-emerald-950/20",
          borderColor: "border-emerald-100 dark:border-emerald-900/30",
        }
      : averageMatchScore >= 60
        ? {
            label: "Good",
            textColor: "text-amber-600 dark:text-amber-400",
            bgColor: "bg-amber-50 dark:bg-amber-950/20",
            borderColor: "border-amber-100 dark:border-amber-900/30",
          }
        : averageMatchScore > 0
          ? {
              label: "Needs Review",
              textColor: "text-rose-600 dark:text-rose-400",
              bgColor: "bg-rose-50 dark:bg-rose-950/20",
              borderColor: "border-rose-100 dark:border-rose-900/30",
            }
          : {
              label: "No Data Yet",
              textColor: "text-muted-foreground",
              bgColor: "bg-muted/40",
              borderColor: "border-border/60",
            };

  const contextualRecommendation: {
    text: string;
    RecommendationIcon: IconComponent;
    color: string;
  } =
    activeJobs === 0
      ? {
          text: "Start by posting your first job opening to begin building your pipeline.",
          RecommendationIcon: Briefcase,
          color: "text-blue-500 dark:text-blue-400",
        }
      : totalCandidates === 0
        ? {
            text: "Upload candidate resumes to begin AI-powered analysis.",
            RecommendationIcon: Upload,
            color: "text-emerald-500 dark:text-emerald-400",
          }
        : totalAIAnalyses === 0
          ? {
              text: "Run AI analysis on uploaded resumes to get match scores and insights.",
              RecommendationIcon: Sparkles,
              color: "text-amber-500 dark:text-amber-400",
            }
          : analysisCoverage < 50
            ? {
                text: `${100 - analysisCoverage}% of uploaded resumes haven't been analyzed yet. Consider running more analyses.`,
                RecommendationIcon: AlertCircle,
                color: "text-amber-500 dark:text-amber-400",
              }
            : {
                text: "Pipeline looks healthy. Review top-scoring candidates for shortlisting.",
                RecommendationIcon: CheckCircle2,
                color: "text-emerald-500 dark:text-emerald-400",
              };

  const { RecommendationIcon, text: recommendationText, color: recommendationColor } =
    contextualRecommendation;

  // KPI card definitions
  const kpiCards = [
    {
      title: "Active Jobs",
      value: `${activeJobs}`,
      description:
        activeJobs === 0
          ? "No open positions"
          : `${activeJobs} open position${activeJobs !== 1 ? "s" : ""}`,
      Icon: Briefcase,
      accentText: "text-blue-600 dark:text-blue-400",
      accentBg: "bg-blue-50 dark:bg-blue-950/30",
      borderColor: "border-l-blue-500",
    },
    {
      title: "Total Candidates",
      value: `${totalCandidates}`,
      description:
        totalCandidates === 0
          ? "No resumes uploaded"
          : `${totalCandidates} resume${totalCandidates !== 1 ? "s" : ""} in pipeline`,
      Icon: Users,
      accentText: "text-emerald-600 dark:text-emerald-400",
      accentBg: "bg-emerald-50 dark:bg-emerald-950/30",
      borderColor: "border-l-emerald-500",
    },
    {
      title: "Avg Match Score",
      value: averageMatchScore > 0 ? `${Math.round(averageMatchScore)}%` : "—",
      description:
        averageMatchScore === 0
          ? "No analyses available"
          : "Average across completed analyses",
      Icon: TrendingUp,
      accentText: "text-violet-600 dark:text-violet-400",
      accentBg: "bg-violet-50 dark:bg-violet-950/30",
      borderColor: "border-l-violet-500",
    },
    {
      title: "AI Analyses",
      value: `${totalAIAnalyses}`,
      description:
        totalAIAnalyses === 0
          ? "No analyses completed"
          : `${totalAIAnalyses} completed`,
      Icon: Sparkles,
      accentText: "text-amber-600 dark:text-amber-400",
      accentBg: "bg-amber-50 dark:bg-amber-950/30",
      borderColor: "border-l-amber-500",
    },
  ];

  // Quick Action tiles
  const quickActions = [
    {
      href: "/jobs/new",
      label: "Post a New Job",
      desc: "Create a job listing",
      Icon: Briefcase,
      bg: "bg-blue-50 dark:bg-blue-950/30",
      color: "text-blue-600 dark:text-blue-400",
    },
    {
      href: "/upload",
      label: "Upload Resumes",
      desc: "Add candidates to pipeline",
      Icon: Upload,
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      color: "text-emerald-600 dark:text-emerald-400",
    },
    {
      href: "/candidates",
      label: "View Candidates",
      desc: "Browse the talent pool",
      Icon: Users,
      bg: "bg-violet-50 dark:bg-violet-950/30",
      color: "text-violet-600 dark:text-violet-400",
    },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 pb-6 animate-pulse">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-32" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="h-28 border border-border/80">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-6 rounded" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="h-24 border border-border/80">
          <CardContent className="h-full flex items-center p-6">
            <Skeleton className="h-6 w-full" />
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="h-80 border border-border/80">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-3 w-48" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
                <Skeleton className="h-12 w-full rounded-md" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pb-6 text-foreground"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI Recruitment Command Center
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Overview of your hiring pipeline and candidate intelligence.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refreshDashboard(true)}
            disabled={isRefreshing}
            className="gap-2 text-sm border-border hover:bg-accent"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/jobs/new">
            <Button size="sm" className="gap-2 text-sm">
              <Plus className="h-3.5 w-3.5" />
              Post a Job
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {kpiCards.map((card) => (
          <Card
            key={card.title}
            className={`relative overflow-hidden border border-border border-l-4 ${card.borderColor} bg-card shadow-sm transition-all duration-200 hover:shadow-md h-full`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4">
              <CardTitle className="text-sm font-semibold text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-1.5 ${card.accentBg}`}>
                <card.Icon className={`h-4 w-4 ${card.accentText}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-foreground">
                {card.value}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {card.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Conditional Layout: Onboarding Empty State OR Dashboard Insights & Lists */}
      {totalCandidates === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="border border-border bg-card shadow-sm">
            <CardContent className="flex flex-col items-center justify-center p-8 text-center sm:p-12">
              <div className="rounded-full bg-primary/10 p-3 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Start Building Your Talent Pipeline
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Follow these three simple steps to unlock AI-powered candidate discovery, automated scoring, and fit insights.
              </p>

              <div className="mt-8 grid gap-6 text-left sm:grid-cols-3 max-w-4xl w-full">
                <div className="rounded-lg border border-border p-4 bg-muted/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-semibold text-sm">
                    1
                  </div>
                  <h3 className="mt-3 font-semibold text-sm text-foreground">Post a Job Opening</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Define the requirements and skills for your open roles to configure target match profiles.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 font-semibold text-sm">
                    2
                  </div>
                  <h3 className="mt-3 font-semibold text-sm text-foreground">Upload Resumes</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Drop candidate PDF files in the Uploader. SmartHire automatically extracts details.
                  </p>
                </div>

                <div className="rounded-lg border border-border p-4 bg-muted/20">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 font-semibold text-sm">
                    3
                  </div>
                  <h3 className="mt-3 font-semibold text-sm text-foreground">Run AI Analysis</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Initiate scoring to compare experience alignment, skill gaps, and interview readiness.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/upload">
                  <Button className="gap-2 font-medium">
                    <Upload className="h-4 w-4" />
                    Upload Resumes
                  </Button>
                </Link>
                <Link href="/jobs/new">
                  <Button variant="outline" className="gap-2 font-medium border-border hover:bg-accent">
                    <Briefcase className="h-4 w-4" />
                    Post a Job
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <>
          {/* ATS Hiring Pipeline */}
          <motion.div variants={itemVariants}>
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">Hiring Pipeline</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-0.5">
                      Candidate funnel · {activeJobs} active job{activeJobs !== 1 ? "s" : ""}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-6">
                {(() => {
                  const highMatchCount = candidates.filter((c) => {
                    const score = c.overallScore ?? c.matchScore ?? 0;
                    return score >= 80;
                  }).length;

                  const stages = [
                    {
                      id: "applied",
                      label: "Applied",
                      description: "Resumes uploaded",
                      count: totalCandidates,
                      Icon: Upload,
                      href: "/upload",
                      actionLabel: "View Candidates",
                      iconBg: "bg-slate-100 dark:bg-slate-800",
                      iconColor: "text-slate-600 dark:text-slate-400",
                    },
                    {
                      id: "screened",
                      label: "AI Screened",
                      description: "Analyses completed",
                      count: totalAIAnalyses,
                      Icon: ScanLine,
                      href: "/candidates",
                      actionLabel: "Review Analyses",
                      iconBg: "bg-slate-100 dark:bg-slate-800",
                      iconColor: "text-slate-600 dark:text-slate-400",
                    },
                    {
                      id: "high-match",
                      label: "High Match",
                      description: "Score ≥ 80",
                      count: highMatchCount,
                      Icon: UserCheck,
                      href: "/candidates",
                      actionLabel: "View Matches",
                      iconBg: "bg-slate-100 dark:bg-slate-800",
                      iconColor: "text-slate-600 dark:text-slate-400",
                    },
                  ];

                  return (
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch sm:gap-3">
                      {stages.map((stage, idx) => (
                        <div key={stage.id} className="flex flex-col sm:flex-row sm:items-center flex-1 min-w-0 gap-4 sm:gap-3">

                          {/* Connector — shown only between stages */}
                          {idx > 0 && (
                            <div className="flex sm:flex-col items-center justify-center shrink-0">
                              <ArrowRight className="h-4 w-4 text-border sm:rotate-90" />
                            </div>
                          )}

                          {/* Stage card */}
                          <div className="flex-1 min-w-0 rounded-xl border border-border bg-card hover:border-border/80 hover:shadow-sm transition-all duration-150 p-5 flex flex-col gap-4">
                            {/* Icon + Label row */}
                            <div className="flex items-center gap-2.5">
                              <div className={`rounded-md p-1.5 ${stage.iconBg} shrink-0`}>
                                <stage.Icon className={`h-3.5 w-3.5 ${stage.iconColor}`} />
                              </div>
                              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                {stage.label}
                              </span>
                            </div>

                            {/* Count — primary focus */}
                            <div>
                              <div className="text-4xl font-bold tracking-tight text-foreground leading-none">
                                {stage.count.toLocaleString()}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1.5">
                                {stage.description}
                              </div>
                            </div>

                            {/* Action link */}
                            <div className="mt-auto pt-3 border-t border-border/60">
                              <Link
                                href={stage.href}
                                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors group/link"
                              >
                                {stage.actionLabel}
                                <ArrowRight className="h-3 w-3 group-hover/link:translate-x-0.5 transition-transform" />
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </motion.div>

          {/* 3-Column Row: AI Insights | Recent Candidates | Quick Actions */}
          <motion.div
            variants={itemVariants}
            className="grid gap-4 lg:grid-cols-3"
          >
            {/* AI Insights */}
            <Card className="border border-border bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-1.5">
                    <Brain className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">AI Insights</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Real-time assessment intelligence
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                {/* Match quality */}
                <div
                  className={`rounded-lg border p-3.5 ${scoreRating.bgColor} ${scoreRating.borderColor}`}
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground">
                      Avg Match Quality
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs font-semibold px-2 py-0.5 border-current/25 bg-background/50 ${scoreRating.textColor}`}
                    >
                      {scoreRating.label}
                    </Badge>
                  </div>
                  <div className={`text-2xl font-bold tracking-tight ${scoreRating.textColor}`}>
                    {averageMatchScore > 0
                      ? `${Math.round(averageMatchScore)}%`
                      : "—"}
                  </div>
                </div>

                {/* Analysis coverage */}
                <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                  <div className="mb-1 text-xs font-semibold text-muted-foreground">
                    Analysis Coverage
                  </div>
                  <div className="text-sm font-bold text-foreground">
                    {totalCandidates === 0
                      ? "No candidates uploaded yet"
                      : `${analysisCoverage}% of pipeline analyzed`}
                  </div>
                  {totalCandidates > 0 && (
                    <Progress value={analysisCoverage} className="mt-2.5 h-1.5 bg-muted" />
                  )}
                </div>

                {/* Contextual recommendation */}
                <div className="rounded-lg border border-border bg-muted/20 p-3.5">
                  <div className="mb-2 flex items-center gap-1.5">
                    <RecommendationIcon
                      className={`h-3.5 w-3.5 ${recommendationColor}`}
                    />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Recommendation
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80 font-medium">
                    {recommendationText}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Candidates */}
            <Card className="border border-border bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="rounded-lg bg-violet-50 dark:bg-violet-950/30 p-1.5">
                      <Users className="h-4 w-4 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Recent Candidates</CardTitle>
                      <CardDescription className="text-xs text-muted-foreground">
                        Latest applicants in the database
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/candidates">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground font-medium"
                    >
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col justify-start">
                {isLoadingCandidates ? (
                  <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                        <div className="flex-1 space-y-1.5">
                          <Skeleton className="h-3.5 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                        <Skeleton className="h-5 w-12 rounded" />
                      </div>
                    ))}
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                    <div className="rounded-full bg-violet-50 dark:bg-violet-950/30 p-2.5">
                      <Sparkles className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div className="mt-3">
                      <p className="text-sm font-semibold">No candidates analyzed yet</p>
                      <p className="mt-1 max-w-[200px] text-xs text-muted-foreground leading-normal">
                        Candidates uploaded but not evaluated. Run AI analysis to calculate scores.
                      </p>
                    </div>
                    <Link href="/candidates" className="mt-4">
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs font-semibold border-border hover:bg-accent">
                        <Sparkles className="h-3 w-3" />
                        Go to Candidates
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                    {candidates.slice(0, 4).map((candidate) => {
                      const score = candidate.overallScore ?? candidate.matchScore ?? 0;
                      const badgeInfo = getRecommendation(score, candidate.recommendation);

                      return (
                        <div
                          key={candidate._id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/5 p-2.5 transition-colors hover:bg-muted/20"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-foreground">
                              {candidate.candidateName || "Candidate"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground mt-0.5">
                              {candidate.resumeName || "Uploaded Resume"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-semibold tracking-tight px-1.5 py-0.5 ${badgeInfo.className}`}
                            >
                              {badgeInfo.label}
                            </Badge>
                            <span className="text-sm font-bold text-foreground">
                              {Math.round(score)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border border-border bg-card shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-1.5">
                    <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Common workspace actions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 flex-1 justify-start flex flex-col">
                {quickActions.map(({ href, label, desc, Icon, bg, color }) => (
                  <Link key={href} href={href}>
                    <div className="group flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-muted/5 p-3 transition-all duration-150 hover:bg-muted/20">
                      <div className={`rounded-lg p-2 ${bg}`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                          {label}
                        </p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-foreground" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity Timeline */}
          <motion.div variants={itemVariants}>
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="rounded-lg bg-muted p-1.5">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                      Latest updates from your recruitment pipeline
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="flex items-center gap-3 rounded-lg border border-dashed border-border/80 p-4 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>
                      No recent activity yet. Start by posting a job or uploading resumes.
                    </span>
                  </div>
                ) : (
                  <div className="relative">
                    {recentActivities.map((activity, index) => {
                      const config =
                        activityConfigs[activity.type] ?? fallbackActivityConfig;
                      const ActivityIcon = config.icon;
                      const isLast = index === recentActivities.length - 1;

                      return (
                        <div
                          key={activity.id}
                          className="relative flex gap-4 pb-4"
                        >
                          {/* Vertical connector line */}
                          {!isLast && (
                            <div className="absolute left-4 top-8 bottom-0 w-px bg-border" />
                          )}

                          {/* Icon bubble */}
                          <div
                            className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${config.iconBg} ${config.borderColor}`}
                          >
                            <ActivityIcon
                              className={`h-3.5 w-3.5 ${config.iconColor}`}
                            />
                          </div>

                          {/* Content */}
                          <div className="flex min-w-0 flex-1 items-start justify-between gap-2 pt-1">
                            <div className="min-w-0">
                              <p className="text-sm font-bold leading-tight text-foreground">
                                {activity.title}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {activity.description}
                              </p>
                            </div>
                            <span className="shrink-0 text-xs text-muted-foreground font-medium">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
