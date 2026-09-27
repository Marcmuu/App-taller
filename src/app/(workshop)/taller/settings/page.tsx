import type { Metadata } from "next";
import { SettingsView } from "./settings-view";

export const metadata: Metadata = { title: "Horario y citas" };

export default function SettingsPage() {
  return <SettingsView />;
}
