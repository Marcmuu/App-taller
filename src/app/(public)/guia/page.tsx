import type { Metadata } from "next";
import { GuideView } from "./guide-view";

export const metadata: Metadata = {
  title: "Guía de uso",
  description: "Cómo funciona la app del taller: cliente y taller, paso a paso.",
};

export default function GuidePage() {
  return <GuideView />;
}
