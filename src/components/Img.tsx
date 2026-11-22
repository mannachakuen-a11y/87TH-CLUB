/* Responsive image for stored product media (WebP renditions with srcset). */
type Props = {
  src: string;
  srcset?: unknown;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
  width?: number | null;
  height?: number | null;
};

export function srcSetOf(srcset: unknown) {
  if (!srcset || typeof srcset !== 'object') return undefined;
  return Object.entries(srcset as Record<string, string>)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([w, u]) => `${u} ${w}w`)
    .join(', ');
}

export default function Img({ src, srcset, alt, sizes = '100vw', className, priority, width, height }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      srcSet={srcSetOf(srcset)}
      sizes={sizes}
      alt={alt}
      width={width ?? undefined}
      height={height ?? undefined}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}
