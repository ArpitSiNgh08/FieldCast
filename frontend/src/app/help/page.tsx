import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help — FieldCast",
  description: "How to set up a FieldCast tournament match and Android camera stream.",
};

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12">
      <div className="mb-8">
        <p className="text-sm font-medium text-accent">FieldCast guide</p>
        <h1 className="mt-1 text-3xl font-bold">Set up and stream a match</h1>
        <p className="mt-2 text-muted">Use this guide for Android phones. Each phone must use its own camera Stream ID.</p>
      </div>

      <div className="space-y-5">
        <HelpSection number="1" title="Create the tournament">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Log in and open <strong>Create tournament</strong>.</li>
            <li>Enter the tournament name, sport, dates, and logo.</li>
            <li>Add the participating teams and players.</li>
            <li>Submit the tournament for approval. Once approved, open it from <strong>Organiser</strong>.</li>
          </ol>
        </HelpSection>

        <HelpSection number="2" title="Create and prepare a match">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Open the approved tournament and choose <strong>Create new match</strong>.</li>
            <li>Select the stage, teams, kickoff time, and venue.</li>
            <li>Open the match control page and add one camera for each Android phone.</li>
            <li>Give cameras clear names such as <strong>Android sideline</strong> and <strong>Android goal</strong>.</li>
          </ol>
        </HelpSection>

        <HelpSection number="3" title="Configure an Android camera">
          <p>Open the camera card on the organizer match page. Enter the generated values in an Android app that supports SRT Caller publishing:</p>
          <div className="mt-3 overflow-x-auto rounded-lg bg-surface-2 p-4 font-mono text-sm">
            <p><span className="text-muted">URL:</span> srt://&lt;server-ip&gt;:10080</p>
            <p className="mt-2"><span className="text-muted">Stream ID:</span> #!::r=live/&lt;camera-stream-key&gt;,m=publish</p>
          </div>
          <ul className="mt-4 list-disc space-y-2 pl-5">
            <li>Use the same URL for every phone, but a different Stream ID for every camera.</li>
            <li>Set the video codec to <strong>H.264</strong> and audio to <strong>AAC</strong>.</li>
            <li>Use SRT <strong>Caller</strong> mode and start the stream after saving the destination.</li>
            <li>Android and the FieldCast server must be reachable on the same network. Use the server IP shown on the organizer page, never <code>localhost</code>.</li>
          </ul>
        </HelpSection>

        <HelpSection number="4" title="Start the broadcast">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Start each Android camera and confirm its status is connected.</li>
            <li>Return to the organizer page and select <strong>Go live</strong>.</li>
            <li>Open the public match page to check the video and scorecard.</li>
            <li>For multiple cameras, use <strong>Take live</strong> beside the camera you want viewers to see.</li>
          </ol>
          <p className="mt-4 rounded-lg bg-accent/10 p-3 text-sm">If a phone connects but no video appears, check that its Stream ID exactly matches the camera card. Two phones must never use the same Stream ID.</p>
        </HelpSection>

        <HelpSection number="5" title="Finish the match">
          <ol className="list-decimal space-y-2 pl-5">
            <li>Use the score controls to update goals, cards, substitutions, fouls, corners, free kicks, and offsides.</li>
            <li>Use <strong>Mark halftime</strong> at the interval.</li>
            <li>End the match when play is complete. This finalizes the score and stops the broadcast output.</li>
          </ol>
        </HelpSection>

        <section className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Need help?</h2>
          <p className="mt-2 text-sm text-muted">Contact the FieldCast administrator for setup, account, or streaming issues.</p>
          <a href="mailto:admin@fieldcast.local" className="mt-3 inline-block font-medium text-accent hover:underline">admin@fieldcast.local</a>
        </section>
      </div>
    </div>
  );
}

function HelpSection({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-bold text-accent">{number}</span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="mt-3 text-sm leading-6 text-muted">{children}</div>
        </div>
      </div>
    </section>
  );
}
