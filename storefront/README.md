# 87TH CLUB storefront prototype

An internal design prototype of a streetwear storefront for the fictional brand **87TH CLUB**. It reproduces the
observable layout, spacing, typography and shopping interactions of a minimal editorial reference storefront. The
branding, product catalogue and copy are original, and the photography is licensed (see `ASSET_MANIFEST.md`).

It is a self-contained Vite + React + TypeScript app. It is independent from the brand-OS app at the repository root.

```bash
cd storefront
npm install
npm run dev        # http://localhost:5180
npm run build && npm run preview   # http://localhost:4180
```

## Routes

| Route | Page |
|---|---|
| `/` | Homepage: full-height campaign feature blocks |
| `/collections/new-arrivals` | New Arrivals (40 products), the priority page |
| `/collections/:category` | tees, outerwear, beanies, headwear, knits, sweats, tops-shirts, bottoms, denim, sunglasses, accessories |
| `/collections/all`, `/collections/archive` | View All (56 products), Archive (non-new products) |
| `/products/:handle` (also `/collections/:c/products/:handle`) | Product detail page, one per product/colour |
| `/search?q=` | Search results |
| `/checkout` | Prototype checkout (no payment collected) |
| `/pages/support`, `/pages/newsletter`, `/pages/legal`, `/pages/chapters`, `/account` | Info pages |

## Reference measurements (recorded with Playwright at 1440×900 and 390×844)

**Global type:** Helvetica Neue, weight 500, uppercase, black on white. 10px/14px on desktop and 12px on mobile/tablet.
The prototype uses the same stack, which falls back to Arial or Liberation Sans where Helvetica isn't installed.

**Desktop (≥1100px)**
- Logo fixed at 20/20, about 120×85. Vertical nav fixed at x=34 starting at y=99, with 20px rows. A short dash
  separates the category links from Archive, Chapters, Support, Account, Newsletter, Legal and Currency. `© year`
  is fixed bottom-left.
- The top bar is transparent and fixed, with text baseline at y=20. Left (collection only): `VIEW ALL`, `FILTER` at
  x=200. The shipping banner with `HIDE` is centred in the remaining space. Right: `SEARCH`, `BAG`, 15px apart and
  20px from the edge.
- Content starts at x=180, y=54 with a ≈4vw right margin.
- Collection grid: 4 columns from 1200px (2 columns from 1100 to 1199px), 5px column gap, 30px row gap. Images are
  4:5. Title and price sit about 13px under the image. Hovering reveals quick-add sizes, 15px apart, under the price.
- Editorial callouts span 2×2 cells. They alternate right (rows 1–2), left (rows 6–7), right (rows 10–11) and so on,
  with the image inset 20px each side.
- Filter: a 450px panel at 10/44 over a 38% black scrim. 14px checkboxes in 3 columns, and two 45px buttons:
  `CLEAR (n)` (white) and `APPLY FILTERS` (black).
- Search: the top bar becomes an input at x=180, with `VIEW ALL RESULTS · CLEAR · CLOSE · BAG` on the right. Results
  replace the page grid as you type.
- Bag: a drawer from the right, 40% wide, over a 55% white scrim. `SHOPPING BAG` / `CLOSE` header and a 35px black
  button at the bottom.
- Product page: 648px gallery column at x=180 with stacked 4:5 images. A 325px sticky info column 50px to the right
  holds title, price, grey colour name, inline sizes, 45×56 colour thumbnails, a 35px `ADD TO BAG`, then
  `PRODUCT DETAILS` with dash bullets, `SIZE GUIDE`, `SHIPPING & RETURNS` and the shipping note.
- Home: each campaign image is 85vw wide and about 100vh tall, centred, with the nav floating over its left edge.

**Tablet (768–1099px):** the grid is full-bleed with 2 columns (5px / 40px gaps). The header has the logo top-left
and `FILTER · SEARCH · BAG · MENU` on the right.

**Mobile (<768px):** 20px page margins, 2-column grid, and full-width callouts inset 20px. The menu is a full-screen
list, and `MENU` becomes `CLOSE`; Archive, Support and Currency expand inline. The product page has a full-bleed
swipeable gallery with the info below. The bag drawer is full width.

## Data and images

- `scripts/catalog.py` is the single source of truth for products (families, colourways, prices, sizes, copy) and for
  the photo and crop used for each image. It writes `src/data/catalog.json` and `scripts/images.json`.
- `scripts/process_images.py <download-dir>` crops each original Unsplash photo to the grid's 4:5 ratio (2:3 for
  callouts) and writes `public/images/{products,editorial,categories}`, `public/images/manifest.json` and
  `ASSET_MANIFEST.md`.
- Each product has 2 images. Image 2 is either a second photo of the same garment or a detail crop of image 1. It
  appears on hover on desktop and by swiping on mobile.

## Known limitations

- Product photos come from Unsplash and mix studio and lifestyle shots. Backgrounds are therefore less uniform than
  the reference's studio packshots.
- The Unsplash and Pexels search pages block automated browsing. Photos were gathered from the Unsplash image CDN
  and each one was checked by eye, but there is no per-photo photographer credit. The Unsplash License doesn't
  require one.
- Checkout, account sign-in and newsletter are prototype interactions: nothing is charged, sent or stored server-side.
