"use client";

import * as React from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Sparkline — mini line chart untuk hero card (trend 7 hari)         */
/* ------------------------------------------------------------------ */

export function Sparkline({
  data,
  className,
  strokeClassName = "stroke-white/40",
  fillClassName = "fill-white/10",
  width = 120,
  height = 36,
  strokeWidth = 1.5,
}: {
  data: number[];
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
}) {
  if (!data || data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / Math.max(data.length - 1, 1);

  const points = data.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return [x, y] as const;
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`)
    .join(" ");

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={areaPath} className={fillClassName} />
      <path
        d={linePath}
        fill="none"
        className={strokeClassName}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r={2.5}
          className="fill-white"
        />
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  AnimatedNumber — odometer-style counting animation                 */
/* ------------------------------------------------------------------ */

export function AnimatedNumber({
  value,
  className,
  format = (n) => n.toLocaleString("id-ID"),
  duration = 0.8,
}: {
  value: number;
  className?: string;
  format?: (n: number) => string;
  duration?: number;
}) {
  const motionValue = useMotionValue(0);
  const [display, setDisplay] = React.useState("0");

  React.useEffect(() => {
    const controls = animate(motionValue, value, {
      duration,
      ease: "easeOut",
    });
    const unsub = motionValue.on("change", (v) => {
      setDisplay(format(Math.round(v)));
    });
    return () => {
      controls.stop();
      unsub();
    };
  }, [value]);

  return <span className={className}>{display}</span>;
}

/* ------------------------------------------------------------------ */
/*  MiniBarChart — horizontal bars untuk weekly (7 hari)              */
/* ------------------------------------------------------------------ */

export function MiniBarChart({
  data,
  className,
  height = 56,
  barColorActive = "bg-primary",
  barColorDim = "bg-muted",
}: {
  data: { label: string; value: number; isToday?: boolean }[];
  className?: string;
  height?: number;
  barColorActive?: string;
  barColorDim?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div
      className={cn("flex items-end justify-between gap-1", className)}
      style={{ height }}
    >
      {data.map((d, i) => {
        const h = (d.value / max) * 100;
        return (
          <div
            key={i}
            className="flex flex-1 flex-col items-center justify-end gap-1"
          >
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(h, 4)}%` }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: "easeOut" }}
              className={cn(
                "w-full rounded-sm",
                d.isToday ? barColorActive : barColorDim,
              )}
              style={{ minHeight: 4 }}
            />
            <span
              className={cn(
                "text-[9px] font-medium",
                d.isToday ? "text-foreground" : "text-muted-foreground/60",
              )}
            >
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  DonutChart — ring chart untuk top categories                       */
/* ------------------------------------------------------------------ */

export function DonutChart({
  data,
  size = 80,
  strokeWidth = 12,
  className,
  centerLabel,
  centerValue,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  className?: string;
  centerLabel?: string;
  centerValue?: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pre-compute cumulative offset for each segment (declarative, no mutation)
  const segments = React.useMemo(() => {
    // Compute cumulative sums without mutation in map
    const cumulative: number[] = [];
    let running = 0;
    for (const d of data) {
      cumulative.push(running);
      running += (d.value / total) * circumference;
    }
    return data.map((d, i) => ({
      ...d,
      dash: (d.value / total) * circumference,
      offset: cumulative[i] ?? 0,
    }));
  }, [data, total, circumference]);

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="rotate-[-90deg]"
        aria-hidden
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {segments.map((d, i) => (
          <motion.circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={d.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${d.dash} ${circumference - d.dash}`}
            strokeDashoffset={-d.offset}
            strokeLinecap="round"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.1 }}
          />
        ))}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-sm font-bold tabular-nums leading-none">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="mt-0.5 text-[9px] text-muted-foreground">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ProgressRing — circular progress untuk budget/target              */
/* ------------------------------------------------------------------ */

export function ProgressRing({
  percentage,
  size = 48,
  strokeWidth = 4,
  color = "stroke-primary",
  className,
  children,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} className="rotate-[-90deg]" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          className={color}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
