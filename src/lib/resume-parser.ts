import type { ResumeParsedData } from "@/models/Resume";

const normalize = (value: string) => value.replace(/\s+/g, " ").trim();

const parseList = (text: string, heading: string) => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const startIndex = lines.findIndex((line) => line.toLowerCase().includes(heading.toLowerCase()));

  if (startIndex === -1) {
    return [];
  }

  const items: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^(skills|education|experience|projects|certifications|summary|contact|name|email|phone)$/i.test(line)) {
      break;
    }
    if (line.length < 60 && !/^https?:\/\//i.test(line)) {
      items.push(normalize(line));
    }
  }

  return items.filter(Boolean);
};

export function extractResumeData(text: string): ResumeParsedData {
  const normalized = normalize(text);
  const emailMatch = normalized.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  const phoneMatch = normalized.match(/(?:\+?\d[\d\s().-]{7,}\d)/);

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const name = lines.find((line) => /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+$/.test(line)) ?? "";

  const skills = parseList(text, "skills")
    .map((item) => item.replace(/^[-•]\s*/, ""))
    .filter(Boolean);

  const education = parseList(text, "education")
    .map((item) => item.replace(/^[-•]\s*/, ""))
    .filter(Boolean);

  const experience = parseList(text, "experience")
    .map((item) => item.replace(/^[-•]\s*/, ""))
    .filter(Boolean);

  const projects = parseList(text, "projects")
    .map((item) => item.replace(/^[-•]\s*/, ""))
    .filter(Boolean);

  const certifications = parseList(text, "certifications")
    .map((item) => item.replace(/^[-•]\s*/, ""))
    .filter(Boolean);

  return {
    candidateName: name || "",
    candidateEmail: emailMatch?.[0] || "",
    candidatePhone: phoneMatch?.[0] || "",
    skills,
    education,
    experience,
    projects,
    certifications,
  };
}
