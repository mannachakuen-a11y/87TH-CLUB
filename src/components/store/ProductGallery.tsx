'use client';
import { useRef, useState } from 'react';
import Img from '../Img';

type Image = { id: string; url: string; srcset: unknown; alt: string | null; width: number | null; height: number | null };

export default function ProductGallery({ images, title }: { images: Image[]; title: string }) {
  const [idx, setIdx] = useState(0);
  const [zoom, setZoom] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  if (!images.length)
    return (
      <div className="flex aspect-[4/5] items-center justify-center bg-[#f2f2f0]">
        <span className="t-micro text-ink/40">Image coming soon</span>
      </div>
    );
  const onScroll = () => {
    const el = track.current;
    if (el) setIdx(Math.round(el.scrollLeft / el.clientWidth));
  };
  return (
    <>
      {/* mobile: swipe carousel */}
      <div className="relative md:hidden">
        <div ref={track} onScroll={onScroll} className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Product images" role="region">
          {images.map((im, i) => (
            <div key={im.id} className="aspect-[4/5] w-full shrink-0 snap-center bg-[#f2f2f0]">
              <Img src={im.url} srcset={im.srcset} alt={im.alt || `${title} — image ${i + 1}`} sizes="100vw" priority={i === 0} className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="t-micro absolute bottom-3 right-3 bg-white px-2 py-1" aria-live="polite">
            {idx + 1} / {images.length}
          </div>
        )}
      </div>
      {/* desktop: editorial stack */}
      <div className="hidden gap-1 md:grid md:grid-cols-2">
        {images.map((im, i) => (
          <button
            key={im.id}
            onClick={() => setZoom(i)}
            className={`group relative cursor-zoom-in overflow-hidden bg-[#f2f2f0] ${i === 0 || (i === images.length - 1 && (images.length - 1) % 2 === 1) ? 'col-span-2' : ''}`}
            aria-label={`Enlarge image ${i + 1} of ${images.length}`}
          >
            <Img
              src={im.url}
              srcset={im.srcset}
              alt={im.alt || `${title} — image ${i + 1}`}
              sizes={i === 0 ? '60vw' : '30vw'}
              priority={i === 0}
              width={im.width}
              height={im.height}
              className="h-auto w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
            />
          </button>
        ))}
      </div>
      {zoom !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white" role="dialog" aria-modal="true" aria-label="Image viewer" onClick={() => setZoom(null)}>
          <button className="t-ui absolute right-4 top-4 z-10 h-11 px-2" onClick={() => setZoom(null)}>Close</button>
          {images.length > 1 && (
            <>
              <button className="t-ui absolute left-4 top-1/2 z-10 h-11 px-2" onClick={(e) => { e.stopPropagation(); setZoom((zoom - 1 + images.length) % images.length); }}>Prev</button>
              <button className="t-ui absolute right-4 top-1/2 z-10 h-11 px-2" onClick={(e) => { e.stopPropagation(); setZoom((zoom + 1) % images.length); }}>Next</button>
            </>
          )}
          <Img src={images[zoom].url} srcset={images[zoom].srcset} alt={images[zoom].alt || title} sizes="100vw" className="max-h-full max-w-full object-contain" priority />
        </div>
      )}
    </>
  );
}
