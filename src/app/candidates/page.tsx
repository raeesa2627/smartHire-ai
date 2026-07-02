"use client";

import { useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, FileText, Loader2, Sparkles, Upload, X } from "lucide-react";
import { toast } from "sonner";

type JobOption = {
  _id: string;
  title: string;
};

type ResumeOption = {
  _id: string;
  candidateName?: string;
  fileName?: string;
  candidateEmail?: string;
};

type AnalysisResult = {
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

function getScoreLabel(value?: number) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "—";
  }

  return `${Math.round(value)}%`;
}

function getRecommendation(score: number, recommendation?: string) {
  const normalized = recommendation?.toLowerCase() ?? "";

  if (normalized.includes("strong hire")) {
    return { label: "Strong Hire", variant: "default" as const };
  }

  if (normalized.includes("not recommended")) {
    return { label: "Not Recommended", variant: "destructive" as const };
  }

  if (normalized.includes("consider")) {
    return { label: "Consider", variant: "secondary" as const };
  }

  if (score >= 80) {
    return { label: "Strong Hire", variant: "default" as const };
  }

  if (score >= 60) {
    return { label: "Consider", variant: "secondary" as const };
  }

  return { label: "Not Recommended", variant: "destructive" as const };
}

export default function CandidatesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [jobs, setJobs] = useState<JobOption[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [selectedJobId, setSelectedJobId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  const onDrop = (acceptedFiles: File[]) => {
    setFiles((prev) => [...prev, ...acceptedFiles]);
    toast.success(`${acceptedFiles.length} file(s) selected for analysis`);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: {
      "application/pdf": [".pdf"],
    },
  });

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const fetchData = async () => {
    try {
      const [jobsResponse, analysesResponse] = await Promise.all([
        fetch("/api/jobs"),
        fetch("/api/candidate-analyses"),
      ]);

      if (jobsResponse.ok) {
        const jobsData = (await jobsResponse.json()) as JobOption[];
        setJobs(jobsData);
        if (!selectedJobId && jobsData[0]) {
          setSelectedJobId(jobsData[0]._id);
        }
      }

      if (analysesResponse.ok) {
        const analysesData = (await analysesResponse.json()) as AnalysisResult[];
        setAnalyses(analysesData);
      }
    } catch {
      toast.error("Failed to load candidate data");
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  const analyzeCandidates = async () => {
    if (!selectedJobId) {
      toast.error("Please select a job.");
      return;
    }

    if (files.length === 0) {
      toast.error("Please upload at least one resume.");
      return;
    }

    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));

      const uploadResponse = await fetch("/api/resumes", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json().catch(() => null);

      if (!uploadResponse.ok) {
        throw new Error(uploadData?.error || "Failed to upload resumes");
      }

      const uploadedResumeIds = Array.isArray(uploadData)
        ? uploadData.map((resume: any) => resume._id).filter(Boolean)
        : [];

      if (uploadedResumeIds.length === 0) {
        throw new Error("No resumes were uploaded for analysis.");
      }

      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: selectedJobId, resumeIds: uploadedResumeIds }),
      });
      const analyzeData = await analyzeResponse.json().catch(() => null);

      if (!analyzeResponse.ok) {
        throw new Error(analyzeData?.error || "Failed to analyze candidates");
      }

      toast.success("AI analysis completed successfully.");
      setFiles([]);
      await fetchData();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to analyze candidates";
      toast.error(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Candidates</h1>
        <p className="text-muted-foreground">Upload and analyze resumes with AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Resumes</CardTitle>
          <CardDescription>Upload PDF resumes to analyze and rank candidates</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
              isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">
              {isDragActive ? "Drop files here" : "Drag & drop resumes here, or click to browse"}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Supports PDF, DOC, DOCX up to 10MB</p>
          </div>

          {files.length > 0 && (
            <div className="mt-4 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 space-y-3">
            <label className="text-sm font-medium">Select a Job</label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={selectedJobId}
              onChange={(event) => setSelectedJobId(event.target.value)}
            >
              {jobs.length === 0 ? (
                <option value="">No jobs available</option>
              ) : (
                jobs.map((job) => (
                  <option key={job._id} value={job._id}>
                    {job.title}
                  </option>
                ))
              )}
            </select>

            <div className="space-y-3">
              <Button
                onClick={() => void analyzeCandidates()}
                disabled={isAnalyzing || !selectedJobId || files.length === 0}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Analyze with AI
                  </>
                )}
              </Button>
              {!selectedJobId ? (
                <p className="text-sm text-rose-300">Please select a job.</p>
              ) : files.length === 0 ? (
                <p className="text-sm text-rose-300">Please upload at least one resume.</p>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Candidate Rankings</CardTitle>
          <CardDescription>Latest AI-powered candidate match results from MongoDB</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading candidate results...
            </div>
          ) : analyses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No AI analyses are available yet. Select a job and uploaded resumes to generate rankings.
            </p>
          ) : (
            <div className="space-y-4">
              {analyses.map((analysis) => {
                const score = Number(analysis.overallScore ?? analysis.matchScore ?? 0);
                const recommendation = getRecommendation(score, analysis.recommendation);

                const metrics = [
                  { label: "Skill Match", value: analysis.skillMatch },
                  { label: "Experience Match", value: analysis.experienceMatch },
                  { label: "Education Match", value: analysis.educationMatch },
                  { label: "Project Match", value: analysis.projectMatch },
                  { label: "Confidence Score", value: analysis.confidence },
                ];

                return (
                  <div key={analysis._id} className="rounded-lg border p-4 space-y-4">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold">
                            {analysis.candidateName || analysis.resumeName || "Candidate Analysis"}
                          </h3>
                          <Badge variant={score >= 80 ? "default" : "secondary"}>{getScoreLabel(score)} Match</Badge>
                          <Badge variant={recommendation.variant}>{recommendation.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {analysis.summary || "No AI summary is available for this candidate yet."}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-emerald-500" />
                        <span>{analysis.createdAt ? new Date(analysis.createdAt).toLocaleDateString() : "Recent"}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Overall Match</span>
                        <span>{getScoreLabel(score)}</span>
                      </div>
                      <Progress value={Math.min(100, Math.max(0, score))} />
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                      {metrics.map((metric) => (
                        <div key={metric.label} className="rounded-md border bg-muted/30 p-3">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                          <p className="mt-1 text-lg font-semibold">{getScoreLabel(metric.value)}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Matched Skills</h4>
                        {Array.isArray(analysis.matchingSkills) && analysis.matchingSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {analysis.matchingSkills.map((skill) => (
                              <Badge key={skill} variant="outline">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No matched skills recorded.</p>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Missing Skills</h4>
                        {Array.isArray(analysis.skillGaps) && analysis.skillGaps.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {analysis.skillGaps.map((skill) => (
                              <Badge key={skill} variant="secondary">
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No skill gaps recorded.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Strengths</h4>
                        {Array.isArray(analysis.strengths) && analysis.strengths.length > 0 ? (
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {analysis.strengths.map((strength) => (
                              <li key={strength} className="flex gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-emerald-500" />
                                <span>{strength}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No strengths were captured.</p>
                        )}
                      </div>
                      <div>
                        <h4 className="mb-2 text-sm font-semibold">Weaknesses</h4>
                        {Array.isArray(analysis.weaknesses) && analysis.weaknesses.length > 0 ? (
                          <ul className="space-y-2 text-sm text-muted-foreground">
                            {analysis.weaknesses.map((weakness) => (
                              <li key={weakness} className="flex gap-2">
                                <span className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                                <span>{weakness}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-muted-foreground">No weaknesses were captured.</p>
                        )}
                      </div>
                    </div>

                    <div className="rounded-md border bg-muted/30 p-3">
                      <h4 className="mb-1 text-sm font-semibold">AI Summary</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysis.summary || "No AI summary is available for this candidate yet."}
                      </p>
                    </div>

                    <div className="rounded-md border border-dashed p-3">
                      <h4 className="mb-1 text-sm font-semibold">Hiring Recommendation</h4>
                      <p className="text-sm text-muted-foreground">
                        {analysis.recommendation || recommendation.label}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
