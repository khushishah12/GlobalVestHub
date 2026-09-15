'use client';

import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Menu, X, LogOut, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SIDEBAR_NAV_ITEMS } from './sidebarData';
import SidebarItem from './SidebarItem';
import { createClient } from '../../lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export interface SidebarControlProps {
  collapsed: boolean;
  mobileOpen: boolean;
  mounted: boolean;
  toggleCollapsed: () => void;
  openMobile: () => void;
  closeMobile: () => void;
}

interface SidebarProps extends SidebarControlProps {
  userEmail?: string | null;
}

export default function Sidebar({
  collapsed,
  mobileOpen,
  mounted,
  toggleCollapsed,
  openMobile,
  closeMobile,
  userEmail,
}: SidebarProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleDiscover = async () => {
    setDiscovering(true);
    setToast(null);
    try {
      const res = await fetch('/api/stocks/discover', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setToast({ message: data.message || `Added ${data.added} stocks`, type: 'success' });
    } catch (e) {
      setToast({ message: e instanceof Error ? e.message : 'Discovery failed', type: 'error' });
    } finally {
      setDiscovering(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    document.cookie = 'nexus_demo=; path=/; max-age=0; samesite=lax';
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Sign out could not reach Supabase:', e);
    }
    router.push('/login');
    router.refresh();
    setLoggingOut(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#1B2438] px-4 py-4">
        <Link href="/dashboard" className="flex items-center gap-2" onClick={closeMobile}>
          <span className="h-2 w-2 rounded-full bg-[#D4A657] shadow-[0_0_10px_#D4A657]" />
          {!collapsed && (
            <span
              className="text-[15px] font-medium tracking-wide"
              style={{ fontFamily: 'var(--nx-serif-font), Georgia, serif', fontStyle: 'italic' }}
            >
              GlobalVestHub
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleCollapsed}
            className="hidden rounded-[3px] border border-[#1B2438] p-1.5 text-[#5C6883] transition hover:bg-[#121B2C] hover:text-[#EBEEF4] lg:flex"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
          <button
            type="button"
            onClick={closeMobile}
            className="rounded-[3px] p-1.5 text-[#5C6883] hover:text-[#EBEEF4] lg:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {SIDEBAR_NAV_ITEMS.map((item) => (
          <SidebarItem
            key={item.id}
            item={item}
            collapsed={collapsed}
            onNavigate={closeMobile}
            onAction={item.type === 'action' ? handleDiscover : undefined}
            isActionLoading={item.type === 'action' ? discovering : undefined}
          />
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-[#1B2438] px-4 pt-4 pb-10">
        {toast && !collapsed && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className={`flex items-center gap-2 rounded-[3px] px-3 py-2 text-xs font-medium ${
              toast.type === 'success'
                ? 'bg-[#39B58C]/10 text-[#39B58C] border border-[#39B58C]/20'
                : 'bg-[#DD6455]/10 text-[#DD6455] border border-[#DD6455]/20'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span className="flex-1">{toast.message}</span>
          </motion.div>
        )}
        {!collapsed && userEmail ? (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#5C6883]">User</p>
            <p className="truncate text-sm font-semibold text-[#EBEEF4]">{userEmail}</p>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          title={collapsed ? 'Log out' : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-[3px] border border-[#DD6455]/30 bg-[#DD6455]/10 px-3 py-3 text-sm font-semibold text-[#DD6455] transition hover:bg-[#DD6455]/20 hover:text-[#EBEEF4] disabled:opacity-50"
        >
          {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  if (!mounted) {
    return <aside className="hidden w-[240px] shrink-0 lg:block" />;
  }

  return (
    <>
      <button
        type="button"
        onClick={openMobile}
        className="fixed left-4 top-4 z-40 rounded-[3px] border border-[#1B2438] bg-[#0B111C]/95 p-2 text-[#EBEEF4] backdrop-blur lg:hidden"
        aria-label="Open menu"
      >
        <Menu size={20} />
      </button>

      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 240 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed inset-y-0 left-0 z-50 hidden border-r border-[#1B2438] bg-[#0B111C]/95 backdrop-blur-xl lg:block"
      >
        {sidebarContent}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 left-0 z-50 w-[240px] border-r border-[#1B2438] bg-[#0B111C]/98 backdrop-blur-xl lg:hidden"
          >
            {sidebarContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
