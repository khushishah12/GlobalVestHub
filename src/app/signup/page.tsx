'use client';

import React, { Suspense } from 'react';
import SignupForm from '../../components/auth/SignupForm';
import Link from 'next/link';

function SignupFormContainer() {
  return <SignupForm />;
}

export default function SignupPage() {
  return (
    <div className="nx-theme flex min-h-screen flex-col overflow-x-hidden">
      {/* Ambient background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top left, rgba(212,166,87,0.05), transparent 55%), radial-gradient(ellipse at bottom right, rgba(57,181,140,0.05), transparent 55%)',
        }}
      />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4A657]/60 to-transparent" />

      {/* Header */}
      <header className="nx-header relative">
        <div className="nx-wrap">
          <nav className="nx-nav">
            <Link href="/" className="nx-logo">
              NEXUS<span className="tick">.AI</span>
            </Link>
            <div className="nx-nav-actions">
              <Link href="/" className="nx-btn nx-btn-ghost">
                Home
              </Link>
              <Link href="/login" className="nx-btn nx-btn-gold">
                Log in
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Auth card */}
      <main className="relative flex flex-1 items-center justify-center px-5 py-16">
        <div className="w-full max-w-md">
          <div className="nx-panel">
            <div className="h-[2px] bg-gradient-to-r from-transparent via-[#D4A657]/70 to-transparent" />
            <div className="nx-auth-card">
              <h1 className="nx-auth-title">
                Create your <em>account</em>
              </h1>
              <p className="nx-auth-sub">
                Join NEXUS.AI and unlock the full AI market terminal — live data, pattern detection and news sentiment.
              </p>
              <Suspense
                fallback={
                  <div className="flex h-44 items-center justify-center">
                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-[#D4A657] border-t-transparent" />
                  </div>
                }
              >
                <SignupFormContainer />
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