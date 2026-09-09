# FieldCast System Architecture

FieldCast is a multi-camera live sports broadcasting and AI-assisted score/clip clipping platform designed for ultra-low latency streaming, high-concurrency global viewer distribution, and instant clip assembly.

---

## 1. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph Ingest Layer [Mobile & Camera Ingest]
        Moblin[Moblin / Larix Mobile App] -->|SRT :10080 / RTMP :1935| SRS[SRS Media Server :8080]
    end

    subgraph Origin Infrastructure [Oracle Cloud VM - Nginx Proxy]
        SRS -->|Internal HLS Streams| Nginx[Nginx Reverse Proxy :443]
        Nginx -->|SSL duckdns| Backend[Express.js Node.js API :4000]
        
        %% Internal Rolling Clip Service
        SRS -->|Direct Origin HLS (originLiveUrl)| ClipSvc[clipService.js FFmpeg]
        ClipSvc -->|Rolling 3m Buffer| LocalBuffer[Local Storage Buffer]
        ClipSvc -->|OAuth Resumable Upload| GDrive[Google Drive Storage]
    end

    subgraph Edge Layer [Cloudflare CDN Edge]
        CFWorker["Cloudflare Worker (fieldcast-cdn)"]
        CFWorker -->|Fetch HLS| Nginx
        CFWorker -->|Edge Cache .ts (24h TTL)| EdgeCache[(Cloudflare Edge Cache PoPs)]
        CFWorker -->|Bypass / 1s TTL .m3u8| ManifestHandler[Live Playlist Handler]
    end

    subgraph Viewers [Audience & Frontend]
        WebClients["Viewers / Next.js Web App (Vercel)"] -->|Fetch Cached HLS (liveUrl)| CFWorker
        WebClients -->|REST API & Socket.io| Nginx
    end
```

---

## 2. Component & Data Flow Details

### A. Stream Ingestion & Multi-Camera Switcher
- **Protocols**: Moblin / Larix push RTMP (`:1935`) or SRT (`:10080`) directly to SRS (Simple Realtime Server).
- **Multi-Camera Cut**:
  - Organizers switch active camera feeds via Socket.io / REST API.
  - `cameraSwitcher.js` spawns an FFmpeg relay process that routes the selected camera feed to `/live/active_<matchId>.m3u8`.

### B. High-Concurrency CDN Edge Caching (Cloudflare)
- **Public URL (`liveUrl`)**: `https://fieldcast-cdn.your-account.workers.dev/live/active_<matchId>.m3u8`.
- **Edge Caching Policy**:
  - `.ts` / `.m4s` Media Segments: Cached at Cloudflare Edge PoPs for **24 hours** (`Cache-Control: public, max-age=86400`). 95%+ of video traffic is served directly from edge locations worldwide.
  - `.m3u8` Manifest Playlists: Served with **1-second Edge TTL** (`Cache-Control: public, max-age=1`) to prevent playback lag while ensuring immediate live manifest updates.

### C. Internal Rolling Clip Buffer (`clipService.js`)
- **Origin URL (`originLiveUrl`)**: `https://fieldcast-api.duckdns.org/live/active_<matchId>.m3u8`.
- To avoid CDN latency and edge bandwidth usage during highlight creation, internal FFmpeg clip recorders fetch directly from the SRS origin.
- Maintains a 3-minute rolling buffer of raw `.ts` segments on disk for one-click clip assembly and Google Drive upload.

---

## 3. Environment Variable Architecture

| Variable | Scope | Purpose |
|---|---|---|
| `SRS_HLS_BASE` | Backend (`.env`) | Direct SRS Origin URL (`https://fieldcast-api.duckdns.org`) used by internal recorders. |
| `CLOUDFLARE_CDN_URL` | Backend (`.env`) | Public CDN Worker URL (`https://fieldcast-cdn.xxx.workers.dev`) attached to `match.liveUrl`. |
| `DATABASE_URL` | Backend (`.env`) | Neon Postgres connection string with `sslmode=require`. |
| `NEXT_PUBLIC_API_URL` | Frontend (Vercel) | Backend API endpoint (`https://fieldcast-api.duckdns.org/api`). |
