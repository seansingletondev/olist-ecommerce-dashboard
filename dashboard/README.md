# dashboard

The React + TypeScript + D3 frontend for the Olist analytics dashboard. See the
[repo root README](../README.md) for the full Python → SQL → TypeScript/D3
pipeline this is the last step of, and `../ARCHITECTURE.md` for the fuller
design write-up.

This package only reads pre-generated JSON from `public/data/` (written by
`python/export/export_to_json.py`) — it has no database connection of its own,
which is what makes it deployable as a plain static site.

## Scripts

```
npm run dev       # start the Vite dev server
npm run build     # type-check + production build (dist/)
npm run preview   # serve the production build locally
npm run lint      # oxlint
```
