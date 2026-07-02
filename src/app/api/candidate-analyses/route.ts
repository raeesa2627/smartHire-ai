import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Candidate } from "@/models/Candidate";
import { CandidateAnalysis } from "@/models/CandidateAnalysis";
import { Resume } from "@/models/Resume";

export async function GET() {
  try {
    await connectToDatabase();
    const analyses = await CandidateAnalysis.find({}).sort({ createdAt: -1 }).lean();

    const latestByCandidate = new Map<string, (typeof analyses)[number]>();
    for (const analysis of analyses) {
      const candidateId = analysis.candidateId ? String(analysis.candidateId) : "";
      if (!candidateId || latestByCandidate.has(candidateId)) {
        continue;
      }
      latestByCandidate.set(candidateId, analysis);
    }

    const latestAnalyses = Array.from(latestByCandidate.values()).sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    });

    const candidateIds = latestAnalyses
      .map((analysis) => (analysis.candidateId ? String(analysis.candidateId) : ""))
      .filter(Boolean);

    const resumeIds = latestAnalyses
      .map((analysis) => (analysis.resumeId ? String(analysis.resumeId) : ""))
      .filter(Boolean);

    const [candidates, resumes] = await Promise.all([
      Candidate.find({ _id: { $in: candidateIds } }).lean(),
      Resume.find({ _id: { $in: resumeIds } }).lean(),
    ]);

    const candidateMap = new Map(candidates.map((candidate) => [String(candidate._id), candidate]));
    const resumeMap = new Map(resumes.map((resume) => [String(resume._id), resume]));

    const enrichedAnalyses = latestAnalyses.map((analysis) => {
      const candidateId = analysis.candidateId ? String(analysis.candidateId) : "";
      const resumeId = analysis.resumeId ? String(analysis.resumeId) : "";
      const candidate = candidateId ? candidateMap.get(candidateId) : undefined;
      const resume = resumeId ? resumeMap.get(resumeId) : undefined;

      return {
        ...analysis,
        candidateName: candidate?.name || resume?.candidateName || resume?.fileName || "Candidate",
        resumeName: resume?.fileName || resume?.candidateName || "Resume",
      };
    });

    return NextResponse.json(enrichedAnalyses);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch analyses";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body?.candidateId || !body?.jobId) {
      return NextResponse.json({ error: "Please provide candidateId and jobId" }, { status: 400 });
    }

    const analysis = await CandidateAnalysis.create(body);
    return NextResponse.json(analysis, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to create analysis";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
