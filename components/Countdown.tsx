"use client";

import { useEffect, useState } from "react";
import { timeLeft } from "@/lib/format";

// Live "time left" label. Ticks every second in the last hour, otherwise every 30 seconds.
export default function Countdown({ end, dateOnly = false, className = "" }: { end: string | null; dateOnly?: boolean; className?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    if (!end) return;
    const msLeft = new Date(end).getTime() - Date.now();
    const id = setInterval(() => setNow(Date.now()), msLeft < 3_600_000 ? 1000 : 30_000);
    return () => clearInterval(id);
  }, [end]);
  const t = timeLeft(end, now ?? undefined);
  const text = dateOnly && t.urgency !== "ended" && t.urgency !== "unknown"
    ? `Closes ${new Date(end as string).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
    : t.text;
  return (
    <span className={`countdown countdown-${t.urgency} ${className}`} suppressHydrationWarning>
      <svg aria-hidden="true" viewBox="0 0 16 16" width="13" height="13"><circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M8 4.5V8l2.5 1.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
      {text}
    </span>
  );
}
