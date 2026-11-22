# Import report: provided Google Sheet (not imported)

- **Source:** `https://docs.google.com/spreadsheets/d/1pFyUJ3Xp4INZeR-3Hp0yRnv5OoOIIW3s6LYuovXgsO4/edit#gid=62368969`
- **Retrieved:** 22 Nov 2026, via the sheet's public CSV endpoint (`gviz/tq?tqx=out:csv`). The `export?format=csv` and `.xlsx` endpoints return 401.
- **Document title:** "RepZone Spreadsheet". Tabs: `PHONE📱` (gid 62368969), `ARCHIVE style` (gid 2037966457), `computer🖥️` (gid 705634069).

## What the sheet contains

| Metric | Count |
|---|---|
| Total rows (incl. header) | 2,775 |
| Data rows | 2,774 |
| Rows with an item name | 2,710 |
| Rows with a `$` price | 2,665 |
| Item names containing a major third-party brand (Nike, Jordan, Dior, LV, Balenciaga, Chrome Hearts, BAPE, Supreme, Prada, Corteiz, Stüssy, Chanel, Rolex, Moncler, Off-White, Trapstar, Stone Island, Ralph Lauren, Arc'teryx, Adidas) | 861 |
| Rows mentioning THE 87TH CLUB | **0** |

Columns: `BEST FINDS PHOTO`, a category/name column, a "Sign Up Here $500 Coupons" price column, `LitbuyLINK`, `Weidian (original links)`, `BATCH`, a second category column, `QC 2`.

Example rows: "Air Jordan 4 [30+style] — $48 — BEST", "DIOR B30 [25+style] — $39", "Chrome Hearts mirror — $188", "Corteiz Simon Wheatley Windbreaker — $80", "Rolex Basketball — $23".

## Decision

**0 products imported.**

This is a third-party "rep finds" list, not an 87th Club catalogue. It sends buyers to a purchasing agent (Litbuy, with affiliate coupon sign-up) and to Weidian sellers. It grades items by replica "BATCH" and "QC". Prices and descriptions are for other companies' trademarked goods (several hundred rows name Nike, Dior, LV, Chrome Hearts, Corteiz and others).

Importing it would list counterfeit branded goods as 87th Club stock. The store was not built around this data, and no product, price or image from it is in the database.

## What is needed to import the real catalogue

Any sheet or CSV with your own products. The importer accepts flexible headers:

`Name, Description, Price, Original price, Category, Collection, Size, Colour, Stock, SKU, Image, Image 2, …`

- Run in **Admin → Import products** (start with "Dry run"), or `npm run import:products -- <csv-or-sheet-url> --dry-run`.
- Image links can be Google Drive links shared as "anyone with the link can view".
- Missing prices, stock or images are reported and left empty. Those products import as drafts so you can complete them in the dashboard.
