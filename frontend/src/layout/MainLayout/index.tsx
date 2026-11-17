'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearAccessToken, hasAccessToken } from '@/api/studentsApi';
import './index.css';

export default function MainLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthPage = [
    '/register',
    '/login',
    '/forgot-password',
    '/reset-password',
  ].includes(pathname);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  function handleLogout() {
    setIsLogoutDialogOpen(true);
  }

  function confirmLogout() {
    setIsLogoutDialogOpen(false);
    clearAccessToken();
    router.replace('/login');
  }

  useEffect(() => {
    const syncAuthState = () => setIsLoggedIn(hasAccessToken());
    syncAuthState();
    window.addEventListener('auth-change', syncAuthState);
    window.addEventListener('storage', syncAuthState);
    return () => {
      window.removeEventListener('auth-change', syncAuthState);
      window.removeEventListener('storage', syncAuthState);
    };
  }, []);

  useEffect(() => {
    if (isLoggedIn === null) return;

    if (isLoggedIn && isAuthPage) {
      router.replace('/students');
    } else if (!isLoggedIn && !isAuthPage) {
      router.replace('/login')
    }
  }, [isAuthPage, isLoggedIn, router]);

  useEffect(() => {
    if (!isLogoutDialogOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsLogoutDialogOpen(false);
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [isLogoutDialogOpen]);

  return (
    <div className="main-layout">
      <header className="main-layout__header">
        <a className="main-layout__brand" href="/students" aria-label="Students App home">
          <span className="main-layout__brand-mark" aria-hidden="true">S</span>
          <span>Students<span className="main-layout__brand-light">pace</span></span>
        </a>
        {!isAuthPage && (
          <nav className="main-layout__header-actions" aria-label="Account">
            {isLoggedIn === true && (
              <button className="main-layout__header-note main-layout__header-button" onClick={handleLogout}>
                Logout
              </button>
            )}
            {isLoggedIn === false && <span className="main-layout__header-note">Login</span>}
            <Link className="main-layout__header-note" href="/profile">Profile</Link>
          </nav>
        )}
      </header>
      <main className="main-layout__content" aria-busy={!isAuthPage && isLoggedIn !== true}>
        {isAuthPage || isLoggedIn === true ? children : <p>Checking your session...</p>}
      </main>
      {isLogoutDialogOpen && (
        <div
          className="logout-dialog__backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setIsLogoutDialogOpen(false);
          }}
        >
          <section
            className="logout-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="logout-dialog-title"
            aria-describedby="logout-dialog-description"
          >
            <h2 id="logout-dialog-title">Log out?</h2>
            <p id="logout-dialog-description">Are you sure you want to log out of your account?</p>
            <div className="logout-dialog__actions">
              <button type="button" className="logout-dialog__cancel" onClick={() => setIsLogoutDialogOpen(false)}>
                Cancel
              </button>
              <button type="button" className="logout-dialog__confirm" onClick={confirmLogout}>
                Log out
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
