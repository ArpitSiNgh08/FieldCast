import type { FootballEvent } from "@/lib/types";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";

const EVENT_ICON: Record<string, string> = {
  goal: "⚽",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
};

function eventMinute(event: FootballEvent) {
  return `${event.minute}${event.extra_time_minute ? `+${event.extra_time_minute}` : ""}'`;
}

export function FootballTimeline({ events }: { events: FootballEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Match timeline</CardTitle>
      </CardHeader>
      <CardBody>
        {events.length === 0 ? (
          <p className="text-sm text-muted">No match events recorded yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <span className="mt-0.5 text-lg leading-none" aria-hidden="true">
                  {EVENT_ICON[event.event_type] || "·"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">
                    <span className="mr-2 tabular-nums">{eventMinute(event)}</span>
                    <span className="capitalize">{event.event_type.replace("_", " ")}</span>
                    {event.event_type !== "substitution" && event.player_name && (
                      <span className="text-muted">
                        {" — "}{event.jersey_number ? `#${event.jersey_number} ` : ""}{event.player_name}
                      </span>
                    )}
                  </p>
                  {event.event_type === "substitution" && <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm"><span className="font-medium text-accent">↑ In: {event.player_in_jersey ? `#${event.player_in_jersey} ` : ""}{event.player_in_name || "Unknown player"}</span><span className="text-live">↓ Out: {event.player_out_jersey ? `#${event.player_out_jersey} ` : ""}{event.player_out_name || event.player_name || "Unknown player"}</span></div>}
                  {(event.team_name || event.team_short) && (
                    <p className="text-xs text-muted">{event.team_name || event.team_short}</p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted">Half {event.half}</span>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
