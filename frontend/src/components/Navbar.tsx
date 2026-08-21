"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/ui/Button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/tournaments", label: "Create tournament" },
  { href: "/organizer", label: "Organiser", authOnly: true },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/admin/tournaments", label: "Reviews", adminOnly: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout, loading } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-black font-bold">
            F
          </span>
          <span className="text-lg font-bold tracking-tight">
            Field<span className="text-accent">Cast</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.filter((n) => (!n.adminOnly || isAdmin) && (!n.authOnly || user)).map((n) => {
            const active = n.href === "/" || n.href === "/admin"
              ? pathname === n.href
              : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground"
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {loading ? null : user ? (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium leading-tight">{user.name}</p>
                <p className="text-xs text-muted leading-tight">
                  {isAdmin ? "Admin" : "Viewer"}
                </p>
              </div>
              <Button size="sm" variant="ghost" onClick={logout}>
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/auth"><Button size="sm">Log in</Button></Link>
          )}
        </div>
      </div>
    </header>
  );
}
