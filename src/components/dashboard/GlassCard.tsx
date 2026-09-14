import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  accent?: 'neutral' | 'bullish' | 'bearish';
  id?: string;
}

const accentBorder = {
  neutral: 'border-[#D4A657]/20',
  bullish: 'border-[#39B58C]/25',
  bearish: 'border-[#DD6455]/25',
};

export default function GlassCard({
  children,
  className = '',
  accent = 'neutral',
  id,
}: GlassCardProps) {
  return (
    <div
      id={id}
      className={`rounded-[4px] border bg-[#121B2C]/80 p-5 ${accentBorder[accent]} ${className}`}
    >
      {children}
    </div>
  );
}
