import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Drop-style password gate shown before the store opens.
 * NOTE: this is a client-side prototype lock — it hides the UI, it does not secure anything.
 * Configure with VITE_GATE_PASSWORD and VITE_DROP_DATE (ISO date) at build time.
 */
const PASSWORD = (import.meta.env.VITE_GATE_PASSWORD as string | undefined) ?? "87THCLUB";
const DROP = new Date((import.meta.env.VITE_DROP_DATE as string | undefined) ?? "2026-11-21T18:00:00Z");
const KEY = "87c.unlocked";

function readUnlocked() {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function useCountdown(target: Date) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const ms = Math.max(0, target.getTime() - now);
  const s = Math.floor(ms / 1000);
  return { live: ms === 0, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

const pad = (n: number) => String(n).padStart(2, "0");

export function lockStore() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  window.location.reload();
}

export default function Gate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState(readUnlocked);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const [email, setEmail] = useState("");
  const [notified, setNotified] = useState(false);
  const [opening, setOpening] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const cd = useCountdown(DROP);

  useEffect(() => {
    if (!unlocked) {
      document.title = "87TH CLUB — Password";
      input.current?.focus();
    }
  }, [unlocked]);

  if (unlocked) return <>{children}</>;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim().toUpperCase() === PASSWORD.toUpperCase()) {
      setOpening(true);
      try {
        localStorage.setItem(KEY, "1");
      } catch {
        /* ignore */
      }
      setTimeout(() => setUnlocked(true), 700);
    } else {
      setError(true);
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setValue("");
      input.current?.focus();
    }
  };

  return (
    <div className={`gate${opening ? " gate--opening" : ""}`}>
      <div className="gate-bar" aria-hidden="true" />
      <main className="gate-main">
        <h1 className="gate-logo" aria-label="87TH CLUB">
          <span className="gate-logo-87">
            87<sup>TH</sup>
          </span>
          <span className="gate-logo-club">CLUB</span>
        </h1>

        <p className="gate-status">{cd.live ? "The drop is live" : "Store locked"}</p>
        <div className="gate-countdown" role="timer" aria-label="Time until the drop">
          {cd.live ? (
            <span>Enter password</span>
          ) : (
            <>
              <span>{pad(cd.d)}</span>:<span>{pad(cd.h)}</span>:<span>{pad(cd.m)}</span>:<span>{pad(cd.s)}</span>
            </>
          )}
        </div>
        {!cd.live && <p className="gate-units">Days&nbsp;&nbsp;Hrs&nbsp;&nbsp;&nbsp;Min&nbsp;&nbsp;&nbsp;Sec</p>}

        <form className={`gate-form${shake ? " is-shaking" : ""}`} onSubmit={submit}>
          <label htmlFor="gate-pw" className="visually-hidden">
            Password
          </label>
          <input
            id="gate-pw"
            ref={input}
            type="password"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(false);
            }}
            placeholder="Password"
            autoComplete="off"
            aria-invalid={error}
            aria-describedby="gate-msg"
          />
          <button type="submit">Enter</button>
        </form>
        <p id="gate-msg" className="gate-msg" aria-live="polite">
          {opening ? "Access granted" : error ? "Incorrect password. Try again." : "Members only. Enter the password to shop."}
        </p>

        <form
          className="gate-form gate-notify"
          onSubmit={(e) => {
            e.preventDefault();
            try {
              localStorage.setItem("87c.newsletter", email);
            } catch {
              /* ignore */
            }
            setNotified(true);
          }}
        >
          {notified ? (
            <p className="gate-msg">You're on the list. We'll email you the password at drop time.</p>
          ) : (
            <>
              <label htmlFor="gate-email" className="visually-hidden">
                Email
              </label>
              <input id="gate-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email for the password" />
              <button type="submit">Notify me</button>
            </>
          )}
        </form>
      </main>
      <footer className="gate-foot">
        <span>© 2026 87TH CLUB</span>
        <span>87TH CLUB WORLDWIDE</span>
      </footer>
    </div>
  );
}
