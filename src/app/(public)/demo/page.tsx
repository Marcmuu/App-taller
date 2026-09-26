import type { Metadata } from "next";
import { DemoStage } from "./demo-stage";

export const metadata: Metadata = { title: "Demo cliente + taller" };

export default function DemoPage() {
  return <DemoStage />;
}
