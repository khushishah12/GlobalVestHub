'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { ACCENT_STYLES, type SidebarNavItem } from './sidebarData';

import { Loader2 } from 'lucide-react';

interface SidebarItemProps {
  item: SidebarNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
  onAction?: () => void;
  isActionLoading?: boolean;
}

export default function SidebarItem({ item, collapsed, onNavigate, onAction, isActionLoading }: SidebarItemProps) {
  const pathname = usePathname();
  const isLink = item.type !== 'action';
  const isActive = isLink && pathname
    ? item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href)
    : false;

  const accent = ACCENT_STYLES[item.accent];
  const Icon = item.icon;

  const commonClasses = `group relative flex w-full min-h-[48px] items-center gap-3 rounded-[3px] px-3 py-2.5 text-left transition-all duration-200 ${
    isActive
      ? `bg-[#D4A657]/[0.08] ${accent.glow}`
      : 'hover:bg-[#121B2C] hover:text-[#EBEEF4]'
  } ${collapsed ? 'justify-center' : 'justify-start'} ${isActionLoading ? 'opacity-70 pointer-events-none' : ''}`;

  const content = (
    <>
      {isActive && (
        <motion.span
          layoutId="sidebar-active-bar"
          className={`absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b ${accent.active}`}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        />
      )}

      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-[#1B2438] bg-[#0B111C] transition-transform group-hover:scale-110 ${
          isActive ? accent.icon : 'text-[#5C6883] group-hover:text-[#EBEEF4]'
        }`}
      >
        {isActionLoading ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
      </span>

      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate text-[13px] font-semibold ${
              isActive ? 'text-[#EBEEF4]' : 'text-[#8E9AB5] group-hover:text-[#EBEEF4]'
            }`}
          >
            {isActionLoading ? 'Discovering...' : item.label}
          </span>
          <span className="block truncate text-[10px] text-[#5C6883]">
            {isActionLoading ? 'Fetching stocks...' : item.description}
          </span>
        </span>
      )}

      {collapsed && (
        <span className="pointer-events-none absolute left-full z-50 ml-3 hidden whitespace-nowrap rounded-[3px] border border-[#1B2438] bg-[#0B111C] px-3 py-2 text-xs text-[#EBEEF4] shadow-xl group-hover:block">
          <span className="font-semibold">{isActionLoading ? 'Discovering...' : item.label}</span>
          <span className="mt-0.5 block text-[#5C6883]">
            {isActionLoading ? 'Fetching stocks...' : item.description}
          </span>
        </span>
      )}
    </>
  );

  if (isLink) {
    return (
      <Link href={item.href} onClick={onNavigate} title={collapsed ? item.label : undefined} className={commonClasses}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onAction} disabled={isActionLoading} title={collapsed ? item.label : undefined} className={commonClasses}>
      {content}
    </button>
  );
}
