import type { Metadata } from "next";
import { Suspense } from "react";
import { CommunicationsView } from "./communications-view";

export const metadata: Metadata = { title: "Comunicaciones" };

export default function CommunicationsPage() {
  return (
    <Suspense>
      <CommunicationsView />
    </Suspense>
  );
}
