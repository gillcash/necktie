# Necktie website

The public one-page website for [Necktie](https://github.com/gillcash/necktie).
It is intentionally static: one route, one stylesheet, no analytics, database,
authentication, client-side state, or third-party font requests.

## Development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm test
```

`npm test` builds the production worker and checks the rendered content,
installation commands, metadata, and removal of starter-only machinery.
