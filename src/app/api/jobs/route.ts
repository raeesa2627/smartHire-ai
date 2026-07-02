import mongoose from "mongoose";
import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import { jobCreateSchema } from "@/lib/validators/job";

export const GET = async () => {
  try {
    await connectToDatabase();
    const jobs = await Job.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json(jobs);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch jobs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};

export const POST = async (request: Request) => {
  try {
    await connectToDatabase();
    const body = await request.json();
    const result = jobCreateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const job = await Job.create(result.data);
    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Failed to create job";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};