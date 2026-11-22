/* The 87th Club Afro-girl mascot — original artwork exported from the brand's Canva files. Never redraw or recolour. */
export default function Mascot({ size = 44, reversed = false, className = '', priority = false }: { size?: number; reversed?: boolean; className?: string; priority?: boolean }) {
  const src = reversed ? '/brand/mascot-reversed-1024.png' : size > 256 ? '/brand/mascot-1024.webp' : '/brand/mascot-512.webp';
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={size} height={size} alt="THE 87TH CLUB" className={className} loading={priority ? 'eager' : 'lazy'} decoding="async" draggable={false} />
  );
}
