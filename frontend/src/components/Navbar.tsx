"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/ui/Button";
import { cn } from "@/lib/cn";
import { SvgLogo } from "@/components/SvgLogo";

const NAV = [
  { href: "/", label: "Fixtures" },
  { href: "/standings", label: "Standings" },
  { href: "/tournaments", label: "Create tournament", authOnly: true },
  { href: "/organizer", label: "Organiser", authOnly: true },
  { href: "/admin", label: "Admin", adminOnly: true },
  { href: "/admin/tournaments", label: "Reviews", adminOnly: true },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, isAdmin, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const visibleNav = NAV.filter((item) => (!item.adminOnly || isAdmin) && (!item.authOnly || user));

  useEffect(() => {
    if (!mobileOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mobileOpen]);

  function isActive(href: string) {
    return href === "/" || href === "/admin"
      ? pathname === href
      : pathname.startsWith(href);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex min-w-0 items-center gap-2">
          <SvgLogo className="h-8 w-8 rounded-lg" />
          <span className="truncate text-lg font-bold tracking-tight">
            Field<span className="text-accent">Cast</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main navigation">
          {visibleNav.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-surface-2 text-foreground"
                    : "text-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
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

        <button
          type="button"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-surface-2 md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={mobileOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMobileOpen(true)}
        >
          <MenuIcon />
        </button>
      </div>

      {mobileOpen && createPortal((
        <div className="fixed inset-0 z-50 md:hidden">
          <button type="button" className="absolute inset-0 bg-foreground/35 backdrop-blur-[1px]" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)} />
          <aside id="mobile-navigation" role="dialog" aria-modal="true" aria-label="Navigation menu" className="absolute inset-y-0 left-0 flex w-[min(20rem,88vw)] flex-col border-r border-border bg-surface shadow-2xl">
            <div className="flex h-16 items-center justify-between gap-3 border-b border-border px-4">
              <Link href="/" className="flex min-w-0 items-center gap-2" onClick={() => setMobileOpen(false)}>
                <SvgLogo className="h-8 w-8 shrink-0 rounded-lg" />
                <span className="truncate text-lg font-bold tracking-tight">Field<span className="text-accent">Cast</span></span>
              </Link>
              <button ref={closeButtonRef} type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-foreground" aria-label="Close navigation menu" onClick={() => setMobileOpen(false)}><CloseIcon /></button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile navigation">
              <div className="space-y-1">
                {visibleNav.map((item) => {
                  const active = isActive(item.href);
                  return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)} className={cn("flex min-h-11 items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors", active ? "bg-accent/10 text-accent" : "text-foreground hover:bg-surface-2")}>{item.label}</Link>;
                })}
              </div>
            </nav>

            <div className="border-t border-border p-4">
              {loading ? <p className="text-sm text-muted">Loading account…</p> : user ? <div className="space-y-3"><div><p className="truncate text-sm font-semibold">{user.name}</p><p className="text-xs text-muted">{isAdmin ? "Admin" : "Viewer"}</p></div><Button className="w-full" size="sm" variant="outline" onClick={() => { setMobileOpen(false); logout(); }}>Sign out</Button></div> : <Link href="/auth" onClick={() => setMobileOpen(false)}><Button className="w-full" size="sm">Log in</Button></Link>}
            </div>
          </aside>
        </div>
      ), document.body)}
    </header>
  );
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M4 6h16M4 12h16M4 18h16" /></svg>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" /></svg>;
}
