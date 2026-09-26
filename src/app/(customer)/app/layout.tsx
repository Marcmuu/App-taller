import type { Metadata } from "next";
import { CustomerShell } from "@/components/customer/customer-shell";

export const metadata: Metadata = { title: "Mi coche" };

export default function CustomerLayout({ children }: LayoutProps<"/app">) {
  return <CustomerShell>{children}</CustomerShell>;
}
