/**
 * End-to-end test of the full customer + admin journey.
 *
 *   npm run build && npm run test:e2e
 *
 * Uses a SEPARATE throwaway database (club87_test) and clearly-labelled TEST FIXTURE products,
 * so nothing here ever touches the real store data. Paystack is replaced by a local mock API that
 * implements the same initialize / verify / webhook contract (PAYSTACK_API_BASE override).
 */
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import sharp from 'sharp';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { chromium, devices } = require('playwright');

const BASE_DB = process.env.E2E_DATABASE_BASE || 'postgresql://club:club@localhost:5432';
const DB = `${BASE_DB}/club87_test`;
const PORT = 3100;
const MOCK = 4010;
const APP = `http://localhost:${PORT}`;
const SECRET = 'sk_test_e2e_mock_only';
const results: { name: string; ok: boolean; info?: string }[] = [];

function check(name: string, ok: boolean, info?: string) {
  results.push({ name, ok, info });
  console.log(`${ok ? '  ✓' : '  ✗'} ${name}${info ? ` — ${info}` : ''}`);
}

// ------------------------------------------------------------- mock Paystack + image host
const tx = new Map<string, { amount: number; currency: string; callback: string; status: string }>();
async function fixtureImage(label: string, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1500"><rect width="100%" height="100%" fill="${color}"/><text x="50%" y="50%" font-family="sans-serif" font-size="90" fill="#fff" text-anchor="middle">${label}</text></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
function startMock(images: Record<string, Buffer>) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${MOCK}`);
    const body = await new Promise<string>((r) => {
      let d = '';
      req.on('data', (c) => (d += c));
      req.on('end', () => r(d));
    });
    const send = (code: number, data: unknown, type = 'application/json') => {
      res.writeHead(code, { 'Content-Type': type });
      res.end(typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data));
    };
    if (url.pathname.startsWith('/img/')) {
      const img = images[url.pathname.slice(5)];
      return img ? send(200, img, 'image/png') : send(404, 'nope', 'text/plain');
    }
    if (req.headers.authorization !== `Bearer ${SECRET}` && url.pathname.startsWith('/transaction')) return send(401, { status: false, message: 'Invalid key' });
    if (req.method === 'POST' && url.pathname === '/transaction/initialize') {
      const b = JSON.parse(body);
      if (tx.has(b.reference)) return send(400, { status: false, message: 'Duplicate Transaction Reference' });
      tx.set(b.reference, { amount: b.amount, currency: b.currency, callback: b.callback_url, status: 'abandoned' });
      return send(200, { status: true, data: { authorization_url: `http://localhost:${MOCK}/pay/${b.reference}`, access_code: 'x', reference: b.reference } });
    }
    if (url.pathname.startsWith('/transaction/verify/')) {
      const ref = decodeURIComponent(url.pathname.split('/').pop()!);
      const t = tx.get(ref);
      if (!t) return send(404, { status: false, message: 'Transaction reference not found' });
      return send(200, { status: true, data: { status: t.status, reference: ref, amount: t.amount, currency: t.currency, channel: 'mobile_money', paid_at: t.status === 'success' ? new Date().toISOString() : null } });
    }
    if (url.pathname.startsWith('/pay/')) {
      const ref = decodeURIComponent(url.pathname.split('/')[2]);
      const t = tx.get(ref);
      if (!t) return send(404, 'unknown', 'text/plain');
      if (url.searchParams.get('do') === 'pay') t.status = 'success';
      if (url.searchParams.get('do')) {
        res.writeHead(302, { Location: `${t.callback}` });
        return res.end();
      }
      return send(200, `<html><body><h1>MOCK PAYSTACK ${t.amount} ${t.currency}</h1><a id="pay" href="?do=pay">Pay</a> <a id="cancel" href="?do=cancel">Cancel</a></body></html>`, 'text/html');
    }
    send(404, { status: false });
  });
  return new Promise<http.Server>((r) => server.listen(MOCK, () => r(server)));
}

// ------------------------------------------------------------- cookie-aware fetch client
function client() {
  const jar = new Map<string, string>();
  return async (p: string, init: RequestInit = {}) => {
    const res = await fetch(APP + p, { ...init, redirect: 'manual', headers: { 'Content-Type': 'application/json', Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...(init.headers || {}) } });
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
    return res;
  };
}

async function waitFor(url: string, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try {
      const r = await fetch(url);
      if (r.status < 500) return;
    } catch {
      /* not up */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  console.log('Preparing isolated test database club87_test …');
  execSync(`psql "${BASE_DB}/postgres" -c "DROP DATABASE IF EXISTS club87_test WITH (FORCE)" -c "CREATE DATABASE club87_test"`, { stdio: 'ignore' });
  execSync('npx prisma migrate deploy', { env: { ...process.env, DATABASE_URL: DB }, stdio: 'ignore' });
  const prisma = new PrismaClient({ datasources: { db: { url: DB } } });
  const uploadDir = await fs.mkdtemp(path.join(os.tmpdir(), 'club87-e2e-'));
  process.env.UPLOAD_DIR = uploadDir;
  process.env.STORE_CURRENCY = 'KES';

  const images = { 'tee-front.png': await fixtureImage('TEST FIXTURE · FRONT', '#333'), 'tee-back.png': await fixtureImage('TEST FIXTURE · BACK', '#555') };
  const mock = await startMock(images);

  // ---------- importer
  console.log('\nImporter');
  const csv = [
    'Product Name,Description,Price,Original Price,Category,Collection,Size,Colour,Stock,SKU,Image,Image 2,Notes',
    `TEST FIXTURE TEE,"Fixture product used only by the automated test.","KES 3,500",,T-Shirts,Test Capsule,"S, M, L",Black,"S:2, M:0, L:5",TF-TEE,http://localhost:${MOCK}/img/tee-front.png,http://localhost:${MOCK}/img/tee-back.png,heavyweight`,
    `TEST FIXTURE HOODIE,,,,Hoodies,,"M, L",Grey,7,TF-HOOD,,,`,
    `,,,,,,,,,,,,`,
  ].join('\n');
  const { runImport } = await import('../src/lib/importer');
  const r1 = await runImport(prisma, csv, 'e2e.csv', { publish: true });
  check('import: rows counted (incl. empty row)', r1.totalRows === 3 && r1.emptyRows === 1, `${r1.totalRows} rows`);
  check('import: 2 products created', r1.productsCreated === 2);
  check('import: 2 images downloaded + optimised', r1.imagesImported === 2);
  check('import: price parsed exactly (KES 3,500 → 350000 minor)', (await prisma.product.findFirst({ where: { title: 'TEST FIXTURE TEE' } }))?.price === 350000);
  check('import: missing price reported, not invented', r1.productsMissingPrices.includes('TEST FIXTURE HOODIE') && (await prisma.product.findFirst({ where: { title: 'TEST FIXTURE HOODIE' } }))?.price === null);
  check('import: ambiguous stock left unset + reported', r1.productsWithIncompleteVariants.some((v) => v.product === 'TEST FIXTURE HOODIE'));
  check('import: incomplete product kept as DRAFT', r1.importedAsDraft.includes('TEST FIXTURE HOODIE') && r1.publishedAsActive.includes('TEST FIXTURE TEE'));
  check('import: unmapped column preserved as attribute', JSON.stringify((await prisma.product.findFirst({ where: { title: 'TEST FIXTURE TEE' } }))?.attributes).includes('heavyweight'));
  const r2 = await runImport(prisma, csv, 'e2e.csv', { publish: true });
  check('import: re-run is idempotent (no duplicates)', (await prisma.product.count()) === 2 && (await prisma.productImage.count()) === 2 && r2.productsUpdated === 2 && r2.imagesSkippedExisting === 2);

  const tee = await prisma.product.findFirstOrThrow({ where: { title: 'TEST FIXTURE TEE' }, include: { variants: true } });
  const vS = tee.variants.find((v) => v.size === 'S')!;
  const vM = tee.variants.find((v) => v.size === 'M')!;
  const vL = tee.variants.find((v) => v.size === 'L')!;
  await prisma.product.update({ where: { id: tee.id }, data: { newArrival: true } });
  await prisma.shippingMethod.create({ data: { name: 'TEST Courier', description: 'fixture', price: 30000 } });
  await prisma.adminUser.create({ data: { email: 'e2e@test.local', passwordHash: await bcrypt.hash('e2e-password-123', 10), role: 'OWNER' } });

  // ---------- server
  console.log('\nStarting app on test database …');
  const app = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    env: { ...process.env, DATABASE_URL: DB, PAYSTACK_SECRET_KEY: SECRET, PAYSTACK_API_BASE: `http://localhost:${MOCK}`, SITE_URL: APP, UPLOAD_DIR: uploadDir, AUTH_SECRET: 'e2e-secret-e2e-secret-e2e-secret-e2e-secret', RESERVATION_MINUTES: '30', SMTP_HOST: '' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let appLog = '';
  app.stdout.on('data', (d) => (appLog += d));
  app.stderr.on('data', (d) => (appLog += d));
  const browser = await chromium.launch();
  try {
    await waitFor(APP + '/robots.txt');

    // ---------- API-level guarantees
    console.log('\nCart & stock rules (API)');
    const c1 = client();
    let res = await c1('/api/cart', { method: 'POST', body: JSON.stringify({ variantId: vM.id, quantity: 1 }) });
    check('sold-out size cannot be added', res.status === 409, (await res.json()).error);
    const hoodie = await prisma.product.findFirstOrThrow({ where: { title: 'TEST FIXTURE HOODIE' }, include: { variants: true } });
    res = await c1('/api/cart', { method: 'POST', body: JSON.stringify({ variantId: hoodie.variants[0].id, quantity: 1 }) });
    check('draft / unpriced product cannot be added', res.status === 409);
    res = await c1('/api/cart', { method: 'POST', body: JSON.stringify({ variantId: vL.id, quantity: 6 }) });
    check('cannot add more than stock', res.status === 409);
    res = await c1('/api/cart', { method: 'POST', body: JSON.stringify({ variantId: vL.id, quantity: 'x' }) });
    check('invalid input rejected by validation', res.status === 422);
    res = await fetch(APP + '/api/cart', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://evil.example' }, body: JSON.stringify({ variantId: vL.id, quantity: 1 }) });
    check('cross-origin cart write rejected', res.status === 403);

    // concurrency: two customers race for the last 2 units of S
    const a = client();
    const b = client();
    await a('/api/cart', { method: 'POST', body: JSON.stringify({ variantId: vS.id, quantity: 2 }) });
    await b('/api/cart', { method: 'POST', body: JSON.stringify({ variantId: vS.id, quantity: 2 }) });
    const sm = (await prisma.shippingMethod.findFirstOrThrow()).id;
    const form = (email: string) => JSON.stringify({ email, phone: '+254700000000', firstName: 'Test', lastName: 'Fixture', line1: '1 Test Street', city: 'Nairobi', country: 'Kenya', shippingMethodId: sm, paymentProvider: 'paystack' });
    const [ra, rb] = await Promise.all([a('/api/checkout', { method: 'POST', body: form('race-a@test.local') }), b('/api/checkout', { method: 'POST', body: form('race-b@test.local') })]);
    const codes = [ra.status, rb.status].sort();
    check('no overselling under concurrent checkout', codes[0] === 201 && codes[1] === 409, `statuses ${codes.join(',')}`);
    check('stock reserved for the winner', (await prisma.inventory.findUniqueOrThrow({ where: { variantId: vS.id } })).quantity === 0);
    // the winner abandons → expire the reservation → stock returns
    await prisma.order.updateMany({ where: { email: { in: ['race-a@test.local', 'race-b@test.local'] } }, data: { reservedUntil: new Date(Date.now() - 60_000) } });
    res = await b('/api/checkout/retry', { method: 'POST', body: JSON.stringify({ reference: 'nope-nope' }) }); // triggers releaseExpiredReservations
    const sAfter = (await prisma.inventory.findUniqueOrThrow({ where: { variantId: vS.id } })).quantity;
    check('unpaid order releases stock after reservation window', sAfter === 2, `S stock ${sAfter}`);
    check('expired unpaid order cancelled (verified as not paid with provider first)', (await prisma.order.findFirstOrThrow({ where: { email: { in: ['race-a@test.local', 'race-b@test.local'] } } })).status === 'CANCELLED');

    // ---------- browser: desktop journey
    console.log('\nCustomer journey (desktop browser)');
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    const errors: string[] = [];
    page.on('pageerror', (e: Error) => errors.push(e.message));
    await page.goto(APP + '/');
    check('home shows imported product in New arrivals', await page.getByRole('heading', { name: 'New arrivals' }).isVisible() && (await page.getByText('TEST FIXTURE TEE').count()) > 0);
    check('home shows the mascot in the header', (await page.locator('header img[alt="THE 87TH CLUB"]').count()) === 1);
    await page.goto(APP + '/shop?size=L');
    check('shop size filter', (await page.getByText('TEST FIXTURE TEE').count()) > 0);
    await page.goto(APP + '/shop?q=hoodie');
    check('draft products hidden from search', await page.getByText('No matches.').isVisible());
    await page.goto(APP + '/shop');
    await page.getByRole('button', { name: 'Search products' }).click();
    await page.locator('#site-search').fill('fixture');
    const hit = await page.waitForSelector('[role=dialog][aria-label=Search] a[href^="/products/"]', { timeout: 10_000 }).catch(() => null);
    check('search overlay returns live results', !!hit);
    await page.keyboard.press('Escape');

    await page.goto(APP + `/products/${tee.slug}`);
    check('PDP renders title, price and gallery', (await page.getByRole('heading', { name: 'TEST FIXTURE TEE' }).isVisible()) && (await page.getByText('KES 3,500').first().isVisible()) && (await page.locator('main img').count()) >= 2);
    check('sold-out size is disabled', await page.getByRole('button', { name: 'M — sold out' }).isDisabled());
    check('add-to-bag requires a size', (await page.getByRole('button', { name: 'Select a size' }).count()) === 1);
    await page.getByRole('button', { name: 'L', exact: true }).click();
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await page.getByRole('button', { name: 'Add to bag' }).click();
    await page.waitForSelector('[aria-label="Shopping bag"] >> text=TEST FIXTURE TEE');
    check('bag drawer opens with the item', await page.getByRole('dialog', { name: 'Shopping bag' }).isVisible());
    check('header bag count updated', (await page.getByRole('button', { name: /Open bag, 2 items/ }).count()) === 1);
    await page.reload();
    await page.waitForSelector('button[aria-label="Open bag, 2 items"]');
    check('bag persists across refresh', true);
    await page.goto(APP + '/bag');
    await page.getByRole('button', { name: 'Increase quantity' }).click();
    await page.waitForSelector('button[aria-label="Open bag, 3 items"]');
    check('bag quantity update', true);
    await page.goto(APP + '/checkout');
    await page.getByRole('button', { name: /^Pay / }).waitFor();
    await page.getByRole('button', { name: /^Pay / }).click();
    await page.waitForSelector('text=Please check the highlighted fields');
    check('checkout validates required fields', (await page.locator('[aria-invalid=true]').count()) >= 5);
    const fill = async (id: string, v: string) => page.locator(`#f-${id}`).fill(v);
    await fill('email', 'buyer@test.local');
    await fill('phone', '+254 700 000 001');
    await fill('firstName', 'Wanjiru');
    await fill('lastName', 'Test');
    await fill('line1', '87 Fixture Road');
    await fill('city', 'Nairobi');
    await fill('country', 'Kenya');
    check('order summary total = 3 × 3,500 + 300 delivery', await page.getByText('KES 10,800').first().isVisible());
    await page.getByRole('button', { name: 'Pay KES 10,800' }).click();
    await page.waitForURL(/localhost:4010\/pay\//);
    check('redirected to payment provider', page.url().includes('/pay/87C-'));
    await page.click('#pay');
    await page.waitForURL(/\/order\/87C-/);
    check('verified payment shows confirmation', await page.getByText('Welcome to the Club.').isVisible());
    const order = await prisma.order.findFirstOrThrow({ where: { email: 'buyer@test.local' }, include: { payments: true, items: true } });
    check('order PAID, payment SUCCESS (verified server-side)', order.status === 'PAID' && order.paymentStatus === 'SUCCESS' && order.payments[0].status === 'SUCCESS' && order.total === 1080000);
    check('stock decremented (L 5 → 2)', (await prisma.inventory.findUniqueOrThrow({ where: { variantId: vL.id } })).quantity === 2);
    check('customer + address recorded', !!(await prisma.customer.findUnique({ where: { email: 'buyer@test.local' }, include: { addresses: true } }))?.addresses.length);
    check('bag cleared after order', (await page.getByRole('button', { name: /Open bag, 0 items/ }).count()) === 1);

    // webhook
    const payload = JSON.stringify({ event: 'charge.success', data: { reference: order.reference } });
    res = await fetch(APP + '/api/webhooks/paystack', { method: 'POST', body: payload, headers: { 'x-paystack-signature': 'bad' } });
    check('webhook rejects bad signature', res.status === 401);
    res = await fetch(APP + '/api/webhooks/paystack', { method: 'POST', body: payload, headers: { 'x-paystack-signature': crypto.createHmac('sha512', SECRET).update(payload).digest('hex') } });
    check('webhook accepts valid signature (idempotent)', res.status === 200 && (await prisma.inventory.findUniqueOrThrow({ where: { variantId: vL.id } })).quantity === 2);

    // failed / abandoned payment
    await page.goto(APP + `/products/${tee.slug}`);
    await page.getByRole('button', { name: 'S', exact: true }).click();
    await page.getByRole('button', { name: 'Add to bag' }).click();
    await page.waitForSelector('button[aria-label="Open bag, 1 items"]');
    await page.goto(APP + '/checkout');
    await page.locator('#f-email').fill('abandon@test.local');
    await page.locator('#f-phone').fill('+254700000002');
    await page.locator('#f-firstName').fill('A');
    await page.locator('#f-lastName').fill('B');
    await page.locator('#f-line1').fill('1 Road');
    await page.locator('#f-city').fill('Nairobi');
    await page.locator('#f-country').fill('Kenya');
    await page.getByRole('button', { name: /^Pay / }).click();
    await page.waitForURL(/localhost:4010\/pay\//);
    await page.click('#cancel');
    await page.waitForURL(/\/checkout\/verify/);
    check('cancelled payment is NOT treated as paid', await page.getByText('Payment not completed').isVisible());
    const abandoned = await prisma.order.findFirstOrThrow({ where: { email: 'abandon@test.local' } });
    check('abandoned order stays unpaid', abandoned.paymentStatus === 'PENDING' && abandoned.status === 'PENDING_PAYMENT');
    await page.getByRole('link', { name: 'Try payment again' }).click();
    await page.getByRole('button', { name: 'Complete payment' }).click();
    await page.waitForURL(/localhost:4010\/pay\//);
    await page.click('#pay');
    await page.waitForURL(/\/order\/87C-/);
    check('retry payment succeeds with new reference', (await prisma.order.findUniqueOrThrow({ where: { id: abandoned.id }, include: { payments: true } })).payments.length === 2);

    // newsletter + contact
    await page.goto(APP + '/contact');
    await page.locator('#c-name').fill('Test Person');
    await page.locator('#c-email').fill('contact@test.local');
    await page.locator('#c-message').fill('Hello from the automated test suite.');
    await page.getByRole('button', { name: 'Send message' }).click();
    await page.waitForSelector('text=Thank you.');
    check('contact form stored', (await prisma.contactMessage.count()) === 1);
    await page.locator('#nl-footer').fill('news@test.local');
    await page.locator('#nl-footer').press('Enter');
    await page.waitForSelector('text=You’re in the Club. Welcome.');
    check('newsletter signup stored', (await prisma.newsletterSubscriber.count()) === 1);
    check('no client-side JS errors', errors.length === 0, errors.join(' | '));
    await ctx.close();

    // ---------- admin
    console.log('\nAdmin');
    res = await fetch(APP + '/admin', { redirect: 'manual' });
    check('admin requires login (redirect)', res.status === 307 && (res.headers.get('location') || '').includes('/admin/login'));
    res = await fetch(APP + '/api/admin/subscribers');
    check('admin API requires login (401)', res.status === 401);
    const actx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const ap = await actx.newPage();
    await ap.goto(APP + '/admin/login');
    await ap.fill('#email', 'e2e@test.local');
    await ap.fill('#password', 'wrong-password');
    await ap.click('button[type=submit]');
    await ap.waitForSelector('text=Email or password is incorrect.');
    check('wrong password rejected', true);
    await ap.fill('#password', 'e2e-password-123');
    await ap.click('button[type=submit]');
    await ap.waitForURL(APP + '/admin');
    check('overview: total sales from paid orders', await ap.getByText('KES 14,600').isVisible(), 'expected 10,800 + (3,500 + 300 delivery)');
    await ap.goto(APP + `/admin/orders/${order.id}`);
    await ap.fill('#carrier', 'TEST Courier');
    await ap.fill('#trackingNumber', 'TRACK-E2E-1');
    await ap.getByRole('button', { name: 'Save tracking' }).click();
    await ap.waitForSelector('text=Tracking saved.');
    const shipped = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    check('tracking saved + order marked shipped', shipped.status === 'SHIPPED' && shipped.trackingNumber === 'TRACK-E2E-1');
    await ap.goto(APP + `/admin/products/${tee.id}`);
    await ap.getByLabel('quantity row 2').fill('4');
    await ap.getByRole('button', { name: 'Save product' }).click();
    await ap.waitForSelector('text=Product saved.');
    check('admin stock update', (await prisma.inventory.findUniqueOrThrow({ where: { variantId: vM.id } })).quantity === 4);
    check('admin save keeps variant ids (no duplicates)', (await prisma.productVariant.count({ where: { productId: tee.id } })) === 3);
    await ap.getByRole('button', { name: 'Save product' }).click();
    await ap.waitForSelector('text=Product saved.');
    check('second save still no duplicate variants', (await prisma.productVariant.count({ where: { productId: tee.id } })) === 3 && (await prisma.inventory.findUniqueOrThrow({ where: { variantId: vM.id } })).quantity === 4);
    await ap.goto(APP + '/admin/products/new');
    await ap.fill('#title', 'TEST FIXTURE CAP');
    await ap.getByLabel('quantity row 1').fill('3');
    await ap.selectOption('#status', 'ACTIVE');
    await ap.getByRole('button', { name: 'Save product' }).click();
    await ap.waitForSelector('text=Set a price before publishing.');
    check('cannot publish without a price', true);
    await ap.fill('#price', '1200');
    await ap.getByRole('button', { name: 'Save product' }).click();
    await ap.waitForURL(/\/admin\/products\/.+\?created=1/);
    await ap.setInputFiles('input[name=images]', { name: 'cap.png', mimeType: 'image/png', buffer: images['tee-front.png'] });
    await ap.getByRole('button', { name: 'Upload images' }).click();
    await ap.waitForSelector('text=1 image uploaded.');
    const cap = await prisma.product.findFirstOrThrow({ where: { title: 'TEST FIXTURE CAP' }, include: { images: true } });
    check('admin create product + image upload (responsive renditions)', cap.status === 'ACTIVE' && cap.images.length === 1 && Object.keys(cap.images[0].srcset as object).length >= 2);
    res = await fetch(APP + cap.images[0].url);
    check('uploaded image served with long cache', res.status === 200 && (res.headers.get('cache-control') || '').includes('immutable'));
    await ap.goto(APP + '/admin/collections/new');
    await ap.fill('#title', 'TEST DROP');
    await ap.check('input[name=isDrop]');
    await ap.fill('#launchAt', '2099-01-01T19:00');
    await ap.check(`input[name=products][value="${cap.id}"]`);
    await ap.getByRole('button', { name: 'Save collection' }).click();
    await ap.waitForURL(/\/admin\/collections\/.+\?created=1/);
    const home = await (await fetch(APP + '/')).text();
    check('scheduled drop: homepage countdown + product hidden until launch', home.includes('TEST DROP') && home.includes('Sign up for early access') && !(await (await fetch(APP + '/shop')).text()).includes('TEST FIXTURE CAP'));
    res = await fetch(APP + `/products/${cap.slug}`);
    check('scheduled drop product page not reachable early', res.status === 404);
    for (const p of ['/admin/orders', '/admin/products', '/admin/customers', '/admin/collections', '/admin/categories', '/admin/discounts', '/admin/shipping', '/admin/subscribers', '/admin/messages', '/admin/import', '/admin/settings']) {
      const r = await ap.goto(APP + p);
      if (r?.status() !== 200) check(`admin page ${p}`, false, String(r?.status()));
    }
    check('all admin pages load', true);
    await actx.close();

    // ---------- mobile
    console.log('\nMobile layout');
    const mctx = await browser.newContext({ ...devices['iPhone 13'] });
    const mp = await mctx.newPage();
    let overflow: string[] = [];
    for (const p of ['/', '/shop', `/products/${tee.slug}`, '/collections', '/about', '/contact', '/bag', '/checkout', `/order/${order.reference}`]) {
      await mp.goto(APP + p);
      const ov = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (ov > 0) overflow.push(`${p} (+${ov}px)`);
    }
    check('no horizontal overflow on mobile', overflow.length === 0, overflow.join(', '));
    await mp.goto(APP + '/');
    await mp.getByRole('button', { name: 'Menu' }).click();
    check('mobile menu opens', await mp.locator('#mobile-menu').waitFor({ state: 'visible', timeout: 3000 }).then(() => true, () => false));
    await mp.goto(APP + `/products/${tee.slug}`);
    await mp.getByRole('button', { name: 'L', exact: true }).click();
    await mp.getByRole('button', { name: 'Add to bag' }).click();
    await mp.waitForSelector('[aria-label="Shopping bag"] >> text=TEST FIXTURE TEE');
    const box = await mp.getByRole('dialog', { name: 'Shopping bag' }).boundingBox();
    check('mobile bag drawer full width', !!box && box.width >= 389);
    const small = await mp.evaluate(() => [...document.querySelectorAll('main button, main a.btn-red, main a.btn-ink')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.height < 32; }).length);
    check('primary touch targets ≥ 32px tall', small === 0, `${small} small`);
    await mctx.close();
  } finally {
    await browser.close();
    app.kill();
    mock.close();
    await prisma.$disconnect();
    await fs.rm(uploadDir, { recursive: true, force: true });
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.log('FAILED:\n' + failed.map((f) => ` - ${f.name}${f.info ? ` (${f.info})` : ''}`).join('\n'));
    if (/error/i.test(appLog)) console.log('\nServer log (errors):\n' + appLog.split('\n').filter((l) => /error/i.test(l)).slice(0, 30).join('\n'));
    process.exit(1);
  }
  process.exit(0); // mock server keep-alive sockets would otherwise hold the process open
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
