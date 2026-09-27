import type { Metadata } from "next";
import { Suspense } from "react";
import { RescheduleView } from "./reschedule-view";

export const metadata: Metadata = { title: "Elegir otra fecha" };

export default function ReschedulePage() {
  return (
    <Suspense>
      <RescheduleView />
    </Suspense>
  );
}
