# Bolão Mundial 2026 Dashboard 🏆

A dashboard for a 365scores "Bolão" prediction group — rankings, accuracy, trends,
top scorers and more. Built with React + Vite.

## Two modes (one codebase)

The app decides what to show based on whether config was baked in at build time:

| Env vars at build | Behavior |
|---|---|
| none (`npm run build`) | **Setup screen** — each user enters their own group number + token. Best for a public deploy. |
| `VITE_BOLAO_TOKEN` + `VITE_GROUP_ID` set | **No setup screen** — goes straight to the dashboard for that group. |

Config resolution order: **localStorage → env**. Once a user fills the setup
screen, their values are stored in `localStorage` (browser-only) and used on every
visit. The ⚙︎ button in the header clears them and returns to setup.

## Getting your token

The 365scores API requires a Bearer token. To get yours:

1. Open the Bolão site (logged in) in your browser.
2. Open DevTools (**F12**) → **Network** tab, then refresh.
3. Click any request to `wcg-il.365scores.com` → **Headers** → **Request Headers**.
4. Copy the full `Authorization` value (`Bearer eyJ...`).

The token stays in your browser only — it is never sent anywhere except the Bolão API.

> Note: the dashboard loads one request per group member, so larger groups take
> longer to load. Groups under ~1,000 members are recommended for a smooth experience.

## Develop

```bash
npm install
npm run dev            # setup screen — enter group number + token
```

## Deploy (e.g. Netlify)

Build command `npm run build`, publish directory `dist`. Each visitor enters their
own group number + token on the setup screen.

To pre-configure a build for a single group (skip the setup screen), set
`VITE_BOLAO_TOKEN`, `VITE_GROUP_ID` and `VITE_GROUP_NAME` in the build environment.

## Environment files

Copy `.env.example` to `.env.local` and fill in values only if you want a
pre-configured build. **Never commit a file containing a real token** — `.env*`
is gitignored (except `.env.example`).
