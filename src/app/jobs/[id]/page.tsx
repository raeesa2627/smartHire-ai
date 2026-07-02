import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Briefcase, MapPin, Users } from "lucide-react";
import Link from "next/link";
import connectToDatabase from "@/lib/db";
import { Job } from "@/models/Job";
import mongoose from "mongoose";

type Job = {
  _id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  description: string;
};

export default async function JobDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await connectToDatabase();
  const job = await Job.findById(id).lean();

  if (!job) {
    notFound();
  }

  const jobData: Job = {
    _id: job._id.toString(),
    title: job.title,
    company: job.company,
    location: job.location,
    type: job.type,
    description: job.description,
  };

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/jobs">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{jobData.title}</h1>
          <p className="text-muted-foreground">{jobData.company}</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <CardTitle>Job Overview</CardTitle>
                <CardDescription className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" />
                    {jobData.company}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {jobData.location}
                  </span>
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Badge variant="secondary">{jobData.type}</Badge>
                <span className="flex items-center text-sm text-muted-foreground">
                  <Users className="mr-1 h-3 w-3" />
                  0 applicants
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Description</h3>
              <p className="text-sm text-muted-foreground">{jobData.description}</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Link href={`/candidates?jobId=${jobData._id}`}>
                <Button>View Candidates</Button>
              </Link>
              <Button variant="outline">Edit Job</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}