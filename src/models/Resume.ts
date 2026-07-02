import mongoose from "mongoose";

export interface ResumeParsedData {
  candidateName: string;
  candidateEmail: string;
  candidatePhone: string;
  skills: string[];
  education: string[];
  experience: string[];
  projects: string[];
  certifications: string[];
}

const resumeSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Candidate",
  },
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Job",
  },
  fileUrl: {
    type: String,
    required: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileSize: {
    type: Number,
  },
  storageType: {
    type: String,
    default: "local",
  },
  storagePath: {
    type: String,
  },
  candidateName: {
    type: String,
  },
  candidateEmail: {
    type: String,
  },
  candidatePhone: {
    type: String,
  },
  skills: [{ type: String }],
  education: [{ type: String }],
  experience: [{ type: String }],
  projects: [{ type: String }],
  certifications: [{ type: String }],
  parsedText: {
    type: String,
  },
  matchScore: {
    type: Number,
    default: 0,
  },
  analysisResult: {
    type: mongoose.Schema.Types.Mixed,
  },
}, { timestamps: true });

export const Resume = mongoose.models.Resume || mongoose.model("Resume", resumeSchema);
export type ResumeType = mongoose.InferSchemaType<typeof resumeSchema> & { _id: mongoose.Types.ObjectId };