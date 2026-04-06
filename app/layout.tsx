import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@/app/globals.css";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: BRAND_NAME,
  description: "Hosted digital contact pages and event pages that stay behind one live QR code."
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
