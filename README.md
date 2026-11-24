# grusiber-site

React + Vite site, deployed on Cloudflare Workers from this repo.

```sh
npm install
npm run dev      # local dev server
npm run build    # outputs to dist/
```

Cloudflare build settings: build command `npm run build`, deploy command `npx wrangler deploy`
(the default). `wrangler.jsonc` serves `dist/` and sends unknown paths like `/maintenance` to the React app.

## Admin panel and API

Events (`/takvim/`) and announcements (`/duyurular/`, the bar on the home page) live in a
Cloudflare D1 database. `worker/index.js` serves them under `/api/*`; every other path is a
static file and never runs the worker (`run_worker_first` in `wrangler.jsonc`).

- `GET /api/events`, `GET /api/announcements`: public.
- `/api/admin/*`: add, edit, delete. Needs a Cloudflare Access login; the worker checks the
  Access JWT against `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`.
- `/admin`: the editor page. Not linked from the site.
- `/api/admin/go/*` (`worker/go.js`): go.grusiber.com short links, QR designer, static QR
  library and scan stats. The worker binds the go worker's KV (`LINKS`) and D1 (`GO_DB`,
  schema in `migrations-go/`); the go worker itself only redirects and logs scans.

Local development, no Cloudflare account needed:

```sh
cp .dev.vars.example .dev.vars   # makes localhost count as signed in
npm run db:migrate:local         # creates the tables in .wrangler/
npm run db:go:migrate:local      # same for the go.grusiber.com database
npm run db:seed:local            # sample events (made up, local only)
npm run build && npm run dev:api # worker on :8787
npm run dev                      # site on :5173, /api is proxied to :8787
```

One-time setup on Cloudflare:

1. `npx wrangler d1 create grusiber`, put the printed `database_id` in `wrangler.jsonc`.
2. `npm run db:migrate` to create the tables in the real database.
3. Zero Trust → Access → Applications: a self-hosted app for `grusiber.com/admin` and
   `grusiber.com/api/admin` with a policy listing the allowed emails. Put the team domain and
   the app's AUD tag in `wrangler.jsonc` under `vars`.

## Boot sequence

The home page can play a real Arch Linux boot (kernel 6.0.8-arch1-1, systemd 252) before the site loads. It is switched off for now: `src/pages/Home.jsx` no longer renders `BootSequence`.
The text comes from a real `journalctl -b`, saved in `scripts/arch-boot-journal.txt`
([source](https://bbs.archlinux.org/viewtopic.php?id=281336)). `scripts/build-bootlog.mjs` turns it into
what the console showed, with timing, in `src/boot/bootlog.json`. Run `node scripts/build-bootlog.mjs`
after editing the script. Press Esc or double click to skip it.

## Credits

Console font: IBM VGA 8x16 from [The Ultimate Oldschool PC Font Pack](https://int10h.org/oldschool-pc-fonts/)
by VileR, licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

## Branches

- `dev`: the work-in-progress site.
- `prod`: what the live domain serves. While `prod` has a `.env.production` file with
  `VITE_MAINTENANCE=true`, every URL shows the maintenance page. To launch the real site,
  delete that file on `prod`. Merging `dev` into `prod` doesn't touch it.
