"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export function AddTournamentButton() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return null;
  }

  return (
    <Link
      href="/tournaments/new"
      className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-white transition-colors hover:bg-accent-strong hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 whitespace-nowrap"
    >
      + Add tournament
    </Link>
  );
}
