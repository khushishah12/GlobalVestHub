'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSidebar } from '../../hooks/useSidebar';
import Sidebar from '../sidebar/Sidebar';
import { createClient } from '../../lib/supabase/client';
import ChatbotWidget from './ChatbotWidget';
import { BarChart3, Target, Calculator, Newspaper, CalendarDays } from 'lucide-react';

const QUICK_ACTIONS = [
  { href: '/dashboard/charts', icon: BarChart3, label: 'Charts' },
  { href: '/dashboard/stock-picker', icon: Target, label: 'Stock Picker' },
  { href: '/dashboard/what-if', icon: Calculator, label: 'What-If' },
  { href: '/dashboard/news', icon: Newspaper, label: 'News' },
  { href: '/dashboard/calendar', icon: CalendarDays, label: 'Calendar' },
];

export default function DashboardLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const sidebar = useSidebar();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(async ({ data }) => {
        if (data.user) {
          setEmail(data.user.email ?? null);

          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .maybeSingle();

            if (!profile) {
              await supabase.from('profiles').insert({
                id: data.user.id,
                name:
                  data.user.user_metadata?.name ||
                  data.user.email?.split('@')[0] ||
                  'User',
                email: data.user.email ?? '',
              });
            }
          } catch (profileErr) {
            console.error('Error checking/auto-creating profile:', profileErr);
          }
        }
      });
    } catch (err) {
      console.warn('Supabase client failed to initialize or fetch user:', err);
    }
  }, []);

  const desktopSidebarWidth = sidebar.collapsed ? 80 : 240;
  const mobileOpenStyle = sidebar.mobileOpen
    ? {
        marginLeft: '240px',
        width: 'calc(100% - 240px)',
      }
    : {};

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0E1523] text-[#EBEEF4]" style={{ fontFamily: 'var(--nx-sans-font), -apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(212,166,87,0.04),transparent_50%),radial-gradient(ellipse_at_bottom_right,rgba(57,181,140,0.03),transparent_50%)]" />
      <Sidebar {...sidebar} userEmail={email} />
      <main
        style={{
          ...mobileOpenStyle,
          '--sidebar-width': `${desktopSidebarWidth}px`,
        } as unknown as React.CSSProperties}
        className="dashboard-main relative min-h-screen pt-16 transition-all duration-300 ease-out md:pt-0"
      >
        <nav className="fixed z-40 top-1/2 -translate-y-1/2 flex flex-col items-center gap-3 rounded-l-[4px] border border-r-0 border-[#D4A657]/60 bg-[#121B2C]/90 backdrop-blur-sm py-4 px-1.5 shadow-[-4px_0_16px_rgba(212,166,87,0.08)]"
          style={{ right: '0px' }}>
          {QUICK_ACTIONS.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              title={label}
              className="group relative flex h-10 w-10 items-center justify-center rounded-full border border-[#D4A657]/40 bg-[#0B111C] text-[#8E9AB5] transition-all hover:border-[#D4A657] hover:text-[#D4A657] hover:shadow-[0_0_12px_rgba(212,166,87,0.25)]"
            >
              <Icon className="h-4 w-4" />
              <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-[3px] border border-[#D4A657]/30 bg-[#0B111C] px-3 py-1.5 text-xs font-semibold text-[#EBEEF4] opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                {label}
              </span>
            </Link>
          ))}
        </nav>
        <div className="nx-page-margins min-w-0 py-8 lg:py-10">
          {children}
        </div>
      </main>
      <ChatbotWidget />
    </div>
  );
}
