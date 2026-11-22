'use client';
import { useEffect, useState } from 'react';

/** datetime-local input that shows/sends the admin's own timezone, with the offset in a hidden "tz" field. */
export default function LocalDateTime({ name, iso, className }: { name: string; iso?: string | null; className?: string }) {
  const [value, setValue] = useState('');
  const [tz, setTz] = useState(0);
  useEffect(() => {
    setTz(new Date().getTimezoneOffset());
    if (iso) {
      const d = new Date(iso);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000);
      setValue(local.toISOString().slice(0, 16));
    }
  }, [iso]);
  return (
    <>
      <input type="datetime-local" id={name} name={name} value={value} onChange={(e) => setValue(e.target.value)} className={className} />
      <input type="hidden" name="tz" value={tz} />
    </>
  );
}
