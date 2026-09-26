import type { Metadata } from "next";
import { Suspense } from "react";
import { VehiclesView } from "./vehicles-view";

export const metadata: Metadata = { title: "Mis vehículos" };

export default function VehiclesPage() {
  return (
    <Suspense>
      <VehiclesView />
    </Suspense>
  );
}
