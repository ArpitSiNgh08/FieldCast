'use strict';

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/prisma');

const scope = ['openid', 'email', 'profile', 'https://www.googleapis.com/auth/drive'].join(' ');
const key = crypto.createHash('sha256').update(env.jwt.secret).digest();

function protect(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
function unprotect(value) {
  const [iv, tag, data] = value.split('.');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(data, 'base64url')), decipher.final()]).toString('utf8');
}
function authUrl({ userId, tournamentId, matchId }) {
  const state = jwt.sign(
    { sub: Number(userId), tournamentId: Number(tournamentId), matchId: Number(matchId), purpose: 'drive-connect' },
    env.jwt.secret,
    { expiresIn: '10m' }
  );
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: env.google.clientId, redirect_uri: env.google.driveCallbackUrl, response_type: 'code', access_type: 'offline', prompt: 'consent', scope, state });
  return url.toString();
}
async function exchange(code) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.google.clientId, client_secret: env.google.clientSecret, redirect_uri: env.google.driveCallbackUrl, grant_type: 'authorization_code' }) });
  if (!response.ok) throw new Error('Google Drive OAuth token exchange failed');
  return response.json();
}
async function complete(state, code) {
  const claims = jwt.verify(state, env.jwt.secret);
  if (claims.purpose !== 'drive-connect') throw new Error('Invalid Google Drive OAuth state');
  const tokens = await exchange(code);
  if (!tokens.refresh_token) throw new Error('Google did not return a refresh token; reconnect and approve offline access');
  const info = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const profile = info.ok ? await info.json() : {};
  const connection = await prisma.googleDriveConnection.upsert({
    where: { userId: Number(claims.sub) },
    create: { userId: Number(claims.sub), accountEmail: profile.email || null, refreshToken: protect(tokens.refresh_token) },
    update: { accountEmail: profile.email || null, refreshToken: protect(tokens.refresh_token) },
  });
  return { connection, tournamentId: Number(claims.tournamentId), matchId: Number(claims.matchId), linkedByUserId: Number(claims.sub) };
}
async function accessToken(userId) {
  const connection = await prisma.googleDriveConnection.findUnique({ where: { userId: Number(userId) } });
  if (!connection) return null;
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.google.clientId, client_secret: env.google.clientSecret, refresh_token: unprotect(connection.refreshToken), grant_type: 'refresh_token' }) });
  if (!response.ok) throw new Error('Google Drive authorization expired; reconnect Google Drive');
  return { token: (await response.json()).access_token, folderId: connection.folderId };
}

async function accessTokenForConnection(connection) {
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: env.google.clientId, client_secret: env.google.clientSecret, refresh_token: unprotect(connection.refreshToken), grant_type: 'refresh_token' }) });
  if (!response.ok) throw new Error('Google Drive authorization expired; reconnect Google Drive');
  return (await response.json()).access_token;
}

async function verifyFolder(connection, folderId) {
  const token = await accessTokenForConnection(connection);
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Google Drive cannot access this folder. Check the folder ID and linked account.');
  const file = await response.json();
  if (file.mimeType !== 'application/vnd.google-apps.folder') throw new Error('The supplied Google Drive ID is not a folder');
  return file;
}

module.exports = { authUrl, complete, accessToken, accessTokenForConnection, verifyFolder };
