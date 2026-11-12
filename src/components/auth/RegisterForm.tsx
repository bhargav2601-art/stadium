"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AlertBanner } from "@/components/ui/primitives";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone.trim() || undefined,
          password,
        }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error || "Registration failed.");
        return;
      }
      router.push("/portal/membership");
      router.refresh();
    } catch {
      setError("Network error while creating your account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error ? <AlertBanner tone="error" title="Could not create account" body={error} /> : null}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-name" className="text-sm font-semibold text-[var(--navy-900)]">
          Full name
        </label>
        <input
          id="reg-name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your display name for fellow players"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-email" className="text-sm font-semibold text-[var(--navy-900)]">
          Email address
        </label>
        <input
          id="reg-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-phone" className="text-sm font-semibold text-[var(--navy-900)]">
          Phone number <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <input
          id="reg-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          maxLength={20}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 ..."
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="reg-password" className="text-sm font-semibold text-[var(--navy-900)]">
          Password
        </label>
        <span id="reg-password-hint" className="text-xs text-[var(--muted)]">
          At least 8 characters.
        </span>
        <div className="relative flex items-center">
          <input
            id="reg-password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            minLength={8}
            autoComplete="new-password"
            aria-describedby="reg-password-hint"
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
        className="w-full min-h-[48px] rounded-xl bg-[var(--lime)] px-5 py-3 text-sm font-bold text-[var(--lime-ink)] transition hover:brightness-95 disabled:opacity-60"
      >
        {submitting ? "Creating account..." : "Register & Continue to Membership"}
      </button>

      <p className="text-center text-sm text-[var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--stadium-blue)] underline underline-offset-4">
          Sign in
        </Link>
      </p>
    </form>
  );
}
