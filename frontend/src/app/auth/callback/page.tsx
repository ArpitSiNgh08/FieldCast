"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

/**
 * The backend redirects here after a successful Google OAuth login,
 * with the JWT as a `?token=<jwt>` query param.
 * We store it, then redirect to the page the user came from (or home).
 */
export default function AuthCallbackPage() {
  return <Suspense fallback={<Loading />}><CallbackHandler /></Suspense>;
}

function CallbackHandler() {
  const params = useSearchParams();
  const router = useRouter();
  const { handleToken } = useAuth();
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const token = params.get("token");
    if (!token) {
      router.replace("/?auth=error");
      return;
    }

    handleToken(token).then(() => {
      router.replace("/");
    });
  }, [params, router, handleToken]);

  return <Loading />;
}

function Loading() {
  return (
    <div className="flex h-64 flex-col items-center justify-center gap-4 text-muted">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-border border-t-accent" />
      <p className="text-sm">Signing you in…</p>
    </div>
  );
}
