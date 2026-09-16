# Necktie website

The public one-page website for [Necktie](https://github.com/gillcash/necktie).
Plain HTML and CSS, with no browser JavaScript, dependencies, analytics, database,
authentication, or third-party fonts. Native radio buttons switch the six install
instructions; arrow keys work without a script.

## Development

Requires Node.js 22.13 or newer.

```bash
npm run dev
npm test
```

`npm run dev` builds and serves on localhost:3000 (`PORT` overrides it).
After source edits, run `npm run build` and refresh. `npm start` serves the existing
build. `npm test` checks content, install commands, assets, metadata validation,
and the preview server's public-file boundary. `npm run lint` checks JS syntax.

Edit prose in `index.html`; `content.mjs` holds the questions and six install hosts
with a shared HTML template for each. Styles are separated into shared typography and page
chrome (`styles/base.css`), content sections (`styles/content.css`), and the native
host picker (`styles/install.css`). Images and favicons stay in `public/`.

## Build and hosting

`npm run build` writes `dist/index.html`, styles, public assets and
`dist/.openai/hosting.json`. Sites uses `static.directory: "dist"`; no Worker,
database, runtime binding, image service, or framework is needed.

Set `SITE_URL` to the deployed HTTP(S) origin when building for publication, for
example `https://your-site.example`. It supplies absolute Open Graph and Twitter
image URLs; the local default is `http://localhost:3000`. Paths, credentials,
queries and fragments are rejected. Request headers never affect metadata.
