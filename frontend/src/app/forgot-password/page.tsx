'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Alert, Snackbar } from '@mui/material';
import { requestPasswordReset } from '@/api/studentsApi';
import '@/app/register/register.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [toastOpen, setToastOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim());
      setMessage(result.message);
      setToastOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit the request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="register-page">
      <div className="register-page__intro">
        <p className="register-page__eyebrow">ACCOUNT HELP</p>
        <h1>Forgot your password?</h1>
        <p>Enter your registered email and we’ll send reset instructions if an account matches.</p>
      </div>

      <form className="register-page__form" onSubmit={handleSubmit}>
        <label htmlFor="forgot-email">Email</label>
        <input
          id="forgot-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          autoFocus
        />

        {message && <p className="register-page__success" role="status">{message}</p>}
        {error && <p className="register-page__error" role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Send reset instructions'}
        </button>
      </form>

      <p className="register-page__footer">
        <Link href="/login">Back to login</Link>
      </p>

      <Snackbar
        open={toastOpen}
        autoHideDuration={5000}
        onClose={() => setToastOpen(false)}
      >
        <Alert severity="success" onClose={() => setToastOpen(false)}>
          If an account matches, reset instructions are on their way.
        </Alert>
      </Snackbar>
    </section>
  );
}