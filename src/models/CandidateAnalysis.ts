import mongoose from "mongoose";

const candidateAnalysisSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
    required: true,
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Resume",
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
    required: true,
  },
  matchScore: {
    type: Number,
    default: 0,
  },
  overallScore: {
    type: Number,
    default: 0,
  },
  skillMatch: {
    type: Number,
    default: 0,
  },
  experienceMatch: {
    type: Number,
    default: 0,
  },
  educationMatch: {
    type: Number,
    default: 0,
  },
  projectMatch: {
    type: Number,
    default: 0,
  },
  confidence: {
    type: Number,
    default: 0,
  },
  matchingSkills: [{ type: String }],
  skillGaps: [{ type: String }],
  strengths: [{ type: String }],
  weaknesses: [{ type: String }],
  summary: {
    type: String,
  },
  recommendation: {
    type: String,
  },
  aiExplanation: {
    type: String,
  },
  interviewQuestions: [
    {
      type: String,
    },
  ],
  analysisData: {
    type: mongoose.Schema.Types.Mixed,
  },
}, { timestamps: true });

if (mongoose.models.CandidateAnalysis) {
  mongoose.deleteModel("CandidateAnalysis");
}

export const CandidateAnalysis = mongoose.model("CandidateAnalysis", candidateAnalysisSchema);
export type CandidateAnalysisType = mongoose.InferSchemaType<typeof candidateAnalysisSchema> & { _id: mongoose.Types.ObjectId };