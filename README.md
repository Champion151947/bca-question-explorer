# BCA Question Explorer

An unofficial web app that helps **Calicut University BCA** students see
**which exam questions keep coming back** — so they can revise the high-value topics first.

Pick a semester and a subject, and questions are grouped into topics and ranked by how many
**different exam years** they appeared in:

| Tier | Meaning |
| --- | --- |
| 🔥 **Must Study** | asked in **4+** different years |
| ⚡ **High** | asked in **3** different years |
| 📌 **Frequent** | asked in **2** different years |
| • **Asked once** | a single distinct year (hidden by default) |

> **Unofficial student resource.** Built from past question papers, some of which were scanned
> with OCR, so text errors are possible. Not affiliated with or endorsed by Calicut University.
> Do not republish full question papers.

---

## Features

- **Semester / scheme filters** and a subject picker with a quick "Must Study" summary.
- **Per-subject view** with four tabs:
  - **Questions** – accordion of topics, each showing the years it was asked and the exact
    wording from each year, with marks and caveat flags.
  - **Pattern** – a topic × year heatmap; years with no paper are greyed out.
  - **Cards** – flip flashcards for the Must/High topics (keyboard: `Space` to flip, arrows to move).
  - **Revision sheet** – a clean, printable one-page list (Print / Save as PDF).
- **Search** across every subject, plus a global **⌘/Ctrl-K** command palette.
- **Progress tracking** – mark topics *mastered* or *to revise*, add private notes; grouped by
  subject, with **export/import backup** (JSON). Stored only in your browser.
- **Exam-date planner** – set your exam date and it suggests how many topics to revise per day.
- **Light (default) / dark / system theme**, installable **PWA**, works offline.
- Mobile-first layout with bottom navigation, ≥44px touch targets, and `prefers-reduced-motion`
  and print styles.

---

## Quick start

Requires **Node 18+** (developed on Node 24).

```bash
npm install
npm run data      # build the dataset into public/data/
npm run dev       # start the dev server
```

Other scripts:

| Script | What it does |
| --- | --- |
| `npm run data` | Runs the build-time pipeline (`scripts/build-data.mjs`) → `public/data/`. |
| `npm run dev` | Vite dev server with HMR. |
| `npm run build` | `npm run data` → typecheck → production build into `dist/`. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run preview` | Serve the built `dist/` locally. |
| `node scripts/make-icons.mjs` | Regenerate the app/PWA icons (no dependencies). |

The generated `public/data/` is required for the app to run — run `npm run data` (or `npm run build`)
after cloning if it is missing.

---

## How the data is built

`scripts/build-data.mjs` turns the raw question exports into static JSON at build time; the shipped
app only ever reads those JSON files.

**Inputs** (in the project root):

- `questions.csv` – one row per extracted question.
- `papers_index.csv` – one row per paper (carries the **scheme/programme**, year, semester).
- `04_website_data.json` – fallback source when the CSVs are unavailable.

The script prefers the CSVs (**Mode B**) and falls back to the JSON (**Mode A**); the chosen mode is
recorded in `public/data/index.json`.

**Key rules**

- A topic's tier is based on the number of **distinct exam years** it was asked in — **not** raw
  occurrence counts. Two questions in the same paper count once, so a single paper can never make a
  topic look "repeated".
- **Scheme (CBCSS / FYUGP) is taken only from the paper's recorded programme**, never inferred from
  the year. Counting is done inside each **(subject, semester, scheme)** segment.
- OCR text is normalised (unicode NFKC, math-italic collapse, debris/paper-code/junk stripping), and
  items that are garbled, truncated, or that group related questions are flagged in the UI.

**Outputs** (`public/data/`):

- `index.json` – site totals + a summary card per subject.
- `search-index.json` – MiniSearch documents (one per topic, one per subject).
- `<subject-slug>.json` – full detail for a subject (segments, keywords, clusters).
- `build-report.json` – counts, merges, and data-quality notices.

Data-quality notes (`limited` subjects, `possibleReusedPapers`, scheme-unknown years, mixed clusters,
etc.) are surfaced in the UI rather than hidden.

---

## Project structure

```
bca-question-explorer/
├─ api/                     # Vercel serverless gate (login + private /api/data)
│  ├─ _lib/security.js      # HMAC session cookies + AES-256-GCM decrypt
│  ├─ _lib/data.js          # encrypted blob (ships as a placeholder until you run encrypt)
│  ├─ login.js / session.js / logout.js
│  └─ data/[file].js        # auth-gated JSON for one paper/subject file
├─ server/
│  └─ serve.mjs             # alternative zero-dependency Node gate (local / VPS)
├─ scripts/
│  ├─ build-data.mjs        # build-time data pipeline
│  ├─ encrypt-data.mjs      # encrypts public/data/ into api/_lib/data.js
│  └─ make-icons.mjs        # generates PWA/app PNG icons (zlib only)
├─ src/
│  ├─ components/           # Layout, ClusterCard, HeatmapView, Flashcards, LoginGate, ui, …
│  ├─ pages/                # Home, Subject, Search, Tools, Progress, About, NotFound
│  ├─ lib/                  # types, data loader, auth, search, tiers, heatmap, planner, format
│  ├─ store/useStore.ts     # zustand store (persisted in localStorage)
│  ├─ data/catalog.json     # seed catalogue metadata
│  ├─ config.ts             # site name, author, links, disclaimer
│  ├─ App.tsx / main.tsx
│  └─ index.css
├─ public/                  # favicon, icons, generated data/ (gitignored)
├─ LICENSE                  # MIT — applies to the code only
├─ DATA-LICENSE.md          # All Rights Reserved — applies to the papers
├─ .env.example             # how to switch on the gated server mode
├─ vercel.json              # gated Vercel build config
├─ index.html
├─ tailwind.config.js / postcss.config.js
├─ vite.config.ts
└─ tsconfig.json
```

---

## Configuration

Edit `src/config.ts` for deployment-specific values:

- `siteName`, `shortName`, `tagline`, `subtitle`
- `feedbackEmail` (and optional `feedbackFormUrl`) — used by each question's **Report** link
- `paperLinksEnabled` — set to `true` only if you actually host the original papers
- `disclaimer`, `dataNotice`

---

## Deploying

The build is a static site (`dist/`) with `base: './'` and hash routing, so it works from any path.

**Any static host** (Netlify, Vercel, S3, nginx, …):

```bash
npm run build
# then publish the dist/ directory
```

Because routing uses the URL hash (`#/subject/...`), no SPA rewrite rules are needed.

> A plain static host gives you the **app only** — the papers are gitignored, so there is nothing to
> serve and the pages will be empty. For a working public site, use the gated setup below.

### Deploy the gated site on Vercel (free, fast)

1. **Encrypt your papers** (once, locally) and commit the result:
   ```bash
   # PowerShell
   $env:DATA_KEY="a-long-random-passphrase"; npm run encrypt
   ```
   This writes `api/_lib/data.js` — unreadable ciphertext. Commit it.
2. Push the repo to GitHub and **import it on Vercel** (framework auto-detects Vite; `vercel.json`
   already sets the build command and the two public `VITE_*` flags).
3. Add these **Environment Variables** in Vercel (Settings → Environment Variables) — keep them secret:
   | Name | Value |
   | --- | --- |
   | `DATA_KEY` | the same passphrase from step 1 |
   | `ACCESS_PASSWORD` | the access code you give students |
   | `SESSION_SECRET` | any long random string (signs the login cookie) |
4. Deploy. Visitors see a login screen; the papers are served by `api/data/*` only to a valid session.

The same handlers also run on Netlify Functions or Cloudflare with minor tweaks.

---

## Licensing & keeping the papers private

This project deliberately separates **code** from **data**:

- The **application code** is open-source under the **MIT License** ([LICENSE](./LICENSE)).
- The **question papers and content** are **All Rights Reserved** ([DATA-LICENSE.md](./DATA-LICENSE.md))
  and are **not** part of this repository. The pipeline inputs (`questions.csv`,
  `papers_index.csv`, `04_website_data.json`) and the generated `public/data/` are listed in
  `.gitignore`, so a fresh clone contains the app but **no papers**.

To run the app locally with your own papers, drop your source exports into the project root and run
`npm run data` (see [How the data is built](#how-the-data-is-built)). Without them, the app builds
but has no content.

> **Reality check:** on a public **static** host, any data the browser can display can also be
> downloaded by a visitor. To stop anonymous/bulk access, serve the data from a backend that requires
> a login (see [Serving the data from a server](#serving-the-data-from-a-server-optional-gate)).
> That stops anonymous scraping, but a logged-in user can still copy what they can see.

---

## Serving the data from a server (optional gate)

If you don't want a purely static site, the included Node server serves the app and hands out the
papers only to authenticated users:

```bash
# 1. Put your papers in public/data/ (gitignored) via:  npm run data
# 2. Build the app:                                      npm run build
# 3. Set an access password and start the server:
#    PowerShell:  $env:ACCESS_PASSWORD="your-secret"; node server/serve.mjs
#    bash:        ACCESS_PASSWORD=your-secret node server/serve.mjs
```

The server listens on `PORT` (default `8080`) and:

- serves the static app from `dist/`,
- gates every `/api/data/*.json` request behind a session cookie obtained from `POST /api/login`,
- keeps the papers **out of the built `dist/` bundle**, so the deployable static files contain no data.

Point the frontend at it with `VITE_DATA_BASE=/api/data` at build time (see `.env.example`). This
server runs on any Node host (Render, Railway, Fly.io, a VPS) — but note that free-tier web hosts
often sleep, so for "free **and** fast" prefer the serverless Vercel setup above.

---

## Tech

React 18 · TypeScript · Vite 5 · Tailwind CSS 3 · zustand · MiniSearch · React Router (HashRouter) ·
vite-plugin-pwa. Runs fully in the browser; the **optional** serverless gate (`api/`) and Node server
(`server/`) only serve the private papers after login. No analytics.
