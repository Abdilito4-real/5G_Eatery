# 5G Eatery QR Eatery MVP

This workspace contains a minimal QR-based eatery website using static frontend and Supabase backend.

## Structure

- `public/` — static files served by hosting
  - `css/` — styles
  - `js/` — JavaScript modules
  - `menu.html` — customer-facing menu page
  - `admin.html` — admin dashboard
  - `offline.html` — PWA offline fallback
  - `manifest.json` — PWA manifest
  - `service-worker.js` — PWA service worker

- `schema.sql` — SQL definitions for tables and RLS policies.

## Notes

Follow the system requirements specified in the project prompt for implementation details.

## Branding & UI

The frontend uses a premium dark theme with a bold red accent (#E10600) and supporting neutrals. Key components:

- Splash/loader page (`splash.html`) with glass‑card pulse animation and progress ring (used as PWA start URL).

- Glassmorphic header with blurred backdrop
- Horizontal category tabs with red active indicator
- Elevated rounded menu cards
- Circular red add buttons and bottom-sheet cart
- Smooth transitions, skeleton loaders and micro‑interactions
- Table number badge at top and order confirmation overlay
- Admin dashboard styled like a modern SaaS with sidebar and dark surfaces

Colors and styles are defined in `public/css/styles.css`. Screenshots are not included in this repo.
## Database Setup

Import `schema.sql` into your Supabase project's SQL editor. It creates all tables with UUID primary keys, foreign keys and includes row level security (RLS) policies exactly as required. Do **not** disable RLS and avoid using the service-role key in frontend code.


## Example QR URL

A QR code should point to a customer menu page like:
```
https://yourdomain.com/menu.html?slug=restaurant-slug&table=12
```
Replace `restaurant-slug` with the slug you created in the admin panel and `12` with the table number encoded on the QR sticker.
