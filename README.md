# THE 87TH CLUB — Store

Full-stack streetwear store for THE 87TH CLUB: storefront, cart, Paystack checkout (cards + M-Pesa),
order management, inventory, a protected admin dashboard, and a repeatable product importer.

**Stack:** Next.js 15 (App Router, TypeScript) · Tailwind CSS · PostgreSQL · Prisma · Paystack · SMTP email (Nodemailer) · Sharp image pipeline · local disk or S3-compatible image storage.

> The earlier "Brand Advancement OS" app that used to live in this repository is preserved, unchanged, in [`brand-os/`](brand-os/).

---

## Brand system (from the Canva Brand Kit and Brand Identity Book)

| Token | Value | Source |
|---|---|---|
| Signal Red | `#E31B23` (Pantone 186 C), accent only | Brand Kit Vol. 01 + Identity Book |
| Deep Black | `#0A0A0A`, foundation | Brand Kit |
| Off White | `#F5F5F2`, text on black | Brand Kit |
| Club Sand | `#E8C68E`, panels | Brand Kit |
| Mascot | Afro-portrait icon mark, original Canva artwork (`public/brand/`) | Canva asset "Red and Black Bold Streetwear Logo – 1" |

The Identity Book also mentions a `#FF3231` "signature red" in one paragraph. The newer Brand Kit and the book's own colour page both specify **#E31B23**, so that value is used.

**Type:** Helvetica Neue Condensed is the primary face. It is used wherever the visitor's device has it (macOS and iOS ship Helvetica Neue Condensed Bold and Black). Helvetica Neue is a licensed font and isn't bundled here. To serve it to every device, put your licensed `.woff2` files in `public/fonts/` and un-comment the `url()` lines in `src/app/globals.css`. Until then, other devices fall back to Arial Narrow and then **Oswald** (open source, self-hosted): a close condensed substitute, *not* Helvetica Neue. GFS Didot is used for short editorial lines ("Life is art."), as the brand book specifies.

Copy on the homepage and The Club page comes verbatim from the Identity Book (philosophy, values, personality, Culture in Motion, taglines).

---

## Run locally

Requirements: Node 20+, PostgreSQL 14+.

```bash
npm install
```

```bash
cp .env.example .env    # then set DATABASE_URL and AUTH_SECRET at minimum
```

```bash
npx prisma migrate deploy
```

```bash
npm run admin:create -- you@example.com "a-long-password" "Your Name"
```

```bash
npm run dev             # http://localhost:3000
```

Production:

```bash
npm run build
```

```bash
npm start
```

## Admin dashboard

Go to **`/admin`** and sign in with the account created by `npm run admin:create`. There is no public sign-up.
Admin pages and `/api/admin/*` are protected by middleware *and* by a database-checked session in every page and server action.

Before you can take orders:
1. **Delivery options**: add at least one (Admin → Delivery options). Checkout stays disabled until one exists.
2. **Paystack**: set `PAYSTACK_SECRET_KEY`, and set the webhook URL `https://<domain>/api/webhooks/paystack` in Paystack.
3. **Products**: import a spreadsheet (Admin → Import products, or the CLI below) or add them by hand, add images, then publish.
4. **Settings**: support email, socials, shipping/returns text, FAQ, and an optional campaign hero photo.

The Overview page shows a setup checklist until all of these are done.

## Importing products

```bash
npm run import:products -- ./catalogue.csv --dry-run
```

```bash
npm run import:products -- "https://docs.google.com/spreadsheets/d/<id>/edit#gid=<gid>" --publish
```

- Header names are matched flexibly (Name / Price / Original price / Category / Collection / Size / Colour / Stock / SKU / Image / Image 2 / Description …).
- Prices are parsed exactly as written. Missing or ambiguous prices, sizes, stock or images stay **missing**; they are never invented.
- Google Drive image links are downloaded (the files must be shared as "anyone with the link"), converted to optimised WebP renditions, and attached to their product.
- Re-running an import updates the same products instead of duplicating them, and existing images are not downloaded twice.
- Products without a price or image are imported as **drafts**. A Markdown and JSON report is written to `import-reports/` and kept in Admin → Import products.

## Payments

Paystack (Kenya: cards, M-Pesa, Airtel Money, bank; Nigeria, Ghana and South Africa are also supported) through Paystack's hosted page, so card details never touch this server.

- When the order is created, stock is **reserved** (an atomic conditional decrement, so nothing is oversold) and held for `RESERVATION_MINUTES`.
- An order is marked paid **only** after server-side verification (`GET /transaction/verify/:ref`). Amount and currency must match.
- The webhook (`charge.success`) checks the HMAC-SHA512 signature and then re-verifies with the API. Processing is idempotent.
- Unpaid orders are checked with Paystack once more, then cancelled and their stock released.
- Customers can retry a failed or abandoned payment from their order page.

## Tests

```bash
npm run build && npm run test:e2e
```

Runs the whole customer and admin journey in a real browser against a **separate throwaway database** (`club87_test`), using labelled TEST FIXTURE products and a local mock of the Paystack API. It covers: import, filters, search, PDP, size/stock rules, the bag, checkout validation, payment success, failure and retry, webhook signature, concurrent-checkout oversell protection, reservation expiry, admin auth, tracking, product editing, image upload, scheduled drops, and mobile layout.

## Project layout

```
prisma/schema.prisma          database schema (+ migrations)
src/app/(store)/              storefront pages
src/app/admin/                admin dashboard + server actions
src/app/api/                  cart, checkout, search, newsletter, contact, Paystack webhook
src/lib/                      catalog, cart, orders/payments, importer, images, storage, auth
scripts/                      import, create-admin, e2e test
public/brand/                 mascot + OG image (exported from Canva)
brand-os/                     previous app, preserved
```
