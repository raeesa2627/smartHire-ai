"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  Users,
  TrendingUp,
  Sparkles,
  Upload,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type DashboardActivity = {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  type: string;
};

type DashboardData = {
  activeJobs: number;
  totalCandidates: number;
  averageMatchScore: number;
  totalAIAnalyses: number;
  recentActivities: DashboardActivity[];
};

const initialDashboardData: DashboardData = {
  activeJobs: 0,
  totalCandidates: 0,
  averageMatchScore: 0,
  totalAIAnalyses: 0,
  recentActivities: [],
};

function formatRelativeTime(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime();

  if (Number.isNaN(diff)) {
    return "just now";
  }

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const [dashboardData, setDashboardData] = useState<DashboardData>(initialDashboardData);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Failed to load dashboard data");
      }

      const data = (await response.json()) as DashboardData;
      setDashboardData({
        activeJobs: data.activeJobs ?? 0,
        totalCandidates: data.totalCandidates ?? 0,
        averageMatchScore: data.averageMatchScore ?? 0,
        totalAIAnalyses: data.totalAIAnalyses ?? 0,
        recentActivities: data.recentActivities ?? [],
      });
    } catch {
      setDashboardData(initialDashboardData);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshDashboard();

    const interval = window.setInterval(() => {
      void refreshDashboard();
    }, 10000);

    const handleFocus = () => {
      void refreshDashboard();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [refreshDashboard]);

  const stats = [
    {
      title: "Active Jobs",
      value: isLoading ? "" : `${dashboardData.activeJobs}`,
      description: isLoading
        ? ""
        : dashboardData.activeJobs === 0
          ? "No active jobs yet"
          : `${dashboardData.activeJobs} open positions`,
      icon: Briefcase,
      color: "text-blue-500",
    },
    {
      title: "Total Candidates",
      value: isLoading ? "" : `${dashboardData.totalCandidates}`,
      description: isLoading
        ? ""
        : dashboardData.totalCandidates === 0
          ? "No resumes uploaded yet"
          : `${dashboardData.totalCandidates} uploaded resumes`,
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Avg Match Score",
      value: isLoading ? "" : `${Math.round(dashboardData.averageMatchScore)}%`,
      description: isLoading
        ? ""
        : dashboardData.averageMatchScore === 0
          ? "No analyses available yet"
          : "Average score from completed analyses",
      icon: TrendingUp,
      color: "text-purple-500",
    },
    {
      title: "AI Analyses",
      value: isLoading ? "" : `${dashboardData.totalAIAnalyses}`,
      description: isLoading
        ? ""
        : dashboardData.totalAIAnalyses === 0
          ? "No analyses completed yet"
          : `${dashboardData.totalAIAnalyses} completed analyses`,
      icon: Sparkles,
      color: "text-orange-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your recruitment pipeline
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ) : (
                <>
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <p className="text-xs text-muted-foreground">{stat.description}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Common tasks to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </>
            ) : (
              <>
                <Link href="/jobs/new">
                  <Button className="w-full justify-between">
                    Post a New Job
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/upload">
                  <Button variant="outline" className="w-full justify-between">
                    Upload Resumes
                    <Upload className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/candidates">
                  <Button variant="outline" className="w-full justify-between">
                    View Candidates
                    <Users className="h-4 w-4" />
                  </Button>
                </Link>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Latest updates from your recruitment pipeline
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="ml-4 flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="ml-auto h-3 w-12" />
                  </div>
                ))
              ) : dashboardData.recentActivities.length > 0 ? (
                dashboardData.recentActivities.map((activity) => {
                  const activityIcon =
                    activity.type === "job"
                      ? Briefcase
                      : activity.type === "resume"
                        ? Upload
                        : activity.type === "shortlist"
                          ? Users
                          : Sparkles;

                  const Icon = activityIcon;

                  return (
                    <div key={activity.id} className="flex items-center">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="ml-4 space-y-1">
                        <p className="text-sm font-medium">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {activity.description}
                        </p>
                      </div>
                      <div className="ml-auto font-medium text-xs text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted-foreground">
                  No recent activity yet.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
