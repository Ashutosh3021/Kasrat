# KASRAT 🏋️

A minimalist, offline-first fitness tracker PWA built with React, TypeScript, and Tailwind CSS.

## Features

- 📊 **Track workouts** — Log strength and cardio exercises with detailed metrics
- 📈 **Progress graphs** — Visualize your gains with interactive charts (Recharts)
- 📅 **Workout plans** — Create custom plans with scheduled days
- ⏱️ **Rest timer** — Built-in countdown timer with audio and vibration alerts
- 📱 **PWA** — Install on any device, works 100% offline
- 🗄️ **Local storage** — All data stored in IndexedDB (Dexie.js)
- 🎨 **Dark theme** — Material You-inspired design with Tailwind CSS v4
- 🔄 **Drag & drop** — Reorder exercises and tabs (touch + mouse support)

## Tech Stack

- **React 19** + **TypeScript 6**
- **Vite 7** — Lightning-fast dev server and build tool
- **Tailwind CSS 4** — Utility-first styling with custom theme
- **React Router 7** — Hash-based routing for GitHub Pages
- **Zustand 5** — Lightweight state management
- **Dexie.js 4** — IndexedDB wrapper for offline data
- **Recharts 3** — Composable charting library
- **Lucide React** — Beautiful icon set
- **vite-plugin-pwa 1.2** — Service worker generation

> **Note:** This project uses Vite 7 (not Vite 8) because `vite-plugin-pwa@1.2.0` does not yet support Vite 8. See [issue #923](https://github.com/vite-pwa/vite-plugin-pwa/issues/923) for tracking Vite 8 support.

## Project Structure

```
kasrat/
├── src/
│   ├── components/       # Reusable UI components (TopBar, BottomNav, Toggle, DayPills)
│   ├── pages/            # Route pages (19 pages)
│   │   └── settings/     # Settings sub-pages (5 pages)
│   ├── overlays/         # Modals and bottom sheets (6 overlays)
│   ├── store/            # Zustand stores (settings, timer, UI)
│   ├── db/               # Dexie database schema and defaults
│   ├── hooks/            # Custom hooks (useTimer, useDragToReorder)
│   ├── utils/            # Utility functions (date formatting)
│   ├── App.tsx           # Root component with bottom nav logic
│   ├── router.tsx        # React Router configuration
│   └── main.tsx          # Entry point with service worker registration
├── public/
│   └── Assets/
│       ├── icons/        # PWA icons (48px to 512px)
│       ├── logo.ico
│       ├── logo.svg
│       └── manifest.json
├── .github/workflows/
│   └── deploy.yml        # GitHub Actions deployment
├── vite.config.ts        # Vite + PWA configuration
├── tsconfig.json         # TypeScript configuration
└── package.json
```

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Install dependencies

```bash
npm install
```

### Run dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
```

Output goes to `dist/`.

### Preview production build

```bash
npm run preview
```

### Type check

```bash
npx tsc -b --noEmit
```

### Lint

```bash
npm run lint
```

## Deployment

### GitHub Pages (Automated)

This repo is configured for automatic deployment to GitHub Pages via GitHub Actions.

**Setup:**

1. Push your code to the `main` branch
2. Go to **Settings** → **Pages** in your GitHub repo
3. Under **Source**, select **GitHub Actions**
4. The workflow will automatically build and deploy on every push to `main`

**Manual trigger:**

Go to **Actions** → **Deploy to GitHub Pages** → **Run workflow**

**Base path configuration:**

The app is configured for deployment at `https://ashutosh3021.github.io/Kasrat/` (see `vite.config.ts` → `base: '/Kasrat/'`).

If deploying to a different path:
- Update `base` in `vite.config.ts`
- Update `start_url` and `scope` in the PWA manifest (also in `vite.config.ts`)
- Update `homepage` in `package.json`

### Manual Deployment

```bash
# Build
npm run build

# Deploy dist/ folder to your hosting provider
```

## Database Schema

**Tables:**

- `gym_sets` — Individual workout sets (weight, reps, cardio data)
- `plans` — Workout plans with scheduled days
- `plan_exercises` — Exercises within plans (many-to-many)
- `settings` — User preferences (single row)

**Indexes:**

- `gym_sets`: `++id, name, created, cardio, planId`
- `plans`: `++id, sequence, title`
- `plan_exercises`: `++id, planId, exercise`
- `settings`: `++id`

## Routes

| Path | Component |
|------|-----------|
| `/` | HomePage |
| `/graphs` | GraphsPage |
| `/graphs/:name` | StrengthGraphPage |
| `/cardio-graph/:name` | CardioGraphPage |
| `/global-progress` | GlobalProgressPage |
| `/edit-graph/:name` | EditGraphPage |
| `/plans` | PlansPage |
| `/history` | HistoryPage |
| `/timer` | TimerPage |
| `/settings` | SettingsPage |
| `/settings/appearance` | AppearanceSettingsPage |
| `/settings/timer` | TimerSettingsPage |
| `/settings/tabs` | TabSettingsPage |
| `/settings/data` | DataSettingsPage |
| `/settings/format` | FormatSettingsPage |
| `/edit-plan/:id` | EditPlanPage |
| `/start-plan/:id` | StartPlanPage |
| `/add-exercise` | AddExercisePage |
| `/edit-set/:id` | EditSetPage |
| `/about` | AboutPage |

## License

MIT

## Author

Built with ❤️ for lifters
