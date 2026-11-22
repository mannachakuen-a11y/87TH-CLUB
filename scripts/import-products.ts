/**
 * Import products from a CSV file or a Google Sheet.
 *
 *   npm run import:products -- <file.csv | google-sheet-url> [--dry-run] [--publish] [--no-images]
 *
 * --dry-run    analyse and report only, write nothing
 * --publish    set complete products (price + at least one image) to ACTIVE; otherwise everything is imported as DRAFT
 * --no-images  skip image downloads
 *
 * A JSON + Markdown report is written to ./import-reports/.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { runImport, fetchSource, reportToMarkdown } from '../src/lib/importer';

async function main() {
  const args = process.argv.slice(2);
  const src = args.find((a) => !a.startsWith('--'));
  if (!src) {
    console.error('Usage: npm run import:products -- <file.csv | google-sheet-url> [--dry-run] [--publish] [--no-images]');
    process.exit(1);
  }
  const text = /^https?:\/\//.test(src) ? await fetchSource(src) : await fs.readFile(src, 'utf8');
  const prisma = new PrismaClient();
  const report = await runImport(prisma, text, src, {
    dryRun: args.includes('--dry-run'),
    publish: args.includes('--publish'),
    downloadImages: !args.includes('--no-images'),
    onLog: (m) => console.log(m),
  });
  if (!report.dryRun) await prisma.importRun.create({ data: { source: src, report: report as object } });
  await prisma.$disconnect();
  const dir = path.resolve('import-reports');
  await fs.mkdir(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  await fs.writeFile(path.join(dir, `import-${stamp}.json`), JSON.stringify(report, null, 2));
  await fs.writeFile(path.join(dir, `import-${stamp}.md`), reportToMarkdown(report));
  console.log(reportToMarkdown(report).split('## Column mapping')[0]);
  console.log(`Report written to import-reports/import-${stamp}.md`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
