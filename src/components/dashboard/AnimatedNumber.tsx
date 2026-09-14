'use client';

import { useState, useEffect } from 'react';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
  decimals?: number;
  duration?: number;
}

export default function AnimatedNumber({ value, suffix = '', prefix = '', decimals = 0, duration = 1200 }: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = performance.now();
    const from = 0;
    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (value - from) * eased;
      if (progress >= 1) {
        setDisplay(value);
        clearInterval(timer);
      } else {
        setDisplay(decimals > 0 ? Math.round(current * 10 ** decimals) / 10 ** decimals : Math.round(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value, decimals, duration]);

  const displayVal = decimals > 0 ? display.toFixed(decimals) : display.toLocaleString('en-IN');
  return <span>{prefix}{displayVal}{suffix}</span>;
}
