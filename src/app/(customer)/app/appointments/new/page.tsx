import type { Metadata } from "next";
import { Suspense } from "react";
import { AppointmentWizard } from "./appointment-wizard";

export const metadata: Metadata = { title: "Solicitar cita" };

export default function NewAppointmentPage() {
  return (
    <Suspense>
      <AppointmentWizard />
    </Suspense>
  );
}
