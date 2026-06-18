# design-sync NOTES — XN Design System

Repo-specific gotchas for future syncs. Read this before re-syncing.

## Repo shape

- This is a **Vite app** (`xn-quiz-prototype`), not a published component library. There is no `dist/` library entry and no `.d.ts` exports.
- The bundle is built from a **hand-written barrel** `.design-sync/entry.jsx` passed via `--entry`. It re-exports the 18 scoped components (+ their sub-parts) so only those ship, instead of synthesizing over all of `src/`.
- Because there are no `.d.ts` exports, **`componentSrcMap` is the component allowlist** (each entry pins a src path). To add/remove a component: edit BOTH `entry.jsx` (the export) AND `componentSrcMap` (the card + src enrichment).
- Source is **JSX, not TS** → emitted `<Name>.d.ts` prop contracts are minimal. The bundle is fully functional; only the typed API surface is thin.

## CSS / tokens / fonts

- `cfg.cssEntry` points at the **hashed** app build CSS: `dist/assets/index-CWfX-0dw.css`. This file is the compiled Tailwind v4 output (tokens in `--*` + all utility classes). It becomes `_ds_bundle.css`, which `styles.css` `@import`s.
- **The hash changes on every `npm run build`.** After rebuilding the app, update `cfg.cssEntry` to the new `dist/assets/index-*.css` filename or the build will fail to find it.
- **Pretendard** is shipped via a remote CDN `@font-face` in `.design-sync/pretendard.css` (wired through `cfg.extraFonts`). The host app loads Pretendard at runtime via a `<link>`; here it loads from jsDelivr (pinned `pretendard@v1.3.9`, variable woff2). `extractFonts` preserves the https `url()` as-is.

## Component-specific

- **Overlays** (Dialog, AlertDialog, DropdownMenu, Popover, Sheet, Tooltip) use `cfg.overrides.<Name> = {cardMode: single, viewport}`. Their previews render the **forced-open** state (`<Dialog open>`, `<Tooltip open>` inside `TooltipProvider`, etc.).
- **Toast** is `position: fixed` (bottom-right). Its preview wraps it in a `transform: translateZ(0)` frame so the fixed child is contained inside the card instead of escaping off-screen.
- All components currently land in group **`general`** (path-derived grouping hits only generic dirs: `components`, `ui`). Future improvement for a nicer DS pane: add `@category` JSDoc to sources or `docsMap` stubs to split into Actions / Forms / Feedback / Overlays etc.

## Known render warns

- `tokens: 1 missing, below threshold` on validate — non-blocking (a single `var(--*)` referenced but not in the shipped sheet).

## Re-sync risks (what can silently go stale)

- **cssEntry hash**: stale/missing after an app rebuild — update the filename.
- **Pretendard CDN pin** (`v1.3.9`): if jsDelivr path changes, fonts fall back to system. Re-verify the URL on major updates.
- **Barrel ↔ componentSrcMap drift**: a component added to one but not the other won't ship correctly.
- **Thin `.d.ts`** (JS source): the design agent's typed prop contracts are weak by construction; consider a real library build for stronger contracts.
- Previews import from the package specifier `'xn-quiz-prototype'` (mapped to `window.XN`); keep `cfg.pkg`/`globalName` stable or every preview import breaks.
