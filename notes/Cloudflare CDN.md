# Cloudflare CDN

Part of [[FieldCast]] | Related to [[Streaming — SRS + LL-HLS]] | [[Phase 1 — Oracle VM]]

## Overview
FieldCast uses a **Cloudflare Worker Edge Proxy** to scale live HLS stream distribution and video playback to thousands of concurrent viewers worldwide without overloading the SRS origin server on Oracle VM.

---

## Architecture Diagram

```mermaid
flowchart TD
    SRS[SRS Stream Server on Oracle VM] -->|Origin HLS| Nginx[Nginx Reverse Proxy :443]
    Nginx -->|DuckDNS SSL| CFWorker["Cloudflare Worker (fieldcast-cdn)"]
    
    subgraph Cloudflare Edge
        CFWorker -->|Cache .ts (24h TTL)| EdgeCache[Cloudflare Edge Cache]
        CFWorker -->|Bypass / 1s TTL .m3u8| PlaylistHandler[Live Manifest Handler]
    end
    
    EdgeCache -->|95%+ Video Bandwidth| Viewers[Global Audience]
```

---

## Worker Configuration (`fieldcast-cdn`)

The Cloudflare Worker proxy script:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const originUrl = `https://fieldcast-api.duckdns.org${url.pathname}${url.search}`;
    
    const response = await fetch(originUrl, request);
    const newHeaders = new Headers(response.headers);
    
    if (url.pathname.endsWith('.ts')) {
      newHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    } else if (url.pathname.endsWith('.m3u8')) {
      newHeaders.set('Cache-Control', 'public, max-age=1, s-maxage=1');
    }
    
    return new Response(response.body, { status: response.status, headers: newHeaders });
  }
};
```

---

## Backend `.env` Integration

```env
# Direct SRS Origin URL for internal clip recording
SRS_HLS_BASE=https://fieldcast-api.duckdns.org

# Cloudflare Edge Worker CDN URL for public viewers
CLOUDFLARE_CDN_URL=https://fieldcast-cdn.your-account.workers.dev
```

- **`match.liveUrl`**: Formatted with `CLOUDFLARE_CDN_URL` for public video playback.
- **`match.originLiveUrl`**: Retains direct SRS URL for zero-delay FFmpeg clip buffering in [[Clipping Feature Plan]].
