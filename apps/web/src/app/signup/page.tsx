'use client';

import { useState } from 'react';
import { z } from 'zod';
import '../auth.css';

const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: { preventDefault: () => void }) => {
    event.preventDefault();
    setError('');

    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    try {
      setLoading(true);
      const res = await fetch('/api/auth/sign-up/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          name: email.split('@')[0] ?? email,
        }),
        credentials: 'include',
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          (data as { message?: string }).message ?? 'Signup failed. Try again.',
        );
        return;
      }

      window.location.href = '/admin';
    } catch {
      setError('Something went wrong. Please try again.');
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
        {/* Top group — flex child 1.
            Mobile : wordmark + rule only (headline/body hidden via CSS).
            Desktop: wordmark + rule + headline + body all in one group,
                     pinned to the top by justify-content: space-between. */}
        <div>
          <p className="auth-brand-wordmark">Visa Forte</p>
          <div className="auth-brand-rule" />
          <h1 className="auth-brand-headline">
            Engineered
            <br />
            for Passage.
          </h1>
          <p className="auth-brand-body">
            Expert immigration documentation, prepared with precision. Every
            file personally reviewed.
          </p>
        </div>

        {/* Footer — flex child 2, pushed to bottom on desktop.
            Hidden on mobile via CSS. */}
        <p className="auth-brand-footer">visaforte.com · Secunderabad, India</p>
      </div>

      {/* ── Form panel ──────────────────────────────────────────
          Mobile : top-aligned, simple block layout
          Desktop: flex centred horizontally and vertically     */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <h2 className="auth-heading">Create your account.</h2>
          <div className="auth-rule" />

          <form onSubmit={handleSubmit}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
              <label className="auth-label" htmlFor="email">
                Email Address
              </label>
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
              <label className="auth-label" htmlFor="password">
                Password
                <span className="auth-label-note"> — min. 8 characters</span>
              </label>
              <input
                id="password"
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create Account'}
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
