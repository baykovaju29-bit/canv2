
# Matching Words ↔ Definitions — v3

Fixes:
- Relative entry in `index.html`: `./src/main.jsx` (fixes Rollup resolve on Vercel).
- CJS configs for Tailwind & PostCSS.
- `vercel.json` with explicit build/output.
- Node >=18 in `engines`.

Deploy: push to GitHub → Vercel → Import → Build (`dist`).
