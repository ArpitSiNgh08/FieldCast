"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Spinner } from "@/ui/Spinner";

export function NavigationLoading() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const requests = useRef(0);

  useEffect(() => {
    const onRequest = (event: Event) => {
      const active = (event as CustomEvent<{ active: boolean }>).detail.active;
      requests.current = Math.max(0, requests.current + (active ? 1 : -1));
      setLoading(requests.current > 0);
    };
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target as HTMLElement;
      const link = target.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download") || !link.href.startsWith(window.location.origin)) return;
      const next = new URL(link.href);
      if (next.pathname !== window.location.pathname || next.search !== window.location.search) setLoading(true);
    };
    document.addEventListener("click", onClick);
    window.addEventListener("fieldcast:request", onRequest);
    return () => { document.removeEventListener("click", onClick); window.removeEventListener("fieldcast:request", onRequest); };
  }, [pathname]);

  if (!loading) return null;
  return <div className="fixed inset-x-0 top-0 z-50 h-1 bg-accent/20" aria-live="polite"><div className="flex h-1 w-1/3 animate-pulse bg-accent" /><div className="fixed right-4 top-3 rounded-full bg-surface p-2 shadow-md"><Spinner className="h-4 w-4" /></div><span className="sr-only">Loading page</span></div>;
}
