'use strict';

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');
const env = require('../config/env');
const prisma = require('../config/prisma');

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

async function upload(filePath, name) {
  if (!env.clips.folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is not configured');
  const token = await driveToken();
  const content = await fs.readFile(filePath);
  const boundary = `fieldcast-${crypto.randomBytes(12).toString('hex')}`;
  const metadata = JSON.stringify({ name, parents: [env.clips.folderId], mimeType: 'video/mp4' });
  const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`), content, Buffer.from(`\r\n--${boundary}--`) ]);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body });
  if (!response.ok) throw new Error(`Google Drive upload failed (${response.status})`);
  return response.json();
}

async function start(matchId, liveUrl) {
  if (!env.clips.enabled || recorders.has(Number(matchId)) || !liveUrl || env.stream.simulate) return;
  const directory = path.join(root, `match-${Number(matchId)}`);
  await fs.mkdir(directory, { recursive: true });
  const pattern = path.join(directory, 'segment-%03d.ts');
  const proc = spawn(env.stream.ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-i', liveUrl, '-c', 'copy', '-f', 'segment', '-segment_time', '6', '-segment_wrap', '30', '-reset_timestamps', '1', pattern], { stdio: 'ignore' });
  proc.on('exit', () => { if (recorders.get(Number(matchId))?.proc === proc) recorders.delete(Number(matchId)); });
  recorders.set(Number(matchId), { proc, directory });
}

function stop(matchId) {
  const recorder = recorders.get(Number(matchId));
  if (recorder?.proc) recorder.proc.kill('SIGKILL');
  recorders.delete(Number(matchId));
}

async function createClip(matchId) {
  const recorder = recorders.get(Number(matchId));
  if (!recorder) throw new Error('Rolling recording is not available for this match');
  const files = (await fs.readdir(recorder.directory)).filter((file) => /^segment-\d+\.ts$/.test(file));
  const recent = (await Promise.all(files.map(async (file) => ({ file, stat: await fs.stat(path.join(recorder.directory, file)) })))).sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs).slice(-20).map((entry) => path.join(recorder.directory, entry.file));
  if (recent.length < 20) throw new Error('The rolling recording has not reached two minutes yet');
  const list = path.join(recorder.directory, `clip-${Date.now()}.txt`);
  const output = path.join(recorder.directory, `clip-${Date.now()}.mp4`);
  await fs.writeFile(list, recent.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n'));
  await new Promise((resolve, reject) => { const proc = spawn(env.clips.ffmpegPath || env.stream.ffmpegPath, ['-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', output]); proc.on('error', reject); proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`ffmpeg clip assembly failed (${code})`))); });
  try { return await upload(output, `FieldCast-match-${matchId}-${new Date().toISOString().replace(/[:.]/g, '-')}.mp4`); } finally { await fs.rm(list, { force: true }); await fs.rm(output, { force: true }); }
}

async function queue(matchId) {
  const job = await prisma.clipJob.create({ data: { matchId: Number(matchId), status: 'processing' } });
  createClip(matchId).then(async (file) => prisma.clipJob.update({ where: { id: job.id }, data: { status: 'completed', completedAt: new Date(), driveFileId: file.id, driveUrl: file.webViewLink || `https://drive.google.com/open?id=${file.id}` } })).catch(async (error) => prisma.clipJob.update({ where: { id: job.id }, data: { status: 'failed', error: error.message } }));
  return job;
}

module.exports = { start, stop, queue };
