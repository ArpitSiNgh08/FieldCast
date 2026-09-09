'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const env = require('../config/env');
const prisma = require('../config/prisma');
const googleDriveOAuth = require('./googleDriveOAuth.service');

const recorders = new Map();
const root = path.resolve(process.cwd(), env.clips.tempDir);

function b64(value) { return Buffer.from(value).toString('base64url'); }

async function driveToken() {
  if (!env.clips.clientEmail || !env.clips.privateKey) throw new Error('Google Drive credentials are not configured');
  const now = Math.floor(Date.now() / 1000);
  const assertion = `${b64(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${b64(JSON.stringify({ iss: env.clips.clientEmail, scope: 'https://www.googleapis.com/auth/drive.file', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }))}`;
  const signature = crypto.createSign('RSA-SHA256').update(assertion).sign(env.clips.privateKey, 'base64url');
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${assertion}.${signature}` }) });
  if (!response.ok) throw new Error(`Google Drive token request failed (${response.status})`);
  return (await response.json()).access_token;
}

async function upload(filePath, name, tournamentId, onProgress) {
  const destination = tournamentId ? await prisma.tournamentClipDestination.findUnique({ where: { tournamentId: Number(tournamentId) }, include: { googleDriveConnection: true } }) : null;
  const token = destination ? await googleDriveOAuth.accessTokenForConnection(destination.googleDriveConnection) : await driveToken();
  const folderId = destination?.folderId || env.clips.folderId;
  if (!folderId) throw new Error('Connect Google Drive and configure a clips folder first');

  const stat = await fs.stat(filePath);

  // 1. Initiate Resumable Upload
  const initResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': 'video/mp4',
      'X-Upload-Content-Length': String(stat.size),
    },
    body: JSON.stringify({ name, parents: [folderId], mimeType: 'video/mp4' }),
  });

  if (!initResponse.ok) {
    // Fallback to multipart upload if resumable session fails
    const content = await fs.readFile(filePath);
    const boundary = `fieldcast-${crypto.randomBytes(12).toString('hex')}`;
    const metadata = JSON.stringify({ name, parents: [folderId], mimeType: 'video/mp4' });
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`), content, Buffer.from(`\r\n--${boundary}--`) ]);
    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
    if (!response.ok) throw new Error(`Google Drive upload failed (${response.status})`);
    if (onProgress) onProgress(100);
    return response.json();
  }

  const uploadUrl = initResponse.headers.get('location');
  if (!uploadUrl) throw new Error('Google Drive upload location header missing');

  // 2. Chunked upload to report progress percentage
  const chunkSize = 1024 * 1024; // 1MB chunks
  let offset = 0;
  let fileHandle = await fs.open(filePath, 'r');
  let resultJson = null;

  try {
    while (offset < stat.size) {
      const currentChunkSize = Math.min(chunkSize, stat.size - offset);
      const buffer = Buffer.alloc(currentChunkSize);
      await fileHandle.read(buffer, 0, currentChunkSize, offset);

      const endByte = offset + currentChunkSize - 1;
      const uploadChunkRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'video/mp4',
          'Content-Length': String(currentChunkSize),
          'Content-Range': `bytes ${offset}-${endByte}/${stat.size}`,
        },
        body: buffer,
      });

      offset += currentChunkSize;
      const progressPercent = Math.min(99, Math.round((offset / stat.size) * 100));
      if (onProgress) onProgress(progressPercent);

      if (uploadChunkRes.status === 200 || uploadChunkRes.status === 201) {
        resultJson = await uploadChunkRes.json();
      }
    }
  } finally {
    await fileHandle.close();
  }

  if (onProgress) onProgress(100);
  return resultJson || { id: 'uploaded' };
}

async function cleanupDirectory(directory) {
  if (!directory) return;
  try { await fs.rm(directory, { recursive: true, force: true }); } catch (_) {}
}

function spawnRecorder(matchId, liveUrl, directory) {
  const recorder = recorders.get(Number(matchId));
  if (!recorder || recorder.stopped) return;

  console.log(`[clipService] Spawning recorder for match ${matchId} | URL: ${liveUrl} | Dir: ${directory}`);

  const pattern = path.join(directory, 'segment-%03d.ts');
  let stderrBuffer = '';

  const proc = spawn(env.stream.ffmpegPath, [
    '-hide_banner', '-loglevel', 'warning',
    '-live_start_index', '-3',
    '-reconnect', '1',
    '-reconnect_streamed', '1',
    '-reconnect_delay_max', '5',
    '-i', liveUrl,
    '-c', 'copy',
    '-f', 'segment',
    '-segment_time', '6',
    '-segment_wrap', '40',
    '-reset_timestamps', '1',
    pattern
  ], { stdio: ['ignore', 'ignore', 'pipe'] });

  recorder.proc = proc;

  proc.on('error', (err) => {
    recorder.lastError = `Failed to spawn FFmpeg: ${err.message}`;
    console.error(`[clipService] FFmpeg spawn error for match ${matchId}:`, err);
  });

  proc.stderr?.on('data', (data) => {
    const chunk = data.toString();
    console.error(`[clipService FFmpeg stderr match ${matchId}]:`, chunk);
    stderrBuffer += chunk;
    if (stderrBuffer.length > 1000) stderrBuffer = stderrBuffer.slice(-1000);
    recorder.lastError = stderrBuffer.trim();
  });

  proc.on('exit', (code) => {
    if (recorder.proc === proc) {
      recorder.proc = null;
      if (!recorder.stopped) {
        recorder.lastError = stderrBuffer.trim() || `FFmpeg exited with code ${code}`;
        console.warn(`[clipService] recorder process for match ${matchId} exited (code ${code}). Error: ${recorder.lastError}`);
        recorder.retryTimeout = setTimeout(() => spawnRecorder(matchId, liveUrl, directory), 3000);
      }
    }
  });
}

async function start(matchId, liveUrl) {
  if (!env.clips.enabled || !liveUrl || env.stream.simulate) {
    console.log(`[clipService] start ignored: enabled=${env.clips.enabled}, liveUrl=${liveUrl}, simulate=${env.stream.simulate}`);
    return;
  }
  const numId = Number(matchId);
  let recorder = recorders.get(numId);
  const directory = path.join(root, `match-${numId}`);

  if (recorder) {
    recorder.stopped = false;
    recorder.liveUrl = liveUrl;
    if (!recorder.proc && !recorder.retryTimeout) {
      spawnRecorder(numId, liveUrl, directory);
    }
    return;
  }

  await fs.mkdir(directory, { recursive: true });
  recorder = { liveUrl, directory, activeJobs: 0, stopped: false, proc: null, retryTimeout: null, lastError: null };
  recorders.set(numId, recorder);
  spawnRecorder(numId, liveUrl, directory);
}

async function stop(matchId) {
  const recorder = recorders.get(Number(matchId));
  if (!recorder) return;
  recorder.stopped = true;
  if (recorder.retryTimeout) {
    clearTimeout(recorder.retryTimeout);
    recorder.retryTimeout = null;
  }
  if (recorder.proc) {
    try { recorder.proc.kill('SIGKILL'); } catch (_) {}
    recorder.proc = null;
  }
  if (recorder.activeJobs <= 0) {
    recorders.delete(Number(matchId));
    await cleanupDirectory(recorder.directory);
  }
}

async function createClip(matchId, tournamentId, liveUrl, onProgress) {
  let recorder = recorders.get(Number(matchId));
  if (!recorder && liveUrl) {
    await start(matchId, liveUrl);
    recorder = recorders.get(Number(matchId));
  }
  if (!recorder) throw new Error('Rolling recording is not available for this match. Please ensure the match stream is active.');
  recorder.activeJobs++;
  try {
    const files = (await fs.readdir(recorder.directory)).filter((file) => /^segment-\d+\.ts$/.test(file));
    const recent = (await Promise.all(files.map(async (file) => ({ file, stat: await fs.stat(path.join(recorder.directory, file)) })))).sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs).slice(-30).map((entry) => path.join(recorder.directory, entry.file));
    if (recent.length < 10) throw new Error('The rolling recording does not have enough buffer yet (needs at least 1 minute of live stream content)');
    const list = path.join(recorder.directory, `clip-${Date.now()}.txt`);
    const output = path.join(recorder.directory, `clip-${Date.now()}.mp4`);
    await fs.writeFile(list, recent.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));
    await new Promise((resolve, reject) => { const proc = spawn(env.clips.ffmpegPath || env.stream.ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]); proc.on('error', reject); proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg clip assembly failed (${code})`))); });
    try { return await upload(output, `FieldCast-match-${matchId}-${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`, tournamentId, onProgress); } finally { await fs.rm(list, { force: true }); await fs.rm(output, { force: true }); }
  } finally {
    recorder.activeJobs--;
    if (recorder.stopped && recorder.activeJobs <= 0) {
      recorders.delete(Number(matchId));
      await cleanupDirectory(recorder.directory);
    }
  }
}

async function getStatus(matchId) {
  if (!env.clips.enabled) {
    return { enabled: false, active: false, status: 'DOWN', bufferedSeconds: 0, bufferedSegments: 0, canClip: false, message: 'Clipping is disabled in server configuration' };
  }
  const numId = Number(matchId);
  const recorder = recorders.get(numId);
  const directory = path.join(root, `match-${numId}`);

  let bufferedSegments = 0;
  let latestMtimeMs = 0;
  const now = Date.now();

  try {
    const files = (await fs.readdir(directory)).filter((file) => /^segment-\d+\.ts$/.test(file));
    if (files.length > 0) {
      const fileStats = await Promise.all(files.map(async (file) => ({
        file,
        stat: await fs.stat(path.join(directory, file))
      })));

      // Auto-purge segments older than 180 seconds (3 minutes)
      const staleFiles = fileStats.filter((f) => now - f.stat.mtimeMs >= 180_000);
      for (const sf of staleFiles) {
        fs.rm(path.join(directory, sf.file), { force: true }).catch(() => {});
      }

      const freshFiles = fileStats.filter((f) => now - f.stat.mtimeMs < 180_000);
      bufferedSegments = freshFiles.length;
      if (freshFiles.length > 0) {
        latestMtimeMs = Math.max(...freshFiles.map((f) => f.stat.mtimeMs));
      }
    }
  } catch (_) {}

  const bufferedSeconds = bufferedSegments * 6;
  const active = Boolean(recorder?.proc);
  const isStale = latestMtimeMs > 0 && (now - latestMtimeMs > 25000);
  const has404Error = Boolean(recorder?.lastError && /404|Not Found|Server returned 4/i.test(recorder.lastError));
  
  const streamActive = active && !has404Error && (!isStale || bufferedSegments === 0);
  const canClip = active && !has404Error && !isStale && bufferedSegments >= 10;

  let status = 'DOWN';
  let message = 'Clipping service is DOWN (FFmpeg recorder process inactive)';

  if (has404Error) {
    status = 'DOWN';
    message = `Camera stream offline (404 Not Found) · Stream: ${recorder?.liveUrl || 'unknown'}`;
  } else if (isStale) {
    status = 'DOWN';
    message = `Camera stream stalled (no live frames for ${Math.round((now - latestMtimeMs) / 1000)}s) · Click Wake / Restart to reconnect`;
  } else if (active) {
    if (canClip) {
      status = 'UP';
      message = `Clipping service UP · ${Math.floor(bufferedSeconds / 60)}m ${bufferedSeconds % 60}s buffered (${bufferedSegments} segments)`;
    } else {
      status = 'BUFFERING';
      message = recorder?.lastError
        ? `Clipping service buffering (${bufferedSeconds}s/60s) · Stream: ${recorder?.liveUrl || 'unknown'} · Recent Log: ${recorder.lastError}`
        : `Clipping service buffering (${bufferedSeconds}s/60s) · Stream: ${recorder?.liveUrl || 'unknown'}`;
    }
  } else if (recorder && !recorder.stopped) {
    status = 'BUFFERING';
    message = recorder.lastError
      ? `Clipping service retrying stream connection · Error: ${recorder.lastError}`
      : `Clipping service re-connecting to live stream (${recorder?.liveUrl || ''})...`;
  }

  return {
    enabled: true,
    active: streamActive,
    status,
    bufferedSeconds: streamActive ? bufferedSeconds : 0,
    bufferedSegments,
    canClip,
    message,
  };
}

async function wake(matchId, liveUrl) {
  const numId = Number(matchId);
  const recorder = recorders.get(numId);
  if (recorder && recorder.retryTimeout) {
    clearTimeout(recorder.retryTimeout);
    recorder.retryTimeout = null;
  }
  if (recorder && recorder.proc) {
    try { recorder.proc.kill('SIGKILL'); } catch (_) {}
    recorder.proc = null;
  }

  const directory = path.join(root, `match-${numId}`);
  try {
    const files = await fs.readdir(directory);
    for (const file of files) {
      if (/^segment-\d+\.ts$/.test(file)) {
        await fs.rm(path.join(directory, file), { force: true }).catch(() => {});
      }
    }
  } catch (_) {}

  if (recorder) {
    recorder.lastError = null;
  }

  await start(matchId, liveUrl);
  return getStatus(matchId);
}

async function queue(matchId, userId, tournamentId, liveUrl) {
  const job = await prisma.clipJob.create({ data: { matchId: Number(matchId), requestedById: Number(userId), status: 'assembling clip 0%' } });
  createClip(matchId, tournamentId, liveUrl, (progressPercent) => {
    prisma.clipJob.update({
      where: { id: job.id },
      data: { status: `uploading ${progressPercent}%` }
    }).catch(() => {});
  }).then(async (file) => prisma.clipJob.update({ where: { id: job.id }, data: { status: 'completed', completedAt: new Date(), driveFileId: file.id, driveUrl: file.webViewLink || `https://drive.google.com/open?id=${file.id}` } })).catch(async (error) => prisma.clipJob.update({ where: { id: job.id }, data: { status: 'failed', error: error.message } }));
  return job;
}

function getRecorder(matchId) {
  return recorders.get(Number(matchId));
}

module.exports = { start, stop, queue, getStatus, wake, getRecorder };
