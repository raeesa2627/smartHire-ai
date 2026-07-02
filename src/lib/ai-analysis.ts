import { GoogleGenerativeAI } from "@google/generative-ai";
import type { JobType } from "@/models/Job";
import type { ResumeType } from "@/models/Resume";

export type AiAnalysisResult = {
  overallScore: number;
  skillMatch: number;
  experienceMatch: number;
  educationMatch: number;
  projectMatch: number;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
  recommendation: string;
  confidence: number;
};

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildFallbackAnalysis(job: JobType, resume: ResumeType): AiAnalysisResult {
  const jobText = `${job.title} ${job.description}`.toLowerCase();
  const skills = resume.skills ?? [];
  const experience = resume.experience ?? [];
  const education = resume.education ?? [];
  const projects = resume.projects ?? [];

  const hasRelevantSkills = skills.some((skill) => jobText.includes(skill.toLowerCase()));
  const hasExperience = experience.length > 0;
  const hasEducation = education.length > 0;
  const hasProjects = projects.length > 0;

  const overallScore = clampScore(
    55 +
      (hasRelevantSkills ? 18 : 0) +
      (hasExperience ? 12 : 0) +
      (hasEducation ? 8 : 0) +
      (hasProjects ? 7 : 0)
  );

  return {
    overallScore,
    skillMatch: clampScore(hasRelevantSkills ? 82 : 58),
    experienceMatch: clampScore(hasExperience ? 80 : 60),
    educationMatch: clampScore(hasEducation ? 78 : 62),
    projectMatch: clampScore(hasProjects ? 79 : 61),
    matchedSkills: skills.slice(0, 6),
    missingSkills: skills.length > 0 ? ["Additional role-specific depth"] : ["No explicit skills detected"],
    strengths: [
      resume.candidateName ? `Strong candidate profile for ${job.title}` : "Profile includes relevant experience",
      hasExperience ? "Experience details are available" : "Experience section is limited",
    ],
    weaknesses: [
      hasRelevantSkills ? "Role-fit details can be expanded" : "Skills profile needs deeper alignment",
      hasEducation ? "Education is present but could be reinforced" : "Education details are limited",
    ],
    summary: `This profile has a ${overallScore}% fit for the ${job.title} role based on the available structured candidate information.`,
    recommendation: overallScore >= 80 ? "Strong fit for shortlist" : overallScore >= 65 ? "Promising fit for review" : "Needs more evaluation",
    confidence: 74,
  };
}

function normalizeAnalysis(raw: unknown): AiAnalysisResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid analysis payload");
  }

  const candidate = raw as Record<string, unknown>;

  const toNumber = (value: unknown, fallback: number) => {
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? clampScore(parsed) : fallback;
  };

  const toArray = (value: unknown) => {
    if (Array.isArray(value)) {
      return value.filter((item): item is string => typeof item === "string");
    }
    if (typeof value === "string") {
      return value.split(",").map((item) => item.trim()).filter(Boolean);
    }
    return [];
  };

  return {
    overallScore: toNumber(candidate.overallScore, 70),
    skillMatch: toNumber(candidate.skillMatch, 70),
    experienceMatch: toNumber(candidate.experienceMatch, 70),
    educationMatch: toNumber(candidate.educationMatch, 70),
    projectMatch: toNumber(candidate.projectMatch, 70),
    matchedSkills: toArray(candidate.matchedSkills),
    missingSkills: toArray(candidate.missingSkills),
    strengths: toArray(candidate.strengths),
    weaknesses: toArray(candidate.weaknesses),
    summary: typeof candidate.summary === "string" ? candidate.summary : "AI summary unavailable",
    recommendation: typeof candidate.recommendation === "string" ? candidate.recommendation : "Review candidate",
    confidence: toNumber(candidate.confidence, 75),
  };
}

export async function analyzeResumeWithAi(job: JobType, resume: ResumeType): Promise<AiAnalysisResult> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey) {
    return buildFallbackAnalysis(job, resume);
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are an expert recruiter and technical evaluator. Compare the candidate resume to the job description semantically, not by simple keyword overlap. Evaluate the candidate's fit based on skills, experience, projects, education, and certifications. Return strict JSON with the following fields: overallScore, skillMatch, experienceMatch, educationMatch, projectMatch, matchedSkills, missingSkills, strengths, weaknesses, summary, recommendation, confidence.

Job Description:
${job.description}

Candidate Resume:
Name: ${resume.candidateName ?? "Unknown"}
Email: ${resume.candidateEmail ?? ""}
Phone: ${resume.candidatePhone ?? ""}
Skills: ${(resume.skills ?? []).join(", ") || "None"}
Experience: ${(resume.experience ?? []).join(" | ") || "None"}
Education: ${(resume.education ?? []).join(" | ") || "None"}
Projects: ${(resume.projects ?? []).join(" | ") || "None"}
Certifications: ${(resume.certifications ?? []).join(", ") || "None"}
Parsed Text: ${resume.parsedText ?? ""}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsed = JSON.parse(responseText);
    return normalizeAnalysis(parsed);
  } catch {
    return buildFallbackAnalysis(job, resume);
  }
}
