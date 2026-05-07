import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata({
    title: "Reschedule Appointment",
    description: "Choose a new date and time for your appointment.",
    canonical: "/book/reschedule",
    noindex: true,
  });
}

export default function RescheduleLayout({ children }: { children: React.ReactNode }) {
  return children;
}
