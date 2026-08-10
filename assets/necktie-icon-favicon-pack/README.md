# Necktie icon and favicon pack

This pack was built from the supplied mascot artwork. The exports use three deliberate compositions:

- **Favicons:** a tight face crop so the mark remains identifiable at 16–32 px.
- **App and touch icons:** a square head-and-collar crop that preserves the necktie.
- **Masters and avatars:** the complete bust, including the full collar and tie.

## Ready-to-copy web files

Copy everything in `public/` to the public root of the site. Then use either:

- `snippets/favicon-head-minimal.html`, or
- `snippets/favicon-head-theme-aware.html`.

An Astro component is included at `snippets/Favicons.astro`.

## Included variants

- Multi-resolution `favicon.ico` with 16, 24, 32, 48, 64, 128, and 256 px frames.
- Universal black/white `favicon.svg`.
- Transparent black and white SVGs for light and dark browser chrome.
- Transparent PNG favicons and black/white monochrome PNG favicons.
- Apple touch, Android/PWA, maskable, and Windows tile assets.
- Black, white, transparent, square, and circular avatar exports.
- 1024 px and 2048 px masters.
- `currentColor` SVG for interface use.

## Colour values

- Ink / dark background: `#000000`
- Light background: `#FFFFFF`

## Technical notes

- PNGs were resized with premultiplied alpha to prevent edge halos.
- Hidden RGB was colour-bled in transparent masters so later resizing is safer.
- Small favicons use a simplified high-contrast rendering with slight optical boldening.
- SVGs are simplified vector traces optimized for small display sizes; the PNG masters retain the original hand-drawn texture and grey tie shading.
- Maskable icons keep the mascot inside the central safe zone. The safe-zone guide appears only in the preview, not in the exported icon.
