"use client";

import { useState } from "react";
import { z } from "zod";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setError("");

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message ?? "Invalid email or password.");
        return;
      }

      window.location.href = "/admin";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">

      {/* ── Left panel — Brand identity ── */}
      <div className="bg-prussian flex flex-col justify-between px-10 py-12 md:w-5/12 md:sticky md:top-0 md:h-screen">
        <div>
          {/* Wordmark */}
          <p className="font-sans text-[11px] tracking-[0.3em] text-pearl uppercase mb-4">
            Visa Forte
          </p>
          {/* Saffron rule */}
          <div className="w-10 h-[2px] bg-saffron mb-10" />
          {/* Display heading */}
          <h1 className="font-display text-pearl text-5xl leading-[1.15] italic mb-6">
            Engineered<br />for Passage.
          </h1>
          {/* Supporting copy */}
          <p className="font-sans text-sm leading-relaxed max-w-[260px]" style={{ color: "rgba(248,244,238,0.55)" }}>
            Expert immigration documentation, prepared with precision. Every file personally reviewed.
          </p>
        </div>

        {/* Footer */}
        <p className="font-sans text-[11px] tracking-wide" style={{ color: "rgba(248,244,238,0.3)" }}>
          visaforte.com · Secunderabad, India
        </p>
      </div>

      {/* ── Right panel — Form ── */}
      <div className="flex-1 bg-pearl flex items-center justify-center px-8 py-16">
        <div className="w-full max-w-sm">

          {/* Form header */}
          <h2 className="font-display text-prussian text-4xl leading-tight mb-2">
            Welcome back.
          </h2>
          <div className="w-8 h-[2px] bg-saffron mb-10" />

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="border-l-2 border-saffron bg-amber px-4 py-3 mb-6 font-sans text-sm text-ink">
                {error}
              </div>
            )}

            <div className="mb-5">
              <label className="block font-sans text-[11px] tracking-[0.18em] uppercase text-ink mb-2"
                style={{ opacity: 0.6 }}>
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border border-sand px-4 py-3 font-sans text-sm text-ink focus:border-prussian focus:outline-none transition-colors"
                required
              />
            </div>

            <div className="mb-10">
              <label className="block font-sans text-[11px] tracking-[0.18em] uppercase text-ink mb-2"
                style={{ opacity: 0.6 }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border border-sand px-4 py-3 font-sans text-sm text-ink focus:border-prussian focus:outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-prussian text-pearl font-sans text-[11px] tracking-[0.2em] uppercase py-4 transition-colors hover:bg-ink disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-8 font-sans text-sm text-ink" style={{ opacity: 0.55 }}>
            No account?{" "}
            <a href="/signup" className="text-teal font-medium hover:underline">
              Create one
            </a>
          </p>

        </div>
      </div>

    </div>
  );
}