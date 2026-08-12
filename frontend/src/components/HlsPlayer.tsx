"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { Match } from "@/lib/types";

interface Props {
  match: Match;
  liveUrl: string;
}

export function HlsPlayer({ match, liveUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const usedFallbackRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !liveUrl) return;

    setError(null);
    setLoading(true);
    usedFallbackRef.current = false;

    if (Hls.isSupported()) {
      const hls = new Hls({
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;

      hls.loadSource(liveUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (data.fatal) {
          if (!usedFallbackRef.current && match.cameraFallbackUrl && match.cameraFallbackUrl !== liveUrl) {
            usedFallbackRef.current = true;
            setError(null);
            setLoading(true);
            hls.loadSource(match.cameraFallbackUrl);
            return;
          }
          setError("Stream unavailable. The broadcast may not have started yet.");
          setLoading(false);
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS
      video.src = liveUrl;
      video.addEventListener("loadedmetadata", () => {
        setLoading(false);
        video.play().catch(() => {});
      });
    } else {
      setError("Your browser does not support HLS playback.");
      setLoading(false);
    }
  }, [liveUrl, match.cameraFallbackUrl]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-foreground/5 border border-border">
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          <span className="text-sm">Connecting to stream…</span>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="text-3xl">📡</span>
          <p className="text-sm font-medium text-foreground">{error}</p>
          <p className="text-xs text-muted">
            {match.sport === "cricket" && "Check that phones are streaming via Larix Broadcaster."}
            {match.sport === "football" && "The camera phones must be pushing RTMP to the server."}
            {match.sport === "basketball" && "Stream starts when cameras go live."}
          </p>
        </div>
      )}

      <video
        ref={videoRef}
        className="h-full w-full"
        controls
        playsInline
        muted
        style={{ display: error ? "none" : "block" }}
      />
    </div>
  );
}
