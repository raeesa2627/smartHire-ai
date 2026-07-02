import mongoose from "mongoose";

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  company: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ["Full-time", "Part-time", "Contract", "Internship"],
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  requirements: [
    {
      type: String,
    },
  ],
  skills: [
    {
      type: String,
    },
  ],
  experience: {
    type: String,
  },
  education: {
    type: String,
  },
  status: {
    type: String,
    enum: ["Open", "Closed", "Draft"],
    default: "Open",
  },
}, { timestamps: true });

export const Job = mongoose.models.Job || mongoose.model("Job", jobSchema);
export type JobType = mongoose.InferSchemaType<typeof jobSchema> & { _id: mongoose.Types.ObjectId };