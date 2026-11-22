/**
 * Product importer — CSV files and Google Sheets.
 *
 * Rules (from the brief):
 *  - never change prices: values are parsed exactly as written; ambiguous values are left missing
 *  - never invent sizes, colours, descriptions or stock: missing data stays missing and is reported
 *  - repeatable: products are matched by a stable import key, so re-running updates instead of duplicating
 *  - images are downloaded from the source (incl. Google Drive links), optimised and attached to the right product
 *  - products missing a price or image are imported as DRAFT so they never appear half-finished in the store
 */
import { parse } from 'csv-parse/sync';
import { Prisma, PrismaClient } from '@prisma/client';
import { parsePriceToMinor } from './money';
import { slugify } from './utils';

export type ImportOptions = { dryRun?: boolean; publish?: boolean; downloadImages?: boolean; onLog?: (msg: string) => void };

export type ImportReport = {
  source: string;
  startedAt: string;
  finishedAt?: string;
  dryRun: boolean;
  totalRows: number;
  emptyRows: number;
  columnsDetected: Record<string, string>;
  unmappedColumns: string[];
  productsFound: number;
  productsCreated: number;
  productsUpdated: number;
  productsImported: number;
  variantsImported: number;
  imagesImported: number;
  imagesSkippedExisting: number;
  productsWithImages: string[];
  productsMissingImages: string[];
  productsMissingPrices: string[];
  productsWithIncompleteVariants: { product: string; reason: string }[];
  imageErrors: { product: string; url: string; error: string }[];
  errors: { row?: number; product?: string; error: string }[];
  publishedAsActive: string[];
  importedAsDraft: string[];
};

// ---------------------------------------------------------------- column mapping
const ALIASES: Record<string, string[]> = {
  handle: ['handle', 'slug', 'product id', 'product handle', 'id', 'url handle'],
  title: ['title', 'name', 'product name', 'product', 'product title', 'item', 'item name'],
  description: ['description', 'body', 'body (html)', 'product description', 'desc'],
  details: ['details', 'materials', 'material', 'fabric', 'care', 'composition', 'features'],
  price: ['price', 'selling price', 'sale price', 'variant price', 'retail price', 'price (kes)', 'price kes', 'unit price'],
  compareAtPrice: ['compare at price', 'compare-at price', 'original price', 'rrp', 'was price', 'variant compare at price', 'old price', 'regular price'],
  category: ['category', 'type', 'product type', 'product category'],
  collections: ['collections', 'collection', 'drop', 'drops', 'capsule'],
  size: ['size', 'sizes', 'option1 value', 'available sizes', 'size options'],
  color: ['colour', 'color', 'colours', 'colors', 'option2 value', 'colorway', 'colourway'],
  stock: ['stock', 'quantity', 'qty', 'inventory', 'stock quantity', 'variant inventory qty', 'stock qty', 'units', 'in stock'],
  sku: ['sku', 'variant sku', 'product code', 'code'],
  image: ['image', 'image url', 'image src', 'main image', 'photo', 'picture', 'image link', 'primary image', 'front image'],
  images: ['images', 'additional images', 'gallery', 'other images', 'alternate images', 'back image', 'image 2', 'image 3', 'image 4', 'image 5', 'variant image', 'alt image'],
  featured: ['featured'],
  newArrival: ['new arrival', 'new', 'new arrivals', 'is new'],
  status: ['status', 'published', 'visibility', 'active'],
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').replace(/[_]+/g, ' ').trim();

export function mapColumns(headers: string[]) {
  const map: Record<string, string> = {}; // header -> field
  const imageCols: string[] = [];
  for (const h of headers) {
    const n = norm(h);
    if (!n) continue;
    let field: string | undefined;
    for (const [f, aliases] of Object.entries(ALIASES)) if (aliases.includes(n)) field = f;
    if (!field && /^image\s*\d+$/.test(n)) field = 'images';
    if (!field) continue;
    if (field === 'image' && Object.values(map).includes('image')) field = 'images';
    map[h] = field;
    if (field === 'image' || field === 'images') imageCols.push(h);
  }
  return { map, imageCols };
}

// ---------------------------------------------------------------- source loading
export function googleSheetCsvUrl(url: string): string | null {
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return null;
  const gid = url.match(/[#&?]gid=(\d+)/)?.[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/gviz/tq?tqx=out:csv${gid ? `&gid=${gid}` : ''}`;
}

export async function fetchSource(source: string): Promise<string> {
  const sheet = googleSheetCsvUrl(source);
  const url = sheet ?? source;
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`Could not download ${url}: HTTP ${res.status}${res.status === 401 || res.status === 403 ? ' — the sheet is private. Share it as "Anyone with the link can view" or upload a CSV export.' : ''}`);
  const text = await res.text();
  if (/^\s*<!doctype html/i.test(text)) throw new Error('The link returned a web page, not CSV data. Check sharing settings or upload a CSV export.');
  return text;
}

/** Converts Google Drive share links into direct download links. */
export function directImageUrl(url: string): string {
  const u = url.trim();
  const id = u.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/)?.[1] || u.match(/drive\.google\.com\/(?:open|uc)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/)?.[1];
  if (id) return `https://drive.google.com/uc?export=download&id=${id}`;
  return u;
}

function splitList(v: string): string[] {
  return v
    .split(/[,|;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function extractUrls(v: string): string[] {
  return (v.match(/https?:\/\/[^\s,;|"']+/g) || []).map((s) => s.replace(/[)\]]+$/, ''));
}

const truthy = (v?: string) => !!v && /^(y|yes|true|1|x|✓|featured|new)$/i.test(v.trim());

// ---------------------------------------------------------------- main
type Draft = {
  key: string;
  rows: number[];
  title: string;
  handle?: string;
  description?: string;
  details?: string;
  priceRaw?: string;
  compareRaw?: string;
  category?: string;
  collections: string[];
  sku?: string;
  featured?: boolean;
  newArrival?: boolean;
  status?: string;
  images: string[];
  variants: { size: string | null; color: string | null; stockRaw?: string; sku?: string; priceRaw?: string }[];
  extra: Record<string, string>;
};

export async function runImport(prisma: PrismaClient, csvText: string, source: string, opts: ImportOptions = {}): Promise<ImportReport> {
  const log = opts.onLog ?? (() => {});
  const report: ImportReport = {
    source,
    startedAt: new Date().toISOString(),
    dryRun: !!opts.dryRun,
    totalRows: 0,
    emptyRows: 0,
    columnsDetected: {},
    unmappedColumns: [],
    productsFound: 0,
    productsCreated: 0,
    productsUpdated: 0,
    productsImported: 0,
    variantsImported: 0,
    imagesImported: 0,
    imagesSkippedExisting: 0,
    productsWithImages: [],
    productsMissingImages: [],
    productsMissingPrices: [],
    productsWithIncompleteVariants: [],
    imageErrors: [],
    errors: [],
    publishedAsActive: [],
    importedAsDraft: [],
  };

  let records: Record<string, string>[];
  try {
    records = parse(csvText, { columns: (h: string[]) => h.map((x, i) => x.trim() || `__col${i}`), skip_empty_lines: false, relax_column_count: true, bom: true, trim: true });
  } catch (e) {
    report.errors.push({ error: `Could not read CSV: ${(e as Error).message}` });
    return finish(report);
  }
  report.totalRows = records.length;
  const headers = records.length ? Object.keys(records[0]) : [];
  const { map } = mapColumns(headers);
  report.columnsDetected = map;
  report.unmappedColumns = headers.filter((h) => !map[h] && !h.startsWith('__col'));
  if (!Object.values(map).includes('title')) {
    report.errors.push({ error: `No product name column found. Columns in the file: ${headers.join(', ')}` });
    return finish(report);
  }

  const get = (r: Record<string, string>, field: string) => {
    const vals = Object.entries(map)
      .filter(([, f]) => f === field)
      .map(([h]) => r[h])
      .filter((v) => v !== undefined && String(v).trim() !== '');
    return vals.length ? vals.map(String) : [];
  };

  // Group rows into products. Rows sharing a handle (or the same title when no handle) are variants.
  const drafts = new Map<string, Draft>();
  let last: Draft | null = null;
  records.forEach((r, i) => {
    const rowNo = i + 2; // 1-based + header
    const values = Object.values(r).filter((v) => String(v).trim());
    if (!values.length) {
      report.emptyRows++;
      return;
    }
    const title = get(r, 'title')[0]?.replace(/\s+/g, ' ').trim();
    const handle = get(r, 'handle')[0];
    // Shopify exports put variant rows under a handle with an empty title
    const key = handle ? `h:${slugify(handle)}` : title ? `t:${slugify(title)}` : last?.key;
    if (!key) {
      report.errors.push({ row: rowNo, error: 'Row has no product name or handle — skipped' });
      return;
    }
    let d = drafts.get(key);
    if (!d) {
      if (!title && !last) {
        report.errors.push({ row: rowNo, error: 'Variant row without a product — skipped' });
        return;
      }
      d = { key, rows: [], title: title || last!.title, handle, collections: [], images: [], variants: [], extra: {} };
      drafts.set(key, d);
    }
    last = d;
    d.rows.push(rowNo);
    d.description ??= get(r, 'description')[0];
    d.details ??= get(r, 'details')[0];
    d.priceRaw ??= get(r, 'price')[0];
    d.compareRaw ??= get(r, 'compareAtPrice')[0];
    d.category ??= get(r, 'category')[0];
    d.sku ??= get(r, 'sku')[0];
    if (get(r, 'featured')[0] !== undefined) d.featured = truthy(get(r, 'featured')[0]);
    if (get(r, 'newArrival')[0] !== undefined) d.newArrival = truthy(get(r, 'newArrival')[0]);
    d.status ??= get(r, 'status')[0];
    for (const c of get(r, 'collections').flatMap(splitList)) if (!d.collections.includes(c)) d.collections.push(c);
    for (const u of [...get(r, 'image'), ...get(r, 'images')].flatMap(extractUrls)) if (!d.images.includes(u)) d.images.push(u);
    for (const h of report.unmappedColumns) if (r[h] && !d.extra[h]) d.extra[h] = r[h];

    // variants for this row
    const sizes = get(r, 'size').flatMap(splitList);
    const colors = get(r, 'color').flatMap(splitList);
    const stockRaw = get(r, 'stock')[0];
    const rowSku = get(r, 'sku')[0];
    const rowPrice = get(r, 'price')[0];
    const sz = sizes.length ? sizes : [null];
    const cl = colors.length ? colors : [null];
    const combos = sz.length * cl.length;
    // Per-size stock like "S:3, M:5" is supported; a single number across several options is ambiguous.
    const perSize = stockRaw && /[a-z0-9]+\s*[:=]\s*\d+/i.test(stockRaw) ? Object.fromEntries(splitList(stockRaw).map((p) => p.split(/[:=]/).map((x) => x.trim()))) : null;
    for (const s of sz)
      for (const c of cl) {
        let st: string | undefined;
        if (perSize && s) st = perSize[s] ?? perSize[s.toUpperCase()];
        else if (!perSize && combos === 1) st = stockRaw;
        if (!d.variants.some((v) => v.size === s && v.color === c)) d.variants.push({ size: s, color: c, stockRaw: st, sku: combos === 1 ? rowSku : undefined, priceRaw: rowPrice });
      }
    if (stockRaw && combos > 1 && !perSize) report.productsWithIncompleteVariants.push({ product: d.title, reason: `Row ${rowNo}: one stock figure ("${stockRaw}") for ${combos} size/colour options — stock left unset` });
  });

  report.productsFound = drafts.size;
  log(`Found ${drafts.size} products in ${records.length} rows`);

  const categoryCache = new Map<string, string>();
  for (const d of drafts.values()) {
    try {
      const price = parsePriceToMinor(d.priceRaw);
      const compareAt = parsePriceToMinor(d.compareRaw);
      if (price === null) report.productsMissingPrices.push(d.priceRaw ? `${d.title} (unreadable price: "${d.priceRaw}")` : d.title);
      for (const v of d.variants) {
        if (v.stockRaw === undefined || v.stockRaw === '' || !/^\d+$/.test(String(v.stockRaw).trim())) {
          report.productsWithIncompleteVariants.push({ product: d.title, reason: `${[v.size, v.color].filter(Boolean).join(' / ') || 'default option'}: stock quantity missing${v.stockRaw ? ` or unreadable ("${v.stockRaw}")` : ''}` });
        }
      }
      if (opts.dryRun) {
        (d.images.length ? report.productsWithImages : report.productsMissingImages).push(d.title);
        report.productsImported++;
        report.variantsImported += d.variants.length;
        continue;
      }

      let categoryId: string | null = null;
      if (d.category) {
        const cslug = slugify(d.category);
        if (!categoryCache.has(cslug)) {
          const cat = await prisma.category.upsert({ where: { slug: cslug }, create: { name: d.category, slug: cslug }, update: {} });
          categoryCache.set(cslug, cat.id);
        }
        categoryId = categoryCache.get(cslug)!;
      }

      const importKey = `import:${d.key}`;
      const existing = await prisma.product.findUnique({ where: { importKey }, include: { images: true } });
      const data: Prisma.ProductUncheckedCreateInput = {
        title: d.title,
        slug: existing?.slug ?? (await uniqueSlug(prisma, d.handle || d.title)),
        description: d.description ?? existing?.description ?? null,
        details: d.details ?? existing?.details ?? null,
        price: d.priceRaw !== undefined ? price : (existing?.price ?? null),
        compareAtPrice: d.compareRaw !== undefined ? compareAt : (existing?.compareAtPrice ?? null),
        sku: d.sku ?? existing?.sku ?? null,
        categoryId: categoryId ?? existing?.categoryId ?? null,
        featured: d.featured ?? existing?.featured ?? false,
        newArrival: d.newArrival ?? existing?.newArrival ?? false,
        importKey,
        attributes: Object.keys(d.extra).length ? d.extra : undefined,
      };
      const product = existing ? await prisma.product.update({ where: { id: existing.id }, data }) : await prisma.product.create({ data: { ...data, status: 'DRAFT' } });
      existing ? report.productsUpdated++ : report.productsCreated++;

      // variants (matched by size+colour)
      let pos = 0;
      for (const v of d.variants) {
        const qty = v.stockRaw !== undefined && /^\d+$/.test(String(v.stockRaw).trim()) ? Number(v.stockRaw) : undefined;
        const variantPrice = v.priceRaw !== undefined ? parsePriceToMinor(v.priceRaw) : null;
        const found = await prisma.productVariant.findFirst({ where: { productId: product.id, size: v.size, color: v.color } });
        const skuTaken = v.sku ? await prisma.productVariant.findFirst({ where: { sku: v.sku, NOT: { id: found?.id ?? '' } } }) : null;
        const vdata = { size: v.size, color: v.color, position: pos++, sku: v.sku && !skuTaken ? v.sku : (found?.sku ?? null), price: variantPrice !== null && variantPrice !== price ? variantPrice : null };
        const variant = found ? await prisma.productVariant.update({ where: { id: found.id }, data: vdata }) : await prisma.productVariant.create({ data: { ...vdata, productId: product.id } });
        await prisma.inventory.upsert({
          where: { variantId: variant.id },
          create: { variantId: variant.id, quantity: qty ?? null },
          update: qty !== undefined ? { quantity: qty } : {},
        });
        report.variantsImported++;
      }
      if (d.variants.length === 0) {
        const any = await prisma.productVariant.findFirst({ where: { productId: product.id } });
        if (!any) await prisma.productVariant.create({ data: { productId: product.id, inventory: { create: { quantity: null } } } });
      }

      // collections
      for (const name of d.collections) {
        const cslug = slugify(name);
        const col = await prisma.collection.upsert({ where: { slug: cslug }, create: { title: name, slug: cslug }, update: {} });
        await prisma.collectionProduct.upsert({ where: { collectionId_productId: { collectionId: col.id, productId: product.id } }, create: { collectionId: col.id, productId: product.id }, update: {} });
      }

      // images
      let imageCount = existing?.images.length ?? 0;
      if (opts.downloadImages !== false) {
        const { storeImage } = await import('./images');
        let position = imageCount;
        for (const url of d.images) {
          if (existing?.images.some((im) => im.sourceUrl === url)) {
            report.imagesSkippedExisting++;
            continue;
          }
          try {
            const buf = await downloadImage(directImageUrl(url));
            const stored = await storeImage(buf, `products/${product.id}`);
            await prisma.productImage.create({ data: { productId: product.id, url: stored.url, srcset: stored.srcset, width: stored.width, height: stored.height, position: position++, alt: d.title, sourceUrl: url } });
            report.imagesImported++;
            imageCount++;
            log(`  image ok: ${d.title}`);
          } catch (e) {
            report.imageErrors.push({ product: d.title, url, error: (e as Error).message });
          }
        }
      }
      (imageCount > 0 ? report.productsWithImages : report.productsMissingImages).push(d.title);

      // publish only complete products
      const complete = product.price !== null && imageCount > 0;
      const wantActive = opts.publish && complete && !(d.status && /^(draft|false|no|0|hidden|archived)$/i.test(d.status));
      if (wantActive && product.status !== 'ACTIVE') {
        await prisma.product.update({ where: { id: product.id }, data: { status: 'ACTIVE', publishedAt: new Date() } });
      }
      ((wantActive || product.status === 'ACTIVE') ? report.publishedAsActive : report.importedAsDraft).push(d.title);
      report.productsImported++;
    } catch (e) {
      report.errors.push({ product: d.title, error: (e as Error).message });
    }
  }
  return finish(report);
}

function finish(r: ImportReport) {
  r.finishedAt = new Date().toISOString();
  return r;
}

async function uniqueSlug(prisma: PrismaClient, base: string) {
  const s = slugify(base);
  let candidate = s;
  for (let i = 2; await prisma.product.findUnique({ where: { slug: candidate }, select: { id: true } }); i++) candidate = `${s}-${i}`;
  return candidate;
}

async function downloadImage(url: string): Promise<Buffer> {
  const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(45_000), headers: { 'User-Agent': 'the87thclub-importer/1.0' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 403 || res.status === 401 ? ' (file not shared publicly)' : ''}`);
  const type = res.headers.get('content-type') || '';
  if (type.includes('text/html')) throw new Error('Link returned a web page, not an image (check Drive sharing permissions)');
  const len = Number(res.headers.get('content-length') || 0);
  if (len > 25 * 1024 * 1024) throw new Error('Image larger than 25 MB');
  return Buffer.from(await res.arrayBuffer());
}

export function reportToMarkdown(r: ImportReport) {
  const list = (a: string[]) => (a.length ? a.map((x) => `- ${x}`).join('\n') : '- none');
  return `# Product import report

- Source: ${r.source}
- Started: ${r.startedAt} · Finished: ${r.finishedAt}${r.dryRun ? ' · **DRY RUN (nothing written)**' : ''}

| Metric | Count |
|---|---|
| Total spreadsheet rows | ${r.totalRows} |
| Empty rows | ${r.emptyRows} |
| Products found | ${r.productsFound} |
| Products imported | ${r.productsImported} (created ${r.productsCreated}, updated ${r.productsUpdated}) |
| Variants imported | ${r.variantsImported} |
| Images imported | ${r.imagesImported} (already present: ${r.imagesSkippedExisting}) |
| Products with images | ${r.productsWithImages.length} |
| Products missing images | ${r.productsMissingImages.length} |
| Products with missing prices | ${r.productsMissingPrices.length} |
| Incomplete variant notes | ${r.productsWithIncompleteVariants.length} |
| Image download errors | ${r.imageErrors.length} |
| Import errors | ${r.errors.length} |

## Column mapping
${Object.entries(r.columnsDetected).map(([h, f]) => `- "${h}" → ${f}`).join('\n') || '- none'}

Unmapped columns (kept as product attributes): ${r.unmappedColumns.join(', ') || 'none'}

## Products missing images
${list(r.productsMissingImages)}

## Products with missing prices
${list(r.productsMissingPrices)}

## Incomplete variants
${r.productsWithIncompleteVariants.map((v) => `- ${v.product}: ${v.reason}`).join('\n') || '- none'}

## Image errors
${r.imageErrors.map((e) => `- ${e.product}: ${e.url} — ${e.error}`).join('\n') || '- none'}

## Errors
${r.errors.map((e) => `- ${e.row ? `Row ${e.row}: ` : ''}${e.product ? `${e.product}: ` : ''}${e.error}`).join('\n') || '- none'}

## Imported as draft (fix in the admin dashboard, then publish)
${list(r.importedAsDraft)}
`;
}
