import Link from 'next/link';

export default function Pagination({ page, pages, basePath, params }: { page: number; pages: number; basePath: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (p: number) => {
    const sp = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    if (p > 1) sp.set('page', String(p));
    else sp.delete('page');
    return `${basePath}${sp.toString() ? `?${sp}` : ''}`;
  };
  return (
    <nav aria-label="Pagination" className="mt-14 flex items-center justify-center gap-6">
      {page > 1 ? <Link href={href(page - 1)} className="t-ui link-u">Previous</Link> : <span className="t-ui text-ink/25">Previous</span>}
      <span className="t-ui">{page} / {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="t-ui link-u">Next</Link> : <span className="t-ui text-ink/25">Next</span>}
    </nav>
  );
}
