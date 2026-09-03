// Minimal inline icon set (no external deps, works in sandboxed preview).
type P = { size?: number; className?: string };
const S = ({ d, size = 18, className }: { d: string; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d={d} />
  </svg>
);

export const Ic = {
  menu: ({ size, className }: P) => <S d="M4 6h16M4 12h16M4 18h16" size={size} className={className} />,
  grid: ({ size, className }: P) => <S d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" size={size} className={className} />,
  box: ({ size, className }: P) => <S d="M21 8l-9-5-9 5v8l9 5 9-5zM3 8l9 5 9-5M12 13v8" size={size} className={className} />,
  film: ({ size, className }: P) => <S d="M3 4h18v16H3zM7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4" size={size} className={className} />,
  pen: ({ size, className }: P) => <S d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 8.5L13 12l5 1zM2 2l7.6 7.6M11 11l11 11" size={size} className={className} />,
  chart: ({ size, className }: P) => <S d="M3 3v18h18M7 14v4M12 10v8M17 6v12" size={size} className={className} />,
  folder: ({ size, className }: P) => <S d="M3 6h6l2 2h10v10a2 2 0 01-2 2H5a2 2 0 01-2-2V6z" size={size} className={className} />,
  layers: ({ size, className }: P) => <S d="M12 2l9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5" size={size} className={className} />,
  calendar: ({ size, className }: P) => <S d="M3 6h18v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6zM3 10h18M8 3v6M16 3v6" size={size} className={className} />,
  spark: ({ size, className }: P) => <S d="M12 2l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6z" size={size} className={className} />,
  plug: ({ size, className }: P) => <S d="M9 7V3M15 7V3M12 7v4M7 11h10v3a5 5 0 01-10 0v-3zM12 19v3" size={size} className={className} />,
  gear: ({ size, className }: P) => <S d="M12 15a3 3 0 100-6 3 3 0 000 6zM19 12a7 7 0 00-.2-1.6l2-1.6-2-3.5-2.4 1a7 7 0 00-2.8-1.6L13 2H11l-.6 2.7a7 7 0 00-2.8 1.6l-2.4-1-2 3.5 2 1.6A7 7 0 005 12c0 .5.1 1.1.2 1.6l-2 1.6 2 3.5 2.4-1a7 7 0 002.8 1.6L11 22h2l.6-2.7a7 7 0 002.8-1.6l2.4 1 2-3.5-2-1.6c.1-.5.2-1.1.2-1.6z" size={size} className={className} />,
  mail: ({ size, className }: P) => <S d="M3 5h18v14H3zM3 6l9 7 9-7" size={size} className={className} />,
  download: ({ size, className }: P) => <S d="M12 3v12M7 12l5 5 5-5M4 21h16" size={size} className={className} />,
  upload: ({ size, className }: P) => <S d="M12 21V9M7 12l5-5 5 5M4 3h16" size={size} className={className} />,
  plus: ({ size, className }: P) => <S d="M12 5v14M5 12h14" size={size} className={className} />,
  check: ({ size, className }: P) => <S d="M5 13l4 4L19 7" size={size} className={className} />,
  x: ({ size, className }: P) => <S d="M6 6l12 12M18 6L6 18" size={size} className={className} />,
  chevR: ({ size, className }: P) => <S d="M9 6l6 6-6 6" size={size} className={className} />,
  chevL: ({ size, className }: P) => <S d="M15 6l-6 6 6 6" size={size} className={className} />,
  chevD: ({ size, className }: P) => <S d="M6 9l6 6 6-6" size={size} className={className} />,
  arrowR: ({ size, className }: P) => <S d="M5 12h14M13 6l6 6-6 6" size={size} className={className} />,
  search: ({ size, className }: P) => <S d="M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4-4" size={size} className={className} />,
  bell: ({ size, className }: P) => <S d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0" size={size} className={className} />,
  book: ({ size, className }: P) => <S d="M4 4h9l7 7 0 9H4zM13 4v7h7" size={size} className={className} />,
  globe: ({ size, className }: P) => <S d="M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" size={size} className={className} />,
  copy: ({ size, className }: P) => <S d="M9 9h11v11H9zM4 15V4h11" size={size} className={className} />,
  trash: ({ size, className }: P) => <S d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" size={size} className={className} />,
  sparkle: ({ size, className }: P) => <S d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" size={size} className={className} />,
  eye: ({ size, className }: P) => <S d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 15a3 3 0 100-6 3 3 0 000 6z" size={size} className={className} />,
  undo: ({ size, className }: P) => <S d="M3 7v6h6M3 13a9 9 0 103-3" size={size} className={className} />,
  play: ({ size, className }: P) => <S d="M7 4l13 8-13 8V4z" size={size} className={className} />,
  heart: ({ size, className }: P) => <S d="M12 21s-8-4.8-8-11a4 4 0 018-1 4 4 0 018 1c0 6.2-8 11-8 11z" size={size} className={className} />,
  refresh: ({ size, className }: P) => <S d="M20 11a8 8 0 10-.6 3M20 4v7h-7" size={size} className={className} />,
  shield: ({ size, className }: P) => <S d="M12 3l8 3v6c0 5-3.4 8.2-8 9-4.6-.8-8-4-8-9V6l8-3z" size={size} className={className} />,
  link: ({ size, className }: P) => <S d="M10 13a5 5 0 007 0l2-2a5 5 0 00-7-7l-1 1M14 11a5 5 0 00-7 0l-2 2a5 5 0 007 7l1-1" size={size} className={className} />,
  doc: ({ size, className }: P) => <S d="M5 3h9l5 5v13H5zM14 3v5h5" size={size} className={className} />,
  image: ({ size, className }: P) => <S d="M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4" size={size} className={className} />,
  video: ({ size, className }: P) => <S d="M4 5h12v14H4zM16 10l5-3v10l-5-3" size={size} className={className} />,
  lock: ({ size, className }: P) => <S d="M6 11h12v9H6zM8 11V7a4 4 0 018 0v4" size={size} className={className} />,
  send: ({ size, className }: P) => <S d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={size} className={className} />,
  line: ({ size, className }: P) => <S d="M4 12h16" size={size} className={className} />,
};
