'use client';
import { useKeepAction } from '@/components/admin/ActionForm';
import { importAction } from '../../actions/catalog';
import { input, label } from '@/components/admin/ui';
import type { ImportReport } from '@/lib/importer';

function Go({ pending }: { pending: boolean }) {
  return <button disabled={pending} className="rounded bg-neutral-900 px-5 py-2 text-sm font-medium text-white hover:bg-[#E31B23] disabled:opacity-50">{pending ? 'Importing — downloading images can take a few minutes…' : 'Run import'}</button>;
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-sm font-medium">{title} ({items.length})</summary>
      <ul className="mt-1 max-h-60 list-disc overflow-y-auto pl-5 text-sm">{items.map((x, i) => <li key={i}>{x}</li>)}</ul>
    </details>
  );
}

export default function ImportForm() {
  const [state, onSubmit, pending] = useKeepAction(importAction);
  const r: ImportReport | undefined = state?.report;
  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="space-y-4 rounded border border-neutral-200 bg-white p-4">
        <div>
          <label className={label} htmlFor="file">CSV file</label>
          <input id="file" type="file" name="file" accept=".csv,text/csv" className="text-sm" />
        </div>
        <p className="text-xs font-medium text-neutral-500">— or —</p>
        <div>
          <label className={label} htmlFor="url">Google Sheets link (shared “anyone with the link can view”)</label>
          <input id="url" name="url" placeholder="https://docs.google.com/spreadsheets/d/…/edit#gid=0" className={input} />
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="dryRun" defaultChecked /> Dry run (report only)</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="publish" /> Publish complete products</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="noImages" /> Skip image downloads</label>
        </div>
        <Go pending={pending} />
        {state?.error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
        {state?.ok && <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-800">{state.ok}</p>}
      </form>
      {r && (
        <section className="rounded border border-neutral-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold">Import report {r.dryRun && '(dry run)'}</h2>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {[
              ['Spreadsheet rows', r.totalRows],
              ['Products found', r.productsFound],
              ['Products imported', r.productsImported],
              ['Variants', r.variantsImported],
              ['Images imported', r.imagesImported],
              ['With images', r.productsWithImages.length],
              ['Missing images', r.productsMissingImages.length],
              ['Missing prices', r.productsMissingPrices.length],
            ].map(([k, v]) => (
              <div key={k as string} className="rounded bg-neutral-50 p-3"><dt className="text-xs text-neutral-500">{k}</dt><dd className="text-xl font-semibold">{v}</dd></div>
            ))}
          </dl>
          <details className="mt-4"><summary className="cursor-pointer text-sm font-medium">Column mapping</summary>
            <ul className="mt-1 pl-5 text-sm">{Object.entries(r.columnsDetected).map(([h, f]) => <li key={h}>“{h}” → {f}</li>)}</ul>
            {r.unmappedColumns.length > 0 && <p className="mt-1 text-xs text-neutral-500">Kept as attributes: {r.unmappedColumns.join(', ')}</p>}
          </details>
          <List title="Products missing images" items={r.productsMissingImages} />
          <List title="Products with missing prices" items={r.productsMissingPrices} />
          <List title="Incomplete variants" items={r.productsWithIncompleteVariants.map((v) => `${v.product}: ${v.reason}`)} />
          <List title="Image errors" items={r.imageErrors.map((e) => `${e.product}: ${e.error} (${e.url})`)} />
          <List title="Errors" items={r.errors.map((e) => `${e.row ? `Row ${e.row}: ` : ''}${e.product ? `${e.product}: ` : ''}${e.error}`)} />
          <List title="Published" items={r.publishedAsActive} />
          <List title="Imported as draft" items={r.importedAsDraft} />
        </section>
      )}
    </div>
  );
}
