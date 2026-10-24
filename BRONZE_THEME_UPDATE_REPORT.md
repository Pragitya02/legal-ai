# Bronze Theme Update Report

Project: Nyaya AI (`legal-ai-main`), frontend only. Date: 2026-10-25.

## 1. Summary

The gold accent palette was replaced with a bronze/copper palette across the frontend (`src/`). Black/dark backgrounds and white/gray text were left alone. Only color tokens changed: a line-by-line comparison against the original showed **385 changed lines in 34 files, 0 non-color differences** (no layout, routing, API or logic edits). No backend, env, database, auth, `node_modules` or build-output files were read or changed.

| Role | Old | New |
|---|---|---|
| Primary bronze | `#D4AF37` | `#C27635` |
| Light bronze | `#F0D878`, `#F5DC75`, `#F5DD78`, `#F5D76E`, `#F0D264`, `#E8CC65`, `#E2BD45`, `#E5BC43` | `#E3A15F` |
| Dark bronze | `#A88624`, `#A27B2C`, `#8A6A24`, `#9D7B18`, `#8A6508` | `#8F5428` |

`src/pages/Landing.tsx` now has `--landing-gold: #C27635; --landing-gold-light: #E3A15F; --landing-gold-dark: #8F5428;`. All existing variable names (`--landing-gold*`, `--gold*`, `--blue*`) were kept.

## 2. Modified frontend files (34)

Format: file, changed lines, color tokens replaced.

| File | Lines | Tokens | What changed |
|---|---|---|---|
| `src/components/MandatoryFeedbackGate.tsx` | 3 | 4 | Feedback gate icon, spinner and ring: Tailwind `yellow-*` accents to bronze |
| `src/components/NyayaAIMonogram.tsx` | 2 | 2 | SVG strokes |
| `src/components/NyayaAIResearchMonogram.tsx` | 2 | 2 | SVG strokes/fills |
| `src/components/layout/BackButton.tsx` | 6 | 6 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/components/layout/Navbar.tsx` | 45 | 47 | ALPINE wordmark, nav links, hover/active states, avatar gradients, three-line menu |
| `src/index.css` | 43 | 43 | Global theme vars (`--blue`, `--gold*`, `--border`, `--shadow-blue`), `.btn-primary` gradient and hover, focus rings, scrollbar, `.cursor-sparkle` glow, gavel-cursor drop-shadow glows |
| `src/pages/AIAssistant.tsx` | 1 | 1 | jsPDF export accent color `[212,175,55]` to `[194,118,53]` |
| `src/pages/AdminDashboard.tsx` | 15 | 15 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/AdminLogin.tsx` | 15 | 17 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/AdvocateDashboard.tsx` | 1 | 3 | Header gradient (`#8A6508 > #C9A227 > #F0D264` to `#8F5428 > #C27635 > #E3A15F`) |
| `src/pages/Booking.tsx` | 1 | 1 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/CitizenDashboard.tsx` | 16 | 17 | Dashboard cards, banner gradient, badges, selected states |
| `src/pages/Documents.tsx` | 1 | 2 | Document verification / blockchain UI accents (pending status yellow kept) |
| `src/pages/Feedback.tsx` | 7 | 11 | Spinner, shield icon, primary buttons, focus border, notice panel: `yellow-*` accents to bronze (star-rating fill kept) |
| `src/pages/Landing.tsx` | 46 | 52 | `--landing-gold` / `-light` / `-dark` set to the requested values; headings, buttons, cards, team cards, footer/social links, ALPINE footer wordmark, disclaimer popup colors (color-only) |
| `src/pages/Login.tsx` | 5 | 5 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/ManagementDashboard.tsx` | 23 | 23 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/ManagementLogin.tsx` | 6 | 6 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/Meeting.tsx` | 16 | 18 | Meeting-room accent panels, buttons, icons, request banners/modal: `yellow-*` accents to bronze |
| `src/pages/Meetings.tsx` | 23 | 26 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/Profile.tsx` | 2 | 2 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/admin/AdminAdvocateDetail.tsx` | 11 | 14 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/admin/AdminAdvocates.tsx` | 6 | 6 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/admin/AdminUserDetail.tsx` | 11 | 14 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/admin/AdminUsers.tsx` | 6 | 6 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/advocate/ConsultationRequests.tsx` | 1 | 1 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/advocate/Earnings.tsx` | 3 | 3 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/advocate/Meetings.tsx` | 23 | 26 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/legal/Grievance.tsx` | 1 | 1 | Gold accent color/border |
| `src/pages/legal/LegalPage.tsx` | 5 | 5 | Legal page heading/link accents |
| `src/pages/management/ManagementAdvocates.tsx` | 6 | 6 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/management/ManagementConsultations.tsx` | 14 | 14 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/management/ManagementReports.tsx` | 13 | 13 | Gold accents (borders, text, icons, gradients, glows) to bronze |
| `src/pages/management/ManagementUsers.tsx` | 6 | 6 | Gold accents (borders, text, icons, gradients, glows) to bronze |

## 3. Old and new color values (replacement counts)

| Old | New | Count |
|---|---|---|
| `#D4AF37` (all forms, incl. `text-[#D4AF37]`, `border-[#D4AF37]`, `bg-[#D4AF37]`) | `#C27635` | 205 |
| `rgba(212,175,55,α)` (alpha unchanged) | `rgba(194,118,53,α)` | 128 |
| jsPDF array `[212,175,55]` | `[194,118,53]` | 1 |
| `#F5DC75` | `#E3A15F` | 8 |
| `#E5BC43` | `#E3A15F` | 7 |
| `rgba(229,188,67,α)` | `rgba(227,161,95,α)` | 6 |
| `#F5DD78`, `#F0D878` | `#E3A15F` | 3 + 3 |
| `#F5D76E`, `#F0D264`, `#E8CC65`, `#E2BD45` | `#E3A15F` | 1 each |
| `rgba(255,196,65,α)`, `rgba(255,190,45,α)` (gavel cursor glow) | `rgba(227,161,95,α)` | 3 + 1 |
| `#A27B2C` | `#8F5428` | 3 |
| `rgba(162,123,44,α)` | `rgba(143,84,40,α)` | 3 |
| `#8A6A24` | `#8F5428` | 2 |
| `#A88624`, `#9D7B18`, `#8A6508` | `#8F5428` | 1 each |
| `#C9A227` (gradient midpoint) | `#C27635` | 1 |
| Tailwind `bg-yellow-500` / `border-yellow-500` / `focus:border-yellow-500` | `bg-[#C27635]` / `border-[#C27635]` / `focus:border-[#C27635]` (opacity suffixes kept) | 11 / 6 / 1 |
| Tailwind `text-yellow-400/200/100`, `hover:bg-yellow-400` | `text-[#E3A15F]`, `hover:bg-[#E3A15F]` | 9 / 1 / 1 / 4 |

Derived shades (not in the supplied palette, added so gradients and hovers still read correctly):

| Old | New | Where |
|---|---|---|
| `#FFF0A6` | `#EDB57A` | `.btn-primary:hover` gradient start (lighter tint of light bronze) |
| `#6B5014` | `#6E4020` | Citizen dashboard banner gradient mid-stop |
| `#3A2A08` | `#3A2010` | Citizen dashboard banner gradient start |
| `#5D4915` | `#5E3A1C` | Scrollbar thumb (dark bronze, muted) |

Totals: about 418 individual color tokens replaced across 34 files.

## 4. Frontend files inspected but not modified

- The other 33 files under `src/` (67 total) were scanned and contained no gold accents. They use only neutral, white/gray, black, or semantic status colors.
- `index.html`: only `theme-color` `#0B0B0B` (dark background), so no change.
- `vite.config.ts`, `tsconfig.json`, `package.json`: no theme or color configuration (Tailwind v4 theme lives in `src/index.css`).
- `public/nyaya-logo.jpeg`: gold-colored raster logo artwork. Recoloring a photo-rendered JPEG would alter the brand artwork, so it was left as is (see section 5).
- `public/gavel-custom-cursor.png`: raster cursor image (brown wood with a gold band); left as is.
- `public/dc.jpeg`, `public/team/*.jpg`, `public/hero-scale.mp4`, `robots.txt`, `sitemap.xml`: no theme colors.
- Not touched at all: `backend/`, `.env.example`, `docs/`, `vercel.json`, lockfiles, `.figma/`.

## 5. Remaining gold-colored references and why they were kept

| Reference | Count | Reason |
|---|---|---|
| `public/nyaya-logo.jpeg` | 1 file | Gold raster brand artwork. Needs a redesigned logo file from the owner, not a code change. |
| `public/gavel-custom-cursor.png` | 1 file | Raster gavel (brown with a gold band). Left unmodified. |
| `#F59E0B`, `rgba(245,158,11,α)`, `rgb(251,191,36)`, `#D97706`, `var(--amber)` | 24 + 15 + 2 + 2 + 1 | Amber = semantic "pending / warning / rating" status colors on cases, bookings, notifications, earnings, dashboards. |
| `#EAB308`, `rgba(234,179,8,α)` | 1 + 3 | "Pending" document status and the search-match highlight `<mark>` in `DashboardLayout.tsx`. Semantic yellow. |
| `fill-yellow-400 text-yellow-400` | 2 | Star-rating fill (`AdvocateRating.tsx`, `Feedback.tsx`). Stars are conventionally yellow. |
| `#FBBC05` | 1 | Yellow segment of the Google "G" logo in `Login.tsx` (third-party brand color). |
| `#F5F1E8` | 2 | Cream off-white heading/value text on legal pages (a neutral text color, not an accent). |
| Comments / names such as `--gold`, `--landing-gold`, `const gold`, "GOLD BUTTON" | various | Kept so existing variable names keep working; the values are now bronze. Comments can be renamed later. |

Judgment call: in `Meeting.tsx`, the incoming "end consultation" request modal and banner used `yellow-*` Tailwind classes alongside the room's other gold accents, so they were converted to bronze for consistency. If you want those to stay a yellow warning, revert lines using `border-[#C27635]/20` in that modal.

Note on earlier project rules: your saved notes say the ALPINE wordmark, Team section and cursor sparkle effect should not be modified. This task explicitly asked for branding, team cards and custom cursors to be recolored, so only their **colors** were changed (ALPINE text color and glow, team-card accents via `--landing-gold*`, `.cursor-sparkle` glow). Their layout, animation and behavior are unchanged.

## 6. Frontend build and test results

- **`npm run build`: NOT RUN SUCCESSFULLY.** `npm ci` could not download dependencies in this environment (`ENOTFOUND registry.npmjs.org`: no network), so `vite` was never installed and the build could not start. This is an environment limitation, not a build failure, but it means the build is **unverified**.
- **Frontend tests: none available.** `package.json` has no `test` script and there are no test files. Only `dev`, `build`, `preview`, `format`.
- **Offline check that did pass:** every one of the 385 changed lines was compared with the original after masking color tokens, and all were identical (0 non-color diffs, line counts unchanged in all 34 files). A search of `src/` and `index.html` finds 0 remaining `#D4AF37` / `rgba(212,175,55,…)`.
- Please run `npm ci && npm run build` locally to confirm.

## 7. Suggested Git commit message

```
feat(ui): replace gold theme with bronze palette

- Primary #D4AF37 -> #C27635, light -> #E3A15F, dark -> #8F5428
- Update Landing --landing-gold* vars, global theme vars, buttons, focus rings,
  navbar, dashboards, meeting/feedback accents, cursor glow, SVG monograms
  and PDF export accent
- Keep amber/yellow semantic status colors, star ratings and Google logo
- Color-only change: no layout, routing, API or behavior changes
```
