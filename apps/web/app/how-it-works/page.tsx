import Link from "next/link";
import { SERVICE } from "@/components/site";

// Old URL from earlier outreach: forward to the service's How it works page.
export const metadata = { title: "How it works · shule", robots: { index: false } };

export default function OldHowItWorks() {
  return (
    <main className="section" style={{ padding: 48 }}>
      <meta httpEquiv="refresh" content="0; url=../diagnosis/how-it-works/" />
      <p>This page moved. <Link href={SERVICE.how}>Go to How it works →</Link></p>
    </main>
  );
}
