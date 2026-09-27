import type { Metadata } from "next";
import { CalendarView } from "./calendar-view";

export const metadata: Metadata = { title: "Calendario" };

export default function CalendarPage() {
  return <CalendarView />;
}
