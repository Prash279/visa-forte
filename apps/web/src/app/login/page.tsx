"use client";

import { useState } from "react";
import { z } from "zod";
import "../auth.css";

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

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
    <div className="auth-page">

      {/* ── Brand panel ─────────────────────────────────────────
          Mobile : compact strip — wordmark + saffron rule only
          Desktop: full-height sticky column with headline + footer */}
      <div className="auth-brand">

        {/* Always visible: wordmark + rule */}
        <div>
          <p className="auth-brand-wordmark">Visa Forte</p>
          <div className="auth-brand-rule" />
        </div>

        {/* Desktop only: headline + body copy */}
        <div className="auth-brand-full">
          <h1 className="auth-brand-headline">
            Engineered<br />for Passage.
          </h1>
          <p className="auth-brand-body">
            Expert immigration documentation, prepared with precision.
            Every file personally reviewed.
          </p>
        </div>

        {/* Desktop only: footer */}
        <p className="auth-brand-footer auth-brand-full">
          visaforte.com · Secunderabad, India
        </p>

      </div>

      {/* ── Form panel ──────────────────────────────────────────
          Mobile : top-aligned, simple block layout
          Desktop: flex centred horizontally and vertically     */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">

          <h2 className="auth-heading">Welcome back.</h2>
          <div className="auth-rule" />

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label className="auth-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className="auth-field auth-field-last">
              <label className="auth-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="auth-footer-note">
            No account?{" "}
            <a href="/signup">Create one</a>
          </p>

        </div>
      </div>

    </div>
  );
}