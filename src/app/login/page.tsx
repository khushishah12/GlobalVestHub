'use client';

import React, { Suspense } from 'react';
import LoginForm from '../../components/auth/LoginForm';
import Link from 'next/link';

function LoginFormContainer() {
  return <LoginForm />;
}

export default function LoginPage() {
  return (
    <div className="nx-theme flex min-h-screen flex-col overflow-x-hidden">
      {/* Header */}
      <header className="nx-header">
        <div className="nx-wrap">
          <nav className="nx-nav">
            <Link href="/" className="nx-logo">
              GlobalVestHub
            </Link>
            <div className="nx-nav-actions">
              <Link href="/" className="nx-btn nx-btn-ghost">
                Home
              </Link>
              <Link href="/signup" className="nx-btn nx-btn-gold">
                Sign up free
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Auth card */}
      <main className="flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <div className="nx-panel">
            <div className="nx-auth-card">
              <h1 className="nx-auth-title">
                Welcome <em>back</em>
              </h1>
              <p className="nx-auth-sub">
                Sign in to access your GlobalVestHub terminal and market intelligence.
              </p>
              <Suspense
                fallback={
                  <div className="flex h-44 items-center justify-center">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4A657] border-t-transparent" />
                  </div>
                }
              >
                <LoginFormContainer />
              </Suspense>
            </div>
          </div>

          <p className="nx-auth-note mt-6">
            <span className="nx-dot" />
            No card required · Free plan covers a 10-ticker watchlist
          </p>
        </div>
      </main>
    </div>
  );
}