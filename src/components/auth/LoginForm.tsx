"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AlertBanner } from "@/components/ui/primitives";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Sign in failed.");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Network error while signing in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <AlertBanner tone="error" title="Unable to sign in" body={error} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-sm font-semibold text-[var(--navy-900)]">
          Email address
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="member@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-sm font-semibold text-[var(--navy-900)]">
          Password
        </label>
        <div className="relative flex items-center">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full pr-12"
          />
          <button
            type="button"
            aria-pressed={showPassword}
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 inline-flex min-h-[36px] min-w-[36px] items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            {showPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full min-h-[48px] rounded-xl bg-[var(--stadium-blue)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[var(--stadium-blue-hover)] disabled:opacity-60"
      >
        {submitting ? "Signing in..." : "Sign in to Stadium Portal"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        New to Anil Kumble Stadium?{" "}
        <Link href="/register" className="font-semibold text-[var(--stadium-blue)] underline underline-offset-4">
          Create a member account
        </Link>
      </p>
    </form>
  );
}
