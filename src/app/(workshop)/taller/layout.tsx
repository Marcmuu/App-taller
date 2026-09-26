import type { Metadata } from "next";
import { WorkshopShell } from "@/components/workshop/workshop-shell";

export const metadata: Metadata = { title: "Panel del taller" };

export default function WorkshopLayout({ children }: LayoutProps<"/taller">) {
  return <WorkshopShell>{children}</WorkshopShell>;
}
