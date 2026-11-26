import "./globals.css";
import type { ReactNode } from "react";

export const metadata = { title: "ProcessScope", description: "Process interviews → operational docs → Lean Six Sigma improvements" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
