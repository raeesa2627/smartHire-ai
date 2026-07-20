import { notFound } from "next/navigation";
import Link from "next/link";
import mongoose from "mongoose";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import { CandidateAnalysis } from "@/models/CandidateAnalysis";
import { Candidate } from "@/models/Candidate";
import { Resume } from "@/models/Resume";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Users,
  Sparkles,
  FileText,
  Clock,
  Upload,
  Brain,
  CheckCircle2,
  TrendingUp,
  Star,
  ChevronDown,
  AlertCircle,
  UserCheck,
} from "lucide-react";

// ─── Local types ──────────────────────────────────────────────────────────────

type JobDetail = {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  status: string;
  description: string;
  requirements: string[];
  skills: string[];
  experience?: string;
  education?: string;
};

type EnrichedAnalysis = {
  id: string;
  candidateName: string;
  resumeName: string;
  score: number;
  recommendation: string;
  matchingSkills: string[];
  skillGaps: string[];
  summary: string;
  createdAt: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScoreBadgeStyle(score: number): string {
  if (score >= 90) return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
  if (score >= 80) return "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/25";
  if (score >= 50) return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25";
  if (score > 0)   return "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/25";
  return "bg-muted/60 text-muted-foreground border-border";
}

function getRecommendationBadge(rec: string): { label: string; className: string } {
  const r = rec.toLowerCase();
  if (r.includes("strong hire"))                    return { label: "Strong Hire", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" };
  if (r.includes("hire") && !r.includes("not"))     return { label: "Hire",        className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" };
  if (r.includes("consider"))                       return { label: "Consider",    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" };
  if (r.includes("not") || r.includes("reject"))    return { label: "No Hire",     className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };
  if (r.length > 0)                                 return { label: "Reviewed",    className: "bg-muted/60 text-muted-foreground border-border" };
  return { label: "", className: "" };
}

function getStatusStyle(status: string): string {
  if (status === "Open")   return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  if (status === "Closed") return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
  return "bg-muted/60 text-muted-foreground border-border";
}

function formatTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return "recently";
  const m = Math.floor(diff / 60_000);
  if (m < 1)   return "just now";
  if (m < 60)  return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Pipeline stage config ────────────────────────────────────────────────────

const PIPELINE_STAGES = [
  {
    id:        "Applied"   as const,
    label:     "Applied",
    dot:       "bg-slate-400",
    colBg:     "bg-slate-50  dark:bg-slate-900/40",
    emptyText: "No unscored\ncandidates",
  },
  {
    id:        "Screening"  as const,
    label:     "Screening",
    dot:       "bg-rose-400",
    colBg:     "bg-rose-50/60 dark:bg-rose-950/20",
    emptyText: "No candidates\nin screening",
  },
  {
    id:        "Interview" as const,
    label:     "Interview",
    dot:       "bg-amber-400",
    colBg:     "bg-amber-50/60 dark:bg-amber-950/20",
    emptyText: "No candidates\nin interviews",
  },
  {
    id:        "Offer"     as const,
    label:     "Offer",
    dot:       "bg-blue-400",
    colBg:     "bg-blue-50/60 dark:bg-blue-950/20",
    emptyText: "No candidates\nwith offers",
  },
  {
    id:        "Hired"     as const,
    label:     "Hired",
    dot:       "bg-emerald-400",
    colBg:     "bg-emerald-50/60 dark:bg-emerald-950/20",
    emptyText: "No hires\nyet",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function JobDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) notFound();

  await connectToDatabase();

  // 1. Fetch job
  const rawJob = await Job.findById(id).lean();
  if (!rawJob) notFound();

  const job: JobDetail = {
    _id:          rawJob._id.toString(),
    title:        rawJob.title,
    company:      rawJob.company,
    location:     rawJob.location,
    type:         rawJob.type,
    status:       (rawJob.status as string | undefined) ?? "Open",
    description:  rawJob.description,
    requirements: (rawJob.requirements as string[] | undefined) ?? [],
    skills:       (rawJob.skills as string[] | undefined) ?? [],
    experience:   rawJob.experience as string | undefined,
    education:    rawJob.education as string | undefined,
  };

  // 2. Fetch all analyses for this job
  const rawAnalyses = await CandidateAnalysis.find({ jobId: id })
    .sort({ createdAt: -1 })
    .lean();

  const candidateIds = [
    ...new Set(
      rawAnalyses.map((a) => (a.candidateId ? String(a.candidateId) : "")).filter(Boolean)
    ),
  ];
  const resumeIds = [
    ...new Set(
      rawAnalyses.map((a) => (a.resumeId ? String(a.resumeId) : "")).filter(Boolean)
    ),
  ];

  const [rawCandidates, rawResumes] = await Promise.all([
    candidateIds.length > 0
      ? Candidate.find({ _id: { $in: candidateIds } }).lean()
      : Promise.resolve([]),
    resumeIds.length > 0
      ? Resume.find({ _id: { $in: resumeIds } }).lean()
      : Promise.resolve([]),
  ]);

  const candidateMap = new Map(rawCandidates.map((c) => [String(c._id), c]));
  const resumeMap    = new Map(rawResumes.map((r)    => [String(r._id), r]));

  // 3. Enrich analyses
  const analyses: EnrichedAnalysis[] = rawAnalyses.map((a) => {
    const candidate = a.candidateId ? candidateMap.get(String(a.candidateId)) : undefined;
    const resume    = a.resumeId    ? resumeMap.get(String(a.resumeId))       : undefined;
    const score     = Number((a.overallScore ?? a.matchScore) || 0);

    return {
      id:            String(a._id),
      candidateName:
        candidate?.name ??
        (resume?.candidateName as string | undefined) ??
        (resume?.fileName as string | undefined) ??
        "Unknown Candidate",
      resumeName:
        (resume?.fileName as string | undefined) ??
        (resume?.candidateName as string | undefined) ??
        "Resume",
      score,
      recommendation: (a.recommendation as string | undefined) ?? "",
      matchingSkills: (a.matchingSkills as string[] | undefined) ?? [],
      skillGaps:      (a.skillGaps      as string[] | undefined) ?? [],
      summary:        (a.summary        as string | undefined)   ?? "",
      createdAt:      a.createdAt
        ? new Date(a.createdAt as Date).toISOString()
        : new Date().toISOString(),
    };
  });

  // 4. Stage buckets
  const stageGroups: Record<string, EnrichedAnalysis[]> = {
    Applied:   analyses.filter((a) => a.score === 0),
    Screening: analyses.filter((a) => a.score > 0  && a.score < 50),
    Interview: analyses.filter((a) => a.score >= 50 && a.score < 80),
    Offer:     analyses.filter((a) => a.score >= 80 && a.score < 90),
    Hired:     analyses.filter((a) => a.score >= 90),
  };

  // 5. Summary stats
  const stats = {
    applicants: analyses.length,
    aiScreened: analyses.filter((a) => a.score > 0).length,
    interview:  stageGroups.Interview.length,
    offer:      stageGroups.Offer.length,
    hired:      stageGroups.Hired.length,
  };

  // 6. Sidebar: skill frequency maps
  const skillFreq = new Map<string, number>();
  const gapFreq   = new Map<string, number>();
  for (const a of analyses) {
    for (const s of a.matchingSkills) skillFreq.set(s, (skillFreq.get(s) ?? 0) + 1);
    for (const g of a.skillGaps)      gapFreq.set(g,   (gapFreq.get(g)   ?? 0) + 1);
  }
  const topSkills = [...skillFreq.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([s]) => s);
  const topGaps   = [...gapFreq.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([g]) => g);

  // 7. Top-scoring analysis for AI recommendation block
  const topAnalysis = [...analyses].sort((a, b) => b.score - a.score)[0] ?? null;

  // 8. Recent activity — already sorted desc, take first 5
  const recentAnalyses = analyses.slice(0, 5);

  const hasAnalyses = analyses.length > 0;

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-10">

      {/* ── Job Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link href="/jobs">
            <Button
              variant="ghost"
              size="icon"
              className="mt-0.5 shrink-0 h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>

          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {job.title}
              </h1>
              <Badge
                variant="outline"
                className={`text-xs font-semibold ${getStatusStyle(job.status)}`}
              >
                {job.status}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                {job.company}
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                {job.location}
              </span>
              <Badge variant="secondary" className="text-xs">
                {job.type}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pl-11 sm:pl-0 shrink-0">
          <Link href={`/candidates?jobId=${job._id}`}>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-sm border-border"
            >
              <Users className="h-3.5 w-3.5" />
              Candidates
            </Button>
          </Link>
          <Button variant="outline" size="sm" className="text-sm border-border">
            Edit Job
          </Button>
        </div>
      </div>

      {/* ── Summary Cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {(
          [
            {
              label: "Applicants",
              value: stats.applicants,
              Icon: Users,
              iconBg: "bg-slate-100 dark:bg-slate-800",
              iconText: "text-slate-500 dark:text-slate-400",
            },
            {
              label: "AI Screened",
              value: stats.aiScreened,
              Icon: Sparkles,
              iconBg: "bg-violet-50 dark:bg-violet-950/30",
              iconText: "text-violet-600 dark:text-violet-400",
            },
            {
              label: "Interview",
              value: stats.interview,
              Icon: TrendingUp,
              iconBg: "bg-amber-50 dark:bg-amber-950/30",
              iconText: "text-amber-600 dark:text-amber-400",
            },
            {
              label: "Offer",
              value: stats.offer,
              Icon: Star,
              iconBg: "bg-blue-50 dark:bg-blue-950/30",
              iconText: "text-blue-600 dark:text-blue-400",
            },
            {
              label: "Hired",
              value: stats.hired,
              Icon: CheckCircle2,
              iconBg: "bg-emerald-50 dark:bg-emerald-950/30",
              iconText: "text-emerald-600 dark:text-emerald-400",
            },
          ] as const
        ).map((s) => (
          <Card
            key={s.label}
            className="border border-border bg-card shadow-sm"
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    {s.label}
                  </p>
                  <p className="text-2xl font-bold tracking-tight text-foreground mt-0.5">
                    {s.value}
                  </p>
                </div>
                <div className={`rounded-lg p-2 shrink-0 ${s.iconBg}`}>
                  <s.Icon className={`h-4 w-4 ${s.iconText}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Empty state OR main content ─────────────────────────────────────── */}
      {!hasAnalyses ? (
        <Card className="border border-border bg-card shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-16 px-8 text-center">
            <div className="rounded-full bg-muted p-4">
              <AlertCircle className="h-7 w-7 text-muted-foreground" />
            </div>
            <h2 className="mt-5 text-base font-semibold text-foreground">
              No candidates have been analyzed for this position yet.
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground leading-relaxed">
              Upload resumes and run AI analysis to start building your hiring
              pipeline for this role.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link href="/upload">
                <Button className="gap-2">
                  <Upload className="h-4 w-4" />
                  Upload Resume
                </Button>
              </Link>
              <Link href={`/candidates?jobId=${job._id}`}>
                <Button variant="outline" className="gap-2 border-border">
                  <Users className="h-4 w-4" />
                  View Candidates
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

          {/* ── Left column ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0 space-y-6">

            {/* Pipeline header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Recruitment Pipeline
              </h2>
              <span className="text-xs text-muted-foreground">
                {analyses.length} candidate{analyses.length !== 1 ? "s" : ""}
              </span>
            </div>

            {/* Kanban board — horizontal scroll on narrow viewports */}
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {PIPELINE_STAGES.map((stage) => {
                const cards = stageGroups[stage.id] ?? [];
                return (
                  <div
                    key={stage.id}
                    className="w-[210px] flex-shrink-0 flex flex-col gap-2"
                  >
                    {/* Column label */}
                    <div className="flex items-center gap-2 px-0.5">
                      <span className={`h-2 w-2 rounded-full shrink-0 ${stage.dot}`} />
                      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider flex-1 truncate">
                        {stage.label}
                      </span>
                      <span className="text-[11px] font-bold text-muted-foreground bg-muted rounded px-1.5 py-0.5 leading-none">
                        {cards.length}
                      </span>
                    </div>

                    {/* Cards column */}
                    <div
                      className={`min-h-[140px] rounded-xl ${stage.colBg} border border-border/60 p-2 flex flex-col gap-2`}
                    >
                      {cards.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center py-8">
                          <p className="text-[11px] text-muted-foreground text-center leading-relaxed whitespace-pre-line">
                            {stage.emptyText}
                          </p>
                        </div>
                      ) : (
                        cards.map((c) => {
                          const rec = getRecommendationBadge(c.recommendation);
                          return (
                            <div
                              key={c.id}
                              className="rounded-lg border border-border bg-card p-3 flex flex-col gap-2.5 hover:shadow-sm transition-shadow duration-150 cursor-default"
                            >
                              {/* Candidate name */}
                              <p className="text-xs font-semibold text-foreground leading-tight truncate">
                                {c.candidateName}
                              </p>

                              {/* Resume filename */}
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                                <p className="text-[10px] text-muted-foreground truncate leading-none">
                                  {c.resumeName}
                                </p>
                              </div>

                              {/* Score + Recommendation */}
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-bold px-1.5 py-0 h-4 leading-none ${getScoreBadgeStyle(c.score)}`}
                                >
                                  {c.score}%
                                </Badge>
                                {rec.label && (
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-medium px-1.5 py-0 h-4 leading-none ${rec.className}`}
                                  >
                                    {rec.label}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Job Description — collapsible */}
            <Card className="border border-border bg-card shadow-sm overflow-hidden">
              <details className="group">
                <summary className="flex cursor-pointer list-none select-none items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors duration-150">
                  <div className="flex items-center gap-2.5">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold text-foreground">
                      Job Description
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform duration-200" />
                </summary>

                <div className="border-t border-border px-5 py-5 space-y-5">
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {job.description}
                  </p>

                  {job.requirements.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                        Requirements
                      </h3>
                      <ul className="space-y-1.5">
                        {job.requirements.map((req, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2.5 text-sm text-muted-foreground"
                          >
                            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                            {req}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {job.skills.length > 0 && (
                    <div>
                      <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2.5">
                        Required Skills
                      </h3>
                      <div className="flex flex-wrap gap-1.5">
                        {job.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="secondary"
                            className="text-xs"
                          >
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {(job.experience ?? job.education) && (
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      {job.experience && (
                        <span>
                          <span className="font-semibold text-foreground">
                            Experience:{" "}
                          </span>
                          {job.experience}
                        </span>
                      )}
                      {job.education && (
                        <span>
                          <span className="font-semibold text-foreground">
                            Education:{" "}
                          </span>
                          {job.education}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </Card>
          </div>

          {/* ── Right Sidebar ────────────────────────────────────────────────── */}
          <aside className="w-full lg:w-[288px] lg:shrink-0 space-y-4 lg:sticky lg:top-4">

            {/* AI Recommendation */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-amber-50 dark:bg-amber-950/30 p-1.5">
                    <Brain className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    AI Recommendation
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {topAnalysis ? (
                  <div className="rounded-lg bg-muted/40 border border-border/60 p-3 space-y-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-[11px] font-semibold text-muted-foreground">
                        {topAnalysis.candidateName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-1.5 py-0 h-4 leading-none ${getScoreBadgeStyle(topAnalysis.score)}`}
                      >
                        {topAnalysis.score}%
                      </Badge>
                      {getRecommendationBadge(topAnalysis.recommendation).label && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-medium px-1.5 py-0 h-4 leading-none ${getRecommendationBadge(topAnalysis.recommendation).className}`}
                        >
                          {getRecommendationBadge(topAnalysis.recommendation).label}
                        </Badge>
                      )}
                    </div>
                    {topAnalysis.summary && (
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-4">
                        {topAnalysis.summary}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No analysis data available.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Top Matching Skills */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-emerald-50 dark:bg-emerald-950/30 p-1.5">
                    <UserCheck className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Top Matching Skills
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {topSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {topSkills.map((skill) => (
                      <Badge
                        key={skill}
                        variant="outline"
                        className="text-[11px] bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No skill data yet.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Missing Skills */}
            {topGaps.length > 0 && (
              <Card className="border border-border bg-card shadow-sm">
                <CardHeader className="pb-3 pt-4 px-4">
                  <div className="flex items-center gap-2">
                    <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 p-1.5">
                      <AlertCircle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Missing Skills
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {topGaps.map((gap) => (
                      <Badge
                        key={gap}
                        variant="outline"
                        className="text-[11px] bg-rose-50/60 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800"
                      >
                        {gap}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Analyses */}
            <Card className="border border-border bg-card shadow-sm">
              <CardHeader className="pb-3 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <div className="rounded-md bg-muted p-1.5">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Recent Analyses
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                {recentAnalyses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No recent activity.
                  </p>
                ) : (
                  <div className="divide-y divide-border/60">
                    {recentAnalyses.map((a, i) => (
                      <div
                        key={a.id}
                        className={`flex items-center justify-between gap-2 ${i === 0 ? "pb-2.5" : i === recentAnalyses.length - 1 ? "pt-2.5" : "py-2.5"}`}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {a.candidateName}
                          </p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {formatTimeAgo(a.createdAt)}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold shrink-0 px-1.5 py-0 h-4 leading-none ${getScoreBadgeStyle(a.score)}`}
                        >
                          {a.score}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}