'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { createClient } from '../../lib/supabase/client';
import { Eye, EyeOff, KeyRound, LogIn } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';

const DEMO_EMAIL = 'demo@nexus.ai';
const DEMO_PASSWORD = 'demo1234';

function setDemoSession() {
  document.cookie = `nexus_demo=1; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
  window.location.href = '/dashboard';
}

export default function LoginForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isRegistered = searchParams?.get('registered') === 'true';

  const handleDemo = () => {
    setLoading(true);
    setError(null);
    setDemoSession();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (email.trim() === DEMO_EMAIL && password === DEMO_PASSWORD) {
      handleDemo();
      return;
    }

    if (!email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setLoading(true);
    const supabase = createClient();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return;
      }

      window.location.href = '/dashboard';
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'An unexpected error occurred during login.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
      {isRegistered && !error && (
        <div className="rounded-[3px] border border-[#39B58C]/30 bg-[#39B58C]/10 p-3 text-sm text-[#39B58C]">
          Account created successfully! You can now log in.
        </div>
      )}

      {error && (
        <div className="rounded-[3px] border border-[#DD6455]/30 bg-[#DD6455]/10 p-3 text-sm text-[#DD6455]">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
          required
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            required
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C6883] hover:text-[#EBEEF4] transition-colors"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      <Button type="submit" isLoading={loading} className="w-full mt-2">
        <LogIn size={16} />
        Log in
      </Button>

      <p className="text-center text-sm text-[#8E9AB5] mt-2">
        Don’t have an account?{' '}
        <Link href="/signup" className="text-[#D4A657] hover:text-[#E3B768] font-semibold transition-colors">
          Sign up
        </Link>
      </p>

      <div className="relative my-5 text-center">
        <span className="absolute left-0 right-0 top-1/2 h-px bg-[#1B2438]" />
        <span className="relative bg-[#121B2C] px-3 text-xs text-[#5C6883]">or</span>
      </div>

      <div className="rounded-[3px] border border-[#D4A657]/30 bg-[#D4A657]/[0.06] p-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4A657]">
          Try the demo — no account needed
        </p>
        <div className="mt-2.5 space-y-1 text-xs text-[#8E9AB5]">
          <p>
            Email:{' '}
            <span className="font-mono font-medium text-[#EBEEF4]">{DEMO_EMAIL}</span>
          </p>
          <p>
            Password:{' '}
            <span className="font-mono font-medium text-[#EBEEF4]">{DEMO_PASSWORD}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={handleDemo}
          disabled={loading}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-[3px] border border-[#D4A657] bg-[#D4A657]/10 px-4 py-2.5 text-sm font-semibold text-[#D4A657] transition hover:bg-[#D4A657] hover:text-[#171207] disabled:pointer-events-none disabled:opacity-50"
        >
          <KeyRound size={15} />
          Enter demo workspace
        </button>
      </div>
    </form>
  );
}
