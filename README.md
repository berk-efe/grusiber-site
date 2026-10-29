# grusiber-site

React + Vite site, deployed on Cloudflare Workers from this repo.

```sh
npm install
npm run dev      # local dev server
npm run build    # outputs to dist/
```

Cloudflare build settings: build command `npm run build`, deploy command `npx wrangler deploy`
(the default). `wrangler.jsonc` serves `dist/` and sends unknown paths like `/maintenance` to the React app.

## Boot sequence

The home page plays a real Arch Linux boot (kernel 6.0.8-arch1-1, systemd 252) before the site loads.
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
