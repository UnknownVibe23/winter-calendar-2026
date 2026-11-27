# winter-calendar-2026

An interactive advent calendar. Static web app (GitHub Pages,
Vite + TypeScript) with all personal content encrypted
client-side (AES-GCM). The repository only ever ships ciphertext
and placeholders, so the calendar stays private to its single
intended user.

Built card-by-card as small, fully reviewed task units. See
PROJECT.md and decisions.md for current status and history.

## Fonts

The display typeface is **Mountains of Christmas** (weights 400 and
700, latin subset), designed by Tart Workshop (Crystal Kluge),
copyright Font Diner, Inc DBA Tart Workshop. It is licensed under the
Apache License, Version 2.0 (see `public/fonts/LICENSE.txt`). The
woff2 files are committed directly in `public/fonts/` and served
locally via `@font-face`; the site makes no runtime requests to any
font CDN.
