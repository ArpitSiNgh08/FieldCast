# Phase 2 — AWS EC2

Part of [[FieldCast]]

> Status: future scale phase. No Phase 2 infrastructure has been provisioned.

## What changes from Phase 1
| Component | Phase 1 | Phase 2 |
|---|---|---|
| RTMP/SRT ingest + HLS | [[Phase 1 — Oracle VM]] | AWS EC2 (same Docker setup) |
| Backend | Oracle VM | EC2 (or ECS for scaling) |
| Frontend | Vercel | Vercel (unchanged) |
| Database | Neon | Neon (or RDS if needed) |
| VOD storage | ImageKit only | ImageKit + S3 archival |

## What doesn't change
- Application code — zero changes
- Docker images — same
- GitHub Actions pipeline — only the SSH target IP changes
- Prisma schema and migrations — host-agnostic

## Why this is the right design
The "same code, different target" property is a deliberate architecture decision. It separates application logic from infrastructure and demonstrates that the system was designed for portability, not built for one host.

## When to switch
- Concurrent viewer load exceeds Oracle VM's comfortable ceiling
- Oracle reclaims the instance and reliability guarantees are needed
- Storage needs exceed ImageKit's free/starter tier (triggers S3 addition)

## Related
- [[Phase 1 — Oracle VM]] — what this replaces
- [[Rejected — mediasoup]] — another Phase 2 non-starter
- [[CI/CD — GitHub Actions]] — pipeline that deploys here
- [[ImageKit]] — VOD delivery (unchanged in Phase 2)
