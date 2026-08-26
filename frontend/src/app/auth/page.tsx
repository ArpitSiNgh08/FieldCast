"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/ui/Button";
import { Card, CardBody, CardHeader, CardTitle } from "@/ui/Card";
import { Field } from "@/ui/Field";
import { Input } from "@/ui/Input";
import { Tabs } from "@/ui/Tabs";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const { authenticate, googleEnabled, login } = useAuth(); const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try {
      const result = mode === "login" ? await api.loginWithPassword({ email, password }) : await api.register({ name, email, password });
      await authenticate(result.token); router.push("/tournaments");
    } catch (e) { setError(e instanceof Error ? e.message : "Authentication failed"); } finally { setBusy(false); }
  }
  return <div className="mx-auto max-w-md px-4 py-16"><Card><CardHeader><CardTitle>Welcome to FieldCast</CardTitle><p className="mt-1 text-sm text-muted">Sign in to create and manage tournament drafts.</p></CardHeader><CardBody>
    <Tabs value={mode} onChange={setMode} tabs={[{ value: "login", label: "Log in" }, { value: "signup", label: "Sign up" }]} className="mb-5 w-full justify-center" />
    <form onSubmit={submit} className="space-y-4">{mode === "signup" && <Field label="Full name"><Input value={name} onChange={(e)=>setName(e.target.value)} required /></Field>}<Field label="Email"><Input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required /></Field><Field label="Password" hint={mode === "signup" ? "Use at least 8 characters." : undefined}><div className="relative"><Input type={showPassword ? "text" : "password"} value={password} onChange={(e)=>setPassword(e.target.value)} className="pr-11" minLength={8} required /><button type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} title={showPassword ? "Hide password" : "Show password"} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/60" onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? <EyeOffIcon /> : <EyeIcon />}</button></div></Field>{error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<Button type="submit" className="w-full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}</Button></form>
    {googleEnabled && <><div className="my-5 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-border" />or<span className="h-px flex-1 bg-border" /></div><Button variant="outline" className="w-full" onClick={login}>Continue with Google</Button></>}
  </CardBody></Card></div>;
}

function EyeIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="M2.1 12s3.6-7 9.9-7 9.9 7 9.9 7-3.6 7-9.9 7-9.9-7-9.9-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

function EyeOffIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5"><path d="m3 3 18 18" /><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" /><path d="M9.9 4.2A9.6 9.6 0 0 1 12 4c6.3 0 9.9 8 9.9 8a16 16 0 0 1-2.1 3.2M6.6 6.6C3.6 8.6 2.1 12 2.1 12S5.7 20 12 20a9.8 9.8 0 0 0 4.1-.9" /></svg>;
}
