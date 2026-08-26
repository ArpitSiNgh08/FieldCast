"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import type { Match } from "@/lib/types";
import { getSocket } from "@/lib/socket";

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
  const [viewerCounts, setViewerCounts] = useState({ live: 0, unique: 0 });

  useEffect(() => {
    if (match.status !== "live") return;
    // This is intentionally browser-scoped rather than account-scoped: live
    // matches are public and viewers do not need to sign in.
    const storageKey = "fieldcast-viewer-id";
    let viewerId = localStorage.getItem(storageKey);
    if (!viewerId) {
      viewerId = crypto.randomUUID();
      localStorage.setItem(storageKey, viewerId);
    }

    const socket = getSocket();
    const report = () => socket.emit("stream:watch", { matchId: match.id, viewerId });
    const onViewerCount = (payload: { matchId: number; live: number; unique: number }) => {
      if (payload.matchId === match.id) setViewerCounts({ live: payload.live, unique: payload.unique });
    };

    socket.on("stream:viewers", onViewerCount);
    if (socket.connected) report();
    socket.on("connect", report);

    return () => {
      socket.emit("stream:leave", { matchId: match.id });
      socket.off("connect", report);
      socket.off("stream:viewers", onViewerCount);
    };
  }, [match.id, match.status]);

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
    <div>
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
      {match.status === "live" && (
        <div className="mt-2 flex items-center gap-4 px-1 text-xs text-muted" aria-live="polite">
          <span><span className="mr-1 inline-block h-2 w-2 rounded-full bg-red-500" />{viewerCounts.live} watching now</span>
          <span>{viewerCounts.unique} unique viewers</span>
        </div>
      )}
    </div>
  );
}
