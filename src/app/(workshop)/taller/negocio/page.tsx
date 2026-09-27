import type { Metadata } from "next";
import { BusinessView } from "./business-view";

export const metadata: Metadata = { title: "Mi taller y tarjetas QR" };

export default function BusinessPage() {
  return <BusinessView />;
}
