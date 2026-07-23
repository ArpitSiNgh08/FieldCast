# Phase 1 — Oracle VM

Part of [[FieldCast]]

## What runs here
- **SRS** — RTMP ingest + LL-HLS output (Docker)
- **Backend** — Node.js + Express + Socket.io (Docker or pm2)
- **ffmpeg** — [[Camera Switching]] child processes

## Why Oracle Cloud
Free tier options like Vercel, Netlify, Render only proxy HTTP(S) — they reject raw RTMP on port 1935. Oracle's Always Free tier gives a real Linux VM with a public IP and no port restrictions.

## Specs (Always Free Ampere)
- 4 OCPU, 24 GB RAM — more than enough for SRS + backend + ffmpeg
- Persistent public IP
- Ports needed: 1935 (RTMP), 8080 (HLS), 4000 (API), 80/443 (optional)

## Known risk
Oracle has a documented history of reclaiming idle Always Free instances after extended inactivity. Before match weekends: log in and check the instance is still running.

## Migration to Phase 2
[[Phase 2 — AWS EC2]] replaces Oracle. Steps:
1. Repoint Larix Broadcaster RTMP URL from Oracle IP to EC2 IP
2. Pull same Docker images on EC2
3. GitHub Actions SSH target changes — nothing else

## Related
- [[Phase 2 — AWS EC2]] — what replaces this
- [[Streaming — SRS + LL-HLS]] — main workload on this VM
- [[CI/CD — GitHub Actions]] — deploys here on merge to main
- [[Backend — Express + Socket.io]] — also runs here
