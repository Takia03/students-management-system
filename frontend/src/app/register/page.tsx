'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { register } from '@/api/studentsApi';
import './register.css';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
      router.replace('/students');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="register-page">
      <div className="register-page__intro">
        <p className="register-page__eyebrow">GET STARTED</p>
        <h1>Create your account</h1>
        <p>Register to manage your student community.</p>
      </div>
      <form className="register-page__form" onSubmit={handleSubmit}>
        <label htmlFor="register-name">Name</label>
        <input
          id="register-name"
          name="name"
          autoComplete="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
          autoFocus
        />

        <label htmlFor="register-email">Email</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <label htmlFor="register-password">Password</label>
        <div className="register-page__password-field">
          <input
            id="register-password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            className="register-page__password-toggle"
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
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
        <p className="register-page__hint">Use at least 8 characters.</p>

        {error && <p className="register-page__error" role="alert">{error}</p>}
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="register-page__footer">
        Already have an account? <Link href="/login">Login</Link>
      </p>
    </section>
  );
}
