"use client";

import { useState } from "react";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

interface Props {
  token: string;
  name: string;
  email: string;
  serviceTier: string;
  bookingDate: string;
}

export default function ActivateForm({ token, name, email, serviceTier, bookingDate }: Props) {
  const [password, setPassword]               = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError]                     = useState("");
  const [loading, setLoading]                 = useState(false);
  const [accountExists, setAccountExists]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const result = schema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(result.error.issues[0]?.message ?? "Invalid input");
      return;
    }

    try {
      setLoading(true);

      // Step 1 — Create the Better Auth account and link to a clients row.
      const activateRes = await fetch("/api/portal/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
        credentials: "include",
      });

      const activateData = await activateRes.json().catch(() => ({})) as {
        success?: boolean;
        alreadyExists?: boolean;
        email?: string;
        error?: unknown;
      };

      if (!activateRes.ok) {
        const msg =
          typeof activateData.error === "string"
            ? activateData.error
            : "Activation failed. Please contact prashant@visaforte.com.";
        setError(msg);
        return;
      }

      // Account already existed — show message and let them log in normally.
      if (activateData.alreadyExists) {
        setAccountExists(true);
        return;
      }

      // Step 2 — Sign in immediately so the client lands on the portal without
      // having to log in manually after activating.
      const signInRes = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: activateData.email ?? email, password }),
        credentials: "include",
      });

      if (!signInRes.ok) {
        // Account is created but sign-in failed — redirect to login with email pre-context.
        window.location.href = "/login";
        return;
      }

      window.location.href = "/portal";
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Account already existed ────────────────────────────────────────────────
  if (accountExists) {
    return (
      <div className="auth-page">
        <BrandPanel />
        <div className="auth-form-panel">
          <div className="auth-form-inner">
            <h2 className="auth-heading">Account Already Active</h2>
            <div className="auth-rule" />
            <p style={{ color: "#555", lineHeight: "1.7", marginTop: "1.25rem", fontSize: "0.95rem" }}>
              A portal account already exists for <strong>{email}</strong>.
              Please log in with your existing credentials.
            </p>
            <a
              href="/login"
              className="auth-submit"
              style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: "1.75rem" }}
            >
              Go to Login
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── Activation form ────────────────────────────────────────────────────────
  return (
    <div className="auth-page">
      <BrandPanel />
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h2 className="auth-heading">Activate Your Portal</h2>
          <div className="auth-rule" />

          {/* Booking confirmation card */}
          <div style={{
            background: "#F8F4EE",
            border: "1px solid #e8e0d4",
            borderRadius: "6px",
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
          }}>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#999", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Consultation Confirmed
            </p>
            <p style={{ margin: "0.35rem 0 0", fontWeight: 600, color: "#0C2340", fontSize: "0.95rem" }}>{name}</p>
            <p style={{ margin: "0.2rem 0 0", color: "#555", fontSize: "0.875rem" }}>{serviceTier}</p>
            <p style={{ margin: "0.2rem 0 0", color: "#999", fontSize: "0.8rem" }}>{bookingDate}</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label className="auth-label" htmlFor="email-display">Email Address</label>
              <input
                id="email-display"
                type="email"
                className="auth-input"
                value={email}
                readOnly
                style={{ background: "#f5f3f0", cursor: "default", color: "#999" }}
              />
            </div>

            <div className="auth-field">
              <label className="auth-label" htmlFor="new-password">Set a Password</label>
              <input
                id="new-password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div className="auth-field auth-field-last">
              <label className="auth-label" htmlFor="confirm-password">Confirm Password</label>
              <input
                id="confirm-password"
                type="password"
                className="auth-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? "Activating…" : "Activate Portal →"}
            </button>
          </form>

          <p className="auth-footer-note">
            Already have an account? <a href="/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  );
}

function BrandPanel() {
  return (
    <div className="auth-brand">
      <div>
        <p className="auth-brand-wordmark">Visa Forte</p>
        <div className="auth-brand-rule" />
        <h1 className="auth-brand-headline">
          Engineered<br />for Passage.
        </h1>
        <p className="auth-brand-body">
          Expert immigration documentation, prepared with precision.
          Every file personally reviewed.
        </p>
      </div>
      <p className="auth-brand-footer">visaforte.com · Secunderabad, India</p>
    </div>
  );
}