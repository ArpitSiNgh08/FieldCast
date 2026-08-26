# Phase 1 — Oracle VM

Part of [[FieldCast]]

> Status: deployed (2026-08-26). The production VM runs Ubuntu 24.04 Minimal aarch64 on `VM.Standard.A1.Flex` with 1 OCPU and 6 GB RAM. Nginx and Let's Encrypt provide HTTPS at the configured DuckDNS hostname; Vercel is connected to the backend through that hostname.

## What runs here
- **SRS 6.0.184** — RTMP `:1935/TCP` and SRT `:10080/UDP` ingest plus LL-HLS output (Docker)
- **Backend** — Node.js + Express + Socket.io, managed by systemd as `fieldcast-backend.service`
- **ffmpeg** — [[Camera Switching]] child processes
- **Nginx** — TLS termination and reverse proxy: `/api` + `/socket.io` → backend, `/live` → SRS HLS

## Why Oracle Cloud
Free tier options like Vercel, Netlify, Render only proxy HTTP(S) — they reject raw RTMP on port 1935. Oracle's Always Free tier gives a real Linux VM with a public IP and no port restrictions.

## Specs (Always Free Ampere)
- 1 OCPU, 6 GB RAM — suitable for the backend, SRS remuxing, and a small number of H.264 camera feeds; do not plan server-side transcoding on this size
- Public ephemeral IPv4 assigned to the primary VNIC (record it only in secret/config stores, not notes)
- Public rules to retain: `22/TCP` (SSH), `80/TCP` (HTTP redirect/Let's Encrypt), `443/TCP` (HTTPS), `1935/TCP` (RTMP ingest), and `10080/UDP` (SRT ingest)
- Direct `4000/TCP` backend and `8080/TCP` HLS rules are no longer needed once Nginx is verified; remove them from UFW and OCI security rules. `1985/TCP` (SRS API) remains private.

## Current VM operations

- Repository path: `/opt/fieldcast`
- Installed: Node.js 20, Docker Engine + Compose, ffmpeg, Git, Nano
- SRS: `cd /opt/fieldcast && docker compose up -d srs`
- Backend: `sudo systemctl status fieldcast-backend --no-pager`
- Local health check: `curl http://127.0.0.1:4000/api/tournaments`
- SRS health check: `curl http://127.0.0.1:1985/api/v1/streams/`
- Public API smoke test: `curl https://<duckdns-host>/api/tournaments`

`backend/.env` is production-only, mode `600`, and must never be committed. It uses the Vercel production URL for `FRONTEND_URL`, the HTTPS DuckDNS hostname for `SRS_HLS_BASE`, and the DuckDNS hostname for `RTMP_HOST`. The Neon credential used during bootstrap was exposed and must be rotated.

Vercel uses `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SOCKET_URL`, both set to the HTTPS DuckDNS origin. The Socket value is required for live scores; the temporary 15-second score holdback is a frontend code constant and is unrelated to VM environment configuration.

## Known risk
Oracle has a documented history of reclaiming idle Always Free instances after extended inactivity. Before match weekends: log in and check the instance is still running.

Also verify migration `0012_match_viewers`, rotate the exposed Neon bootstrap credential, confirm Nginx forwards Socket.IO upgrades, and remove direct public `4000`, `8080`, and `1985` access. Automatic VOD upload is not implemented, and the fixed 15-second score holdback may drift relative to actual HLS latency.

The active Nginx site configuration is currently VM-managed rather than versioned in the repository. Keep a secure backup and recheck `/api`, `/socket.io`, `/live`, WebSocket upgrade headers, TLS renewal, and request-size limits after any VM rebuild or proxy edit.

## Migration to Phase 2
[[Phase 2 — AWS EC2]] replaces Oracle. Steps:
1. Repoint phone RTMP/SRT broadcaster URLs from the Oracle IP to the EC2 IP
2. Pull same Docker images on EC2
3. GitHub Actions SSH target changes — nothing else

## Related
- [[Phase 2 — AWS EC2]] — what replaces this
- [[Streaming — SRS + LL-HLS]] — main workload on this VM
- [[CI/CD — GitHub Actions]] — deploys here on merge to main
- [[Backend — Express + Socket.io]] — also runs here
