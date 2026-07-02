import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { CandidateAnalysis } from "@/models/CandidateAnalysis";
import { Job } from "@/models/Job";
import { Resume } from "@/models/Resume";

export async function GET() {
  try {
    await connectToDatabase();

    const [activeJobs, totalCandidates, analysisSummary, latestJobs, latestResumes, latestAnalyses, shortlistedAnalyses] = await Promise.all([
      Job.countDocuments({
        $or: [{ status: "Open" }, { status: { $exists: false } }],
      }),
      Resume.countDocuments(),
      CandidateAnalysis.aggregate([
        {
          $group: {
            _id: null,
            averageMatchScore: {
              $avg: {
                $ifNull: ["$overallScore", "$matchScore"],
              },
            },
            totalAIAnalyses: { $sum: 1 },
          },
        },
      ]),
      Job.find({}).sort({ createdAt: -1 }).limit(3).select("title createdAt").lean(),
      Resume.find({}).sort({ createdAt: -1 }).limit(3).select("candidateName createdAt").lean(),
      CandidateAnalysis.find({}).sort({ createdAt: -1 }).limit(3).select("createdAt matchScore overallScore").lean(),
      CandidateAnalysis.find({
        $or: [{ overallScore: { $gte: 80 } }, { matchScore: { $gte: 80 } }],
      })
        .sort({ createdAt: -1 })
        .limit(1)
        .select("createdAt matchScore overallScore").lean(),
    ]);

    const summary = analysisSummary[0] ?? { averageMatchScore: 0, totalAIAnalyses: 0 };
    const averageMatchScore = Number(summary.averageMatchScore ?? 0);
    const totalAIAnalyses = Number(summary.totalAIAnalyses ?? 0);

    const recentActivities = [
      ...latestJobs.map((job) => ({
        id: `job-${job._id}`,
        title: "New Job Created",
        description: job.title,
        timestamp: job.createdAt,
        type: "job",
      })),
      ...latestResumes.map((resume) => ({
        id: `resume-${resume._id}`,
        title: "Resume Uploaded",
        description: resume.candidateName || "Candidate resume uploaded",
        timestamp: resume.createdAt,
        type: "resume",
      })),
      ...latestAnalyses.map((analysis) => ({
        id: `analysis-${analysis._id}`,
        title: "AI Analysis Completed",
        description: `Score ${Math.round((analysis.overallScore ?? analysis.matchScore ?? 0) * 10) / 10}`,
        timestamp: analysis.createdAt,
        type: "analysis",
      })),
      ...shortlistedAnalyses.map((analysis) => ({
        id: `shortlist-${analysis._id}`,
        title: "Candidate Shortlisted",
        description: `High match score ${Math.round((analysis.overallScore ?? analysis.matchScore ?? 0) * 10) / 10}`,
        timestamp: analysis.createdAt,
        type: "shortlist",
      })),
    ]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 6)
      .map((activity) => ({
        ...activity,
        timestamp: activity.timestamp instanceof Date ? activity.timestamp.toISOString() : activity.timestamp,
      }));

    return NextResponse.json({
      activeJobs,
      totalCandidates,
      averageMatchScore,
      totalAIAnalyses,
      recentActivities,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch dashboard data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
