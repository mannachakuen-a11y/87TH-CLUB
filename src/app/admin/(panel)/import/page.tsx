import { prisma } from '@/lib/db';
import { Card, PageHeader, td, th } from '@/components/admin/ui';
import ImportForm from './ImportForm';
import type { ImportReport } from '@/lib/importer';

export default async function ImportAdmin() {
  const runs = await prisma.importRun.findMany({ orderBy: { createdAt: 'desc' }, take: 20 });
  return (
    <>
      <PageHeader title="Import products" sub="Upload a CSV export or paste a Google Sheets link. Re-importing updates existing products instead of duplicating them." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2"><ImportForm /></div>
        <Card title="Expected columns">
          <p className="mb-2 text-sm text-neutral-600">Header names are matched flexibly. One row per product, or one row per variant sharing a handle/name.</p>
          <ul className="space-y-1 text-sm">
            <li><b>Name</b> (title / product name) — required</li>
            <li><b>Price</b> — written exactly as sold, e.g. 3500</li>
            <li>Original price (compare-at)</li>
            <li>Description, Details</li>
            <li>Category, Collection</li>
            <li>Size (e.g. S, M, L) and Colour</li>
            <li>Stock — a number per row, or “S:3, M:5”</li>
            <li>SKU, Handle</li>
            <li>Image, Image 2, Additional images (URLs or Google Drive links shared “anyone with the link”)</li>
            <li>Featured, New arrival (yes/no)</li>
          </ul>
          <p className="mt-3 text-xs text-neutral-500">Nothing is invented: missing prices, stock or images stay missing and are listed in the report. Products import as drafts unless “publish complete products” is ticked.</p>
        </Card>
      </div>
      <Card title="Import history" className="mt-6">
        {runs.length ? (
          <table className="w-full">
            <thead><tr><th className={th}>When</th><th className={th}>Source</th><th className={th}>Rows</th><th className={th}>Products</th><th className={th}>Images</th><th className={th}>Missing images</th><th className={th}>Errors</th></tr></thead>
            <tbody>
              {runs.map((r) => {
                const rep = r.report as unknown as ImportReport;
                return (
                  <tr key={r.id}>
                    <td className={td}>{r.createdAt.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td className={`${td} max-w-xs truncate`}>{r.source}</td>
                    <td className={td}>{rep.totalRows}</td>
                    <td className={td}>{rep.productsImported}</td>
                    <td className={td}>{rep.imagesImported}</td>
                    <td className={td}>{rep.productsMissingImages?.length ?? 0}</td>
                    <td className={td}>{rep.errors.length + rep.imageErrors.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : <p className="text-sm text-neutral-500">No imports yet.</p>}
      </Card>
    </>
  );
}
