import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function generateMetadata(): Promise<Metadata> {
  const name = (await cookies()).get("visitor-name")?.value ?? "Guest";
  return { title: `Welcome, ${name}` };
}

// Renders nothing — its only job is to tell Next.js this page has intentional
// dynamic content, so the static parts around it can still prerender into a shell.
async function DynamicMarker() {
  await connection();
  return null;
}

export default function PersonalizedPage() {
  return (
    <div>
      <h1>Personalized Metadata</h1>
      <p>Static content — everything else on this page is knowable at build time.</p>
      <Suspense>
        <DynamicMarker />
      </Suspense>
    </div>
  );
}
