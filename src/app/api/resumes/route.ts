import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";
import { PDFParse } from "pdf-parse";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { extractResumeData } from "@/lib/resume-parser";
import { Resume } from "@/models/Resume";

export async function GET() {
  try {
    await connectToDatabase();
    const resumes = await Resume.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(resumes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch resumes";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await connectToDatabase();

    const pdfWorkerPath = path.resolve(
      process.cwd(),
      "node_modules",
      "pdfjs-dist",
      "legacy",
      "build",
      "pdf.worker.mjs"
    );
    PDFParse.setWorker(pathToFileURL(pdfWorkerPath).href);

    const formData = await request.formData();
    const files = formData.getAll("files");

    if (files.length === 0) {
      return NextResponse.json({ error: "Please select at least one PDF file" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads", "resumes");
    await fs.mkdir(uploadDir, { recursive: true });

    const savedResumes = [] as Array<Record<string, unknown>>;

    for (const entry of files) {
      if (!(entry instanceof File)) {
        continue;
      }

      if (entry.type !== "application/pdf") {
        return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
      }

      const fileBuffer = Buffer.from(await entry.arrayBuffer());
      const safeName = entry.name.replace(/[^a-zA-Z0-9.-]/g, "-");
      const fileName = `${Date.now()}-${safeName}`;
      const filePath = path.join(uploadDir, fileName);
      const fileUrl = `/uploads/resumes/${fileName}`;

      await fs.writeFile(filePath, fileBuffer);
      const parser = new PDFParse({ data: fileBuffer, verbosity: 0 });
      const pdfData = await parser.getText();
      const parsedData = extractResumeData(pdfData.text);

      const resume = await Resume.create({
        fileUrl,
        fileName: entry.name,
        fileSize: entry.size,
        storageType: "local",
        storagePath: filePath,
        parsedText: pdfData.text,
        candidateName: parsedData.candidateName,
        candidateEmail: parsedData.candidateEmail,
        candidatePhone: parsedData.candidatePhone,
        skills: parsedData.skills,
        education: parsedData.education,
        experience: parsedData.experience,
        projects: parsedData.projects,
        certifications: parsedData.certifications,
      });

      savedResumes.push(resume.toObject());
    }

    return NextResponse.json(savedResumes, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to create resume";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
