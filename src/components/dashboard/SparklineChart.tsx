'use client';

interface Point {
  close: number;
}

interface SparklineChartProps {
  data: Point[];
  width?: number;
  height?: number;
  color?: string;
  gradient?: boolean;
}

export default function SparklineChart({
  data,
  width = 260,
  height = 60,
  color = '#22d3ee',
  gradient = true,
}: SparklineChartProps) {
  if (data.length < 2) return null;

  const values = data.map(d => d.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padX = 0;
  const padY = 2;

  const points = values.map((v, i) => {
    const x = padX + (i / (values.length - 1)) * (width - padX * 2);
    const y = padY + (1 - (v - min) / range) * (height - padY * 2);
    return `${x},${y}`;
  });

  const linePoints = points.join(' ');
  const areaPoints = `${points.join(' ')} ${width - padX},${height - padY} ${padX},${height - padY}`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
      {gradient && (
        <defs>
          <linearGradient id={`sparkGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
      )}
      <polygon points={areaPoints} fill={gradient ? `url(#sparkGrad-${color.replace('#', '')})` : 'none'} />
      <polyline points={linePoints} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
