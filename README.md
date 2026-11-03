# Smart Expense Tracker

Mobile-first monthly budget and expense tracker. React 19, Vite 8, Tailwind CSS v4, React Router, Recharts, jsPDF, installable PWA. Data is stored in the browser (localStorage); there is no backend.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # 16 calculation / reducer / import tests
npm run build      # production build in dist/
npm run preview    # serve the build (service worker + install prompt only work on the build)
```

## Put it on your phone

1. Deploy `dist/` to any static host over HTTPS. `firebase.json` (SPA rewrite) and `public/_redirects` (Netlify) are included:
   `npm run build && npx firebase-tools deploy --only hosting`
2. Open the URL in Chrome on Android, then tap **Install** (in-app banner or Settings), or Browser menu > Install app.

## How the numbers work

Nothing calculated is stored. Each month stores only its budget setup and a list of expenses; every figure on screen comes from `src/utils/calc.js`:

- Category spent = sum of that category's expenses; remaining = budget - spent (can go negative, never blocks you).
- Overall spent = sum of all expenses; overall remaining = total allocated - spent.
- Money is summed in integer paise, so there is no floating-point drift.
- Status colours: under 70% normal, 70-90% warning, above 90% danger, above 100% "Budget exceeded".

Each month (`YYYY-MM`) is a separate ledger. Starting a new month offers to copy the previous month's budget with an empty expense list; older months are never changed or deleted automatically.

## Structure

```
src/
  components/{common,dashboard,expenses,budget,reports}
  pages/        Dashboard, Expenses, Analytics, Budget, Settings
  hooks/        useBudget (store), useTheme, useInstallPrompt
  services/     reducer (state transitions), storage (persist + import validation), pdfReport
  utils/        calc, money, dates, icons, colors
  data/         defaults (sample budget + demo data)
tests/          node:test suite
```

## Notes and limits

- Data lives only in this browser. Clearing site data or changing phone loses it; use **Settings > Export data** for backups.
- The PDF prints rupees as "Rs." because the built-in PDF font has no rupee glyph, and non-Latin text in expense names (for example Tamil) prints as "?" in the PDF only. The app itself shows both correctly.
- Changing currency changes the symbol only; amounts are not converted.
