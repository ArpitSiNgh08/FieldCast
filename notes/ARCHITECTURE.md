# Architecture

Part of [[FieldCast]]

## System Overview

```mermaid
flowchart TD
    subgraph Ingest Layer
        Moblin[Moblin / Larix Mobile App] -->|SRT :10080 / RTMP :1935| SRS[SRS Media Server :8080]
    end

    subgraph Origin Infrastructure [Oracle VM - Nginx]
        SRS -->|Internal HLS Streams| Nginx[Nginx Reverse Proxy :443]
        Nginx -->|SSL duckdns| Backend[Express.js Node.js API :4000]
        
        SRS -->|Direct Origin HLS| ClipSvc[clipService.js FFmpeg]
        ClipSvc -->|Rolling Buffer 3m| LocalBuffer[Local Disk Storage]
        ClipSvc -->|OAuth Upload| GDrive[Google Drive Storage]
    end

    subgraph Edge Layer
        CFWorker["Cloudflare Worker (fieldcast-cdn)"]
        CFWorker -->|Fetch HLS| Nginx
        CFWorker -->|Cache .ts (24h TTL)| EdgeCache[(Cloudflare Edge Cache)]
        CFWorker -->|Bypass / 1s TTL .m3u8| ManifestHandler[Live Playlist Handler]
    end

    subgraph Viewers
        WebClients["Viewers / Next.js Web App (Vercel)"] -->|Fetch HLS (liveUrl)| CFWorker
        WebClients -->|REST API & Socket.io| Nginx
    end
```

## Key Links
- [[Streaming — SRS + LL-HLS]] — SRS server setup & stream keys
- [[Cloudflare CDN]] — Edge caching worker & CDN configuration
- [[Clipping Feature Plan]] — FFmpeg rolling segment buffer & Google Drive uploads
- [[Camera Switching]] — Multi-camera active stream cut
- [[Backend — Express + Socket.io]] — Express API & Socket.io real-time score updates
- [[Database — Prisma + Neon]] — Prisma ORM & Neon Serverless Postgres
- [[Frontend — Next.js]] — Next.js App router UI & HLS player
- [[CI-CD — GitHub Actions]] — Production deployment pipeline
