'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export default function Countdown({ to }: { to: string }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);
  const router = useRouter();
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= target) {
        clearInterval(t);
        router.refresh();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [target, router]);
  const p = parts(now === null ? 0 : target - now);
  const cells: [number, string][] = [
    [p.d, 'Days'],
    [p.h, 'Hrs'],
    [p.m, 'Mins'],
    [p.s, 'Secs'],
  ];
  return (
    <div className="flex items-start gap-3 sm:gap-6" role="timer" aria-label="Time until drop">
      {cells.map(([v, l], i) => (
        <div key={l} className="flex items-start gap-3 sm:gap-6">
          <div className="text-center">
            <div className="t-display text-6xl tabular-nums sm:text-8xl">{now === null ? '--' : String(v).padStart(2, '0')}</div>
            <div className="t-micro mt-2 text-paper/50">{l}</div>
          </div>
          {i < 3 && <span className="t-display text-5xl text-signal sm:text-7xl">:</span>}
        </div>
      ))}
    </div>
  );
}
