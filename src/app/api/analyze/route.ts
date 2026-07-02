import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { analyzeResumeWithAi } from "@/lib/ai-analysis";
import { Candidate } from "@/models/Candidate";
import { CandidateAnalysis } from "@/models/CandidateAnalysis";
import { Job } from "@/models/Job";
import { Resume } from "@/models/Resume";

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();
    const jobId = body?.jobId;
    const resumeIds = Array.isArray(body?.resumeIds) ? body.resumeIds : [];

    if (!jobId || resumeIds.length === 0) {
      return NextResponse.json({ error: "Please select a job and at least one resume" }, { status: 400 });
    }

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    const resumes = await Resume.find({ _id: { $in: resumeIds } }).lean();
    if (!resumes.length) {
      return NextResponse.json({ error: "No valid resumes found" }, { status: 404 });
    }

    const analyses = [] as Array<Record<string, unknown>>;

    for (const resume of resumes) {
      const analysisResult = await analyzeResumeWithAi(job as never, resume as never);

      const candidate = await Candidate.findOneAndUpdate(
        { email: resume.candidateEmail || `${resume._id}@local.resume` },
        {
          $setOnInsert: {
            name: resume.candidateName || resume.fileName || "Unknown Candidate",
            email: resume.candidateEmail || `${resume._id}@local.resume`,
            phone: resume.candidatePhone || "",
            skills: resume.skills || [],
            experience: resume.experience || [],
            education: resume.education || [],
            resumeText: resume.parsedText || "",
            resumeFileUrl: resume.fileUrl || "",
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const analysis = await CandidateAnalysis.create({
        candidateId: candidate._id,
        resumeId: resume._id,
        jobId: job._id,
        overallScore: analysisResult.overallScore,
        matchScore: analysisResult.overallScore,
        skillMatch: analysisResult.skillMatch,
        experienceMatch: analysisResult.experienceMatch,
        educationMatch: analysisResult.educationMatch,
        projectMatch: analysisResult.projectMatch,
        matchingSkills: analysisResult.matchedSkills,
        skillGaps: analysisResult.missingSkills,
        strengths: analysisResult.strengths,
        weaknesses: analysisResult.weaknesses,
        summary: analysisResult.summary,
        recommendation: analysisResult.recommendation,
        confidence: analysisResult.confidence,
        aiExplanation: `${analysisResult.summary} ${analysisResult.recommendation}`,
      });

      analyses.push(analysis.toObject());
    }

    const responsePayload = analyses.map((analysis) => ({
      overallScore: Number(analysis.overallScore ?? analysis.matchScore ?? 0),
      skillMatch: Number(analysis.skillMatch ?? 0),
      experienceMatch: Number(analysis.experienceMatch ?? 0),
      educationMatch: Number(analysis.educationMatch ?? 0),
      projectMatch: Number(analysis.projectMatch ?? 0),
      matchedSkills: Array.isArray(analysis.matchingSkills) ? analysis.matchingSkills : [],
      missingSkills: Array.isArray(analysis.skillGaps) ? analysis.skillGaps : [],
      strengths: Array.isArray(analysis.strengths) ? analysis.strengths : [],
      weaknesses: Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [],
      summary: typeof analysis.summary === "string" ? analysis.summary : "",
      recommendation: typeof analysis.recommendation === "string" ? analysis.recommendation : "",
      confidence: Number(analysis.confidence ?? 0),
    }));

    return NextResponse.json(responsePayload, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to analyze candidates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
