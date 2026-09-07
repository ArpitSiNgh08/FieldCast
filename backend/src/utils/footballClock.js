'use strict';

function elapsedSeconds(state, now = Date.now()) {
  const extra = state?.extra || {};
  const saved = Number(extra.clockElapsedSeconds || 0);
  if (!extra.clockRunning || !extra.clockStartedAt) return Math.max(0, saved);
  const started = Date.parse(extra.clockStartedAt);
  return Number.isFinite(started) ? Math.max(0, saved + (now - started) / 1000) : saved;
}

function timeFromElapsed(seconds, halfHint) {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60);
  const half = halfHint ?? (totalMinutes <= 30 ? 1 : 2);
  if (half === 1) {
    if (totalMinutes <= 30) return { minute: totalMinutes, extraTimeMinute: 0, half: 1 };
    return { minute: 30, extraTimeMinute: totalMinutes - 30, half: 1 };
  }
  // half 2 (30' to 60' + extra time)
  const minute = Math.max(30, totalMinutes);
  if (minute <= 60) return { minute, extraTimeMinute: 0, half: 2 };
  return { minute: 60, extraTimeMinute: minute - 60, half: 2 };
}

function snapshot(state, now = Date.now()) {
  const seconds = elapsedSeconds(state, now);
  const halfHint = state?.period === 2 || state?.periodLabel === 'Halftime' ? 2 : (state?.period || 1);
  return { ...timeFromElapsed(seconds, halfHint), elapsedSeconds: seconds };
}


module.exports = { elapsedSeconds, timeFromElapsed, snapshot };

