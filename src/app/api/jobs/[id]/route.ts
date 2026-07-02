import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import { jobUpdateSchema } from "@/lib/validators/job";

export const GET = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await Job.findById(id).lean();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const PUT = async (request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;
    const body = await request.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const result = jobUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const job = await Job.findByIdAndUpdate(id, result.data, { new: true, runValidators: true });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to update job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const DELETE = async (_request: Request, { params }: { params: Promise<{ id: string }> }) => {
  try {
    await connectToDatabase();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: "Invalid job ID" }, { status: 400 });
    }

    const job = await Job.findByIdAndDelete(id);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Job deleted successfully" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};