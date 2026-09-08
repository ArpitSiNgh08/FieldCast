import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";

export const metadata: Metadata = {
  title: "Terms of Service — FieldCast",
  description: "Terms and Conditions for using FieldCast live sports streaming and tournament management platform.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <div className="mb-8">
        <Link href="/" className="text-sm font-medium text-muted hover:text-foreground">
          ← Back to FieldCast
        </Link>
        <h1 className="mt-3 font-sans text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Terms of Service
        </h1>
        <p className="mt-2 text-sm text-muted">
          Last updated: September 7, 2026
        </p>
      </div>

      <Card className="space-y-8 p-6 sm:p-8">
        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            1. Acceptance of Terms
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            By accessing or using FieldCast ("the Service", "Platform"), operated for live sports streaming, tournament management, and real-time score updates, you agree to be bound by these Terms of Service. If you do not agree to these terms, you may not access or use the Service.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            2. Platform Description & Service Overview
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            FieldCast provides web-based tools and streaming infrastructure for broadcasting sports matches (including Cricket, Football, and Basketball), tracking live scores, managing tournament drafts and brackets, and exporting video clip highlights to Google Drive.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            3. Accounts & Tournament Organizer Responsibilities
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>
              <strong>Account Security:</strong> You are responsible for safeguarding your credentials and for any activity under your account.
            </li>
            <li>
              <strong>Organizer Authority:</strong> Tournament organizers who create drafts, register teams, and operate live scorecard feeds agree to provide accurate match details and follow sportsmanship guidelines.
            </li>
            <li>
              <strong>Credential Protection:</strong> You must immediately notify FieldCast of any unauthorized use or security breach related to your account.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            4. Live Broadcasts & Camera Feed Ownership
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Organizers and broadcasters streaming via RTMP or SRT feeds retain ownership of their original match footage. By broadcasting through FieldCast, you grant the platform a non-exclusive license to process, remux, and distribute the stream to authorized viewers and generate clip highlights requested by match managers.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            5. Acceptable Use Policy
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            Users agree not to engage in any of the following prohibited activities:
          </p>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
            <li>Broadcasting unauthorized, copyrighted, offensive, or unlawful content.</li>
            <li>Attempting to disrupt or compromise stream relays, Socket.io connections, or database services.</li>
            <li>Falsifying match scores, player stats, or tournament outcomes intentionally.</li>
            <li>Using automated bots or scraping tools to overload the API or streaming endpoints.</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            6. Google Drive & Third-Party Integrations
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            FieldCast integrates with Google OAuth and Google Drive API to save rolling match highlight clips directly to designated Google Drive folders. Use of these integrations is governed by the respective third-party terms of service and our Privacy Policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            7. Limitation of Liability
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            FieldCast is provided "as is" and "as available" without warranties of any kind. We are not liable for match stream delays, network latency, temporary service interruptions during live events, or data loss occurring on third-party cloud storage platforms.
          </p>
        </section>

        <section className="space-y-3 border-t border-border pt-6">
          <h2 className="font-sans text-xl font-semibold text-foreground">
            8. Contact Information & Modifications
          </h2>
          <p className="text-sm leading-relaxed text-muted">
            We reserve the right to modify these terms at any time. Continued use of FieldCast following changes constitutes acceptance of the updated terms. If you have questions about these Terms, please contact us at support@fieldcast.org.
          </p>
        </section>
      </Card>
    </div>
  );
}
