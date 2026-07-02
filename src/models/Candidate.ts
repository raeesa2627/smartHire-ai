import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
  },
  skills: [
    {
      type: String,
    },
  ],
  experience: [
    {
      type: mongoose.Schema.Types.Mixed,
    },
  ],
  education: [
    {
      type: mongoose.Schema.Types.Mixed,
    },
  ],
  resumeText: {
    type: String,
    required: true,
  },
  resumeFileUrl: {
    type: String,
  },
  matchScore: {
    type: Number,
    default: 0,
  },
  skillGaps: [
    {
      type: String,
    },
  ],
  aiExplanation: {
    type: String,
  },
  interviewQuestions: [
    {
      type: String,
    },
  ],
}, { timestamps: true });

export const Candidate = mongoose.models.Candidate || mongoose.model("Candidate", candidateSchema);
export type CandidateType = mongoose.InferSchemaType<typeof candidateSchema> & { _id: mongoose.Types.ObjectId };