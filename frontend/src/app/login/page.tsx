"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login } from "@/api/studentsApi";
import "@/app/register/register.css";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.replace("/students");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not log in.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="register-page">
      <div className="register-page__intro">
        <p className="register-page__eyebrow">WELCOME BACK</p>
        <h1>Log in to your account</h1>
        <p>Sign in to manage your student community.</p>
      </div>
      <form className="register-page__form" onSubmit={handleSubmit}>
        <label htmlFor="login-email">Email</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
        />

        <label htmlFor="login-password">Password</label>
        <div className="register-page__password-field">
          <input
            id="login-password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            className="register-page__password-toggle"
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            onClick={() => setShowPassword((visible) => !visible)}
          >
            {showPassword ? (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M3 3l18 18M10.6 10.7a2 2 0 002.7 2.7" />
                <path d="M9.9 5.2A10.8 10.8 0 0112 5c5 0 8.5 4.2 9.5 6-.4.8-1.4 2.1-3 3.3M6.2 6.2C3.9 7.6 2.8 9.5 2.5 11c.9 1.8 4.4 6 9.5 6 1.1 0 2.1-.2 3-.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z" />
                <circle cx="12" cy="12" r="2.5" />
              </svg>
            )}
          </button>
        </div>
{/* /check */}
        <p className="register-page__footer login-page__forgot-password">
          <Link href="/forgot-password">Forgot password?</Link>
        </p>

        {error && (
          <p className="register-page__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="register-page__footer">
        Don&apos;t have an account? <Link href="/register">Create one</Link>
      </p>
    </section>
  );
}
