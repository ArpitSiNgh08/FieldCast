import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/ui/Card";

export const metadata: Metadata = {
  title: "Privacy Policy — FieldCast",
  description: "Privacy Policy explaining how FieldCast collects, uses, and protects user data and Google Drive integration details.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">
          ← Back to FieldCast
        </Link>
        <h1 className="mt-3 font-sans text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: September 7, 2026
        </p>
      </div>

      <Card className="space-y-8 p-6 sm:p-8">
        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            1. Information We Collect
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            FieldCast respects your privacy. We collect only the information necessary to provide live sports streaming, real-time scorecard updates, and video clip exports:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>
              <strong>Account & Profile Information:</strong> Name, email address, and hashed authentication credentials when you register or log in using password or Google OAuth.
            </li>
            <li>
              <strong>Google Account & OAuth Tokens:</strong> When an organizer links Google Drive for clip storage, we securely process OAuth access tokens to upload clip files to your selected Google Drive folder.
            </li>
            <li>
              <strong>Tournament & Match Data:</strong> Team rosters, player details, score updates, camera stream configurations, and event logs.
            </li>
            <li>
              <strong>Viewer Analytics:</strong> Anonymous, unique viewer identifiers to calculate live spectator metrics per match.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            2. How We Use Your Information
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>To authenticate users and enforce tournament organizer access controls.</li>
            <li>To synchronize live scores and multi-camera stream feeds via WebSockets.</li>
            <li>To process and upload 2-minute match clip highlight videos to linked Google Drive destinations upon organizer request.</li>
            <li>To maintain stream health and platform reliability.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            3. Google Drive API Disclosure
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            FieldCast's use and transfer of information received from Google APIs to any other app will adhere to the{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              target="_blank"
              rel="noreferrer"
              className="text-accent underline"
            >
              Google API Services User Data Policy
            </a>
            , including the Limited Use requirements. We request only the permissions needed to upload requested match clips into your chosen Google Drive folder. We do not read, modify, or delete unrelated user files in your Google Drive.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            4. Data Sharing & Third-Party Services
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            We do not sell your personal data. We share data only with infrastructure providers required to operate FieldCast:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li><strong>Database Hosting:</strong> Neon PostgreSQL for database storage.</li>
            <li><strong>Cloud Hosting & CDN:</strong> Vercel for frontend hosting and Oracle Cloud / SRS for video stream relay.</li>
            <li><strong>Google Drive API:</strong> For exporting match clip highlights to organizer accounts.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            5. Security & Data Retention
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            We implement industry-standard encryption (TLS/HTTPS) for data in transit and secure database storage for credentials and OAuth tokens. Temporary video segment files generated during live broadcasts are automatically deleted after clip assembly.
          </p>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            6. Contact & Your Rights
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            You may unlink your Google account or request account deletion at any time by contacting us. If you have questions regarding this Privacy Policy, please contact privacy@fieldcast.org.
          </p>
        </section>
      </Card>
    </div>
  );
}
