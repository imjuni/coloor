# Coloor

A color shade generator and native OKLCH/LCH explorer built with Astro and React.

## Requirements

- Node.js 22.12 or newer
- pnpm 10 or newer

## Development

```sh
pnpm install
pnpm dev
```

## Code quality

The project uses Ultracite with Oxlint and Oxfmt.

```sh
pnpm check
pnpm fix
```

`check` runs Astro's type checker followed by Ultracite's formatting and lint checks.

## Build and deploy

```sh
pnpm build
pnpm preview
pnpm artifact
```

The Astro site is configured for Cloudflare Pages at `https://coloor.pages.dev/`.
Use `dist` as the Pages build output directory. `pnpm artifact` creates
`coloor.zip` from a clean production build when a compressed upload is needed.

## OKLCH / LCH explorer

The OKLCH page uses native React components and the existing Color.js dependency.
It includes CSS color parsing and conversion, alpha, sRGB/P3/Rec.2020 gamut
visualization, an interactive 3D gamut model, undo/redo, persistent display settings,
and shareable color URLs. No iframe, vendored picker application, or separate
picker build is required.

- `src/components/oklch/`: inputs, preview, charts, 3D canvas, and styles
- `src/hooks/use-picker.ts`: React state, history, settings, and URL synchronization
- `src/utils/oklch.ts`: parsing, conversion, gamut mapping, and numeric expressions
- `src/utils/gamut.ts`: chart coordinates and sampled gamut boundaries
- `src/components/oklch/gamut.worker.ts`: background chart and mesh calculations

Run `pnpm test:picker` for color conversion, gamut, URL, expression, and history
tests. The 3D renderer is loaded on demand. Gamut surfaces are sampled and their
on-screen colors depend on the display's capabilities; numeric output uses Color.js.
