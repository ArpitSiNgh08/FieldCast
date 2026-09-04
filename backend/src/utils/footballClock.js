'use strict';

function elapsedSeconds(state, now = Date.now()) {
  const extra = state?.extra || {};
  const saved = Number(extra.clockElapsedSeconds || 0);
  if (!extra.clockRunning || !extra.clockStartedAt) return Math.max(0, saved);
  const started = Date.parse(extra.clockStartedAt);
  return Number.isFinite(started) ? Math.max(0, saved + (now - started) / 1000) : saved;
}

function timeFromElapsed(seconds) {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  if (totalMinutes <= 30) return { minute: totalMinutes, extraTimeMinute: 0, half: 1 };
  if (totalMinutes <= 60) return { minute: 30, extraTimeMinute: totalMinutes - 30, half: 1 };
  return { minute: 60, extraTimeMinute: totalMinutes - 60, half: 2 };
}

function snapshot(state, now = Date.now()) {
  const seconds = elapsedSeconds(state, now);
  return { ...timeFromElapsed(seconds), elapsedSeconds: seconds };
}

module.exports = { elapsedSeconds, timeFromElapsed, snapshot };
