import AppLayout from "@/app/(app)/layout";

export default function CandidatesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppLayout>{children}</AppLayout>;
}
