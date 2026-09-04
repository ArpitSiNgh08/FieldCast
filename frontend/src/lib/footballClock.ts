export interface FootballClockState {
  clockStartedAt?: string;
  clockElapsedSeconds?: number;
  clockRunning?: boolean;
  clockFullTime?: boolean;
}

export function elapsedSeconds(clock: FootballClockState, now = Date.now()) {
  const saved = Number(clock.clockElapsedSeconds || 0);
  if (!clock.clockRunning || !clock.clockStartedAt) return Math.max(0, saved);
  const started = Date.parse(clock.clockStartedAt);
  return Number.isFinite(started) ? Math.max(0, saved + (now - started) / 1000) : saved;
}

export function formatClock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export function eventTime(seconds: number) {
  const minute = Math.floor(Math.max(0, seconds) / 60);
  if (minute <= 30) return { minute, extraTimeMinute: 0, half: 1 };
  if (minute <= 60) return { minute: 30, extraTimeMinute: minute - 30, half: 1 };
  return { minute: 60, extraTimeMinute: minute - 60, half: 2 };
}
