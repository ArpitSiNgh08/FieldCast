'use strict';

const { spawn } = require('child_process');
const env = require('../config/env');

// Tracks the currently running ffmpeg re-publisher, keyed by match id, so a
// switch can kill the old process before starting the new one.
// { [matchId]: { camera, proc } }
const active = new Map();

function rtmpUrl(app, stream) {
  return `rtmp://${env.stream.rtmpHost}:${env.stream.rtmpPort}/${app}/${stream}`;
}

/**
 * Point the match's "active" output at the given camera.
 *
 * Real mode: spawn `ffmpeg -i rtmp://…/live/cameraN -c copy -f flv rtmp://…/live/active`
 * so SRS serves the chosen feed at active.m3u8. Simulation mode: no ffmpeg,
 * just record the selection (used for local demos without SRS).
 *
 * @returns {{ camera: string, simulated: boolean }}
 */
function switchCamera(matchId, camera) {
  const outputStream = `active_${matchId}`; // one active output per match

  if (env.stream.simulate) {
    active.set(matchId, { camera, proc: null });
    console.log(`[camera] (simulated) match ${matchId} -> ${camera}`);
    return { camera, simulated: true };
  }

  // Kill any existing publisher for this match.
  stop(matchId);

  const input = rtmpUrl('live', camera);
  const output = rtmpUrl('live', outputStream);
  const args = [
    '-rtmp_live', 'live',
    '-i', input,
    '-c', 'copy',        // no re-encode: just re-mux/relay
    '-f', 'flv',
    output,
  ];

  const proc = spawn(env.stream.ffmpegPath, args, { stdio: 'ignore' });
  proc.on('error', (err) =>
    console.error(`[camera] ffmpeg spawn error (match ${matchId}):`, err.message)
  );
  proc.on('exit', (code) => {
    if (active.get(matchId)?.proc === proc) active.delete(matchId);
    console.log(`[camera] ffmpeg exited (match ${matchId}) code=${code}`);
  });

  active.set(matchId, { camera, proc });
  console.log(`[camera] match ${matchId} -> ${camera} (ffmpeg pid ${proc.pid})`);
  return { camera, simulated: false };
}

/** Stop the active publisher for a match, if any. */
function stop(matchId) {
  const current = active.get(matchId);
  if (current?.proc) {
    try {
      current.proc.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
  active.delete(matchId);
}

/** The camera currently selected for a match (or null). */
function currentCamera(matchId) {
  return active.get(matchId)?.camera || null;
}

module.exports = { switchCamera, stop, currentCamera };
