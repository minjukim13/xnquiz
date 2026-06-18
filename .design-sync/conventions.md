## XN Design System — how to build with it

A Toss-style, white-mode design system for a Korean university LMS quiz product (Canvas Classic Quizzes). All copy is Korean. Components are the real shipped React parts (shadcn-style, built on Radix + class-variance-authority), bundled at `window.XN`.

### Setup & wrapping

- **Link one stylesheet**: `styles.css`. It `@import`s the tokens, the Pretendard font (`@font-face`, loaded from CDN), and the component styles (`_ds_bundle.css`). No other CSS is needed.
- **Most components need no provider** — import and use directly.
- **Tooltip** must be wrapped in `TooltipProvider` (once, high in the tree).
- **Toast** is `position: fixed` (bottom-right). Render it at the app root, not inside a transformed/clipped container.
- Overlays (`Dialog`, `AlertDialog`, `Sheet`, `Popover`, `DropdownMenu`) portal to `document.body` and manage their own open state via the trigger.

### Styling idiom — Tailwind utility classes mapped to semantic tokens

Style your own layout glue with the design system's **semantic tokens**, never hardcoded hex. They exist both as Tailwind utilities (in `_ds_bundle.css`) and as CSS variables (`var(--token)`):

| Purpose | Utility class | CSS var |
|---|---|---|
| Brand blue (primary action) | `bg-primary` / `text-primary` | `--primary` |
| Primary hover | `hover:bg-primary-hover` | `--primary-hover` |
| Soft blue background | `bg-accent` / `text-accent-foreground` | `--accent` |
| Title / body text | `text-foreground` | `--foreground` |
| Secondary text | `text-secondary-foreground` | `--secondary-foreground` |
| Caption / weak text | `text-muted-foreground` | `--muted-foreground` |
| Page background | `bg-background` | `--background` |
| Gray surface | `bg-secondary` / `bg-muted` | `--secondary` / `--muted` |
| Card / popover surface | `bg-card` | `--card` |
| Border | `border-border` | `--border` |
| Danger | `text-destructive` | `--destructive` |

Radius: cards use `rounded-xl` (12px), buttons `rounded-lg` (8px).

**Buttons**: always use `<Button>` with a `variant` (`default` = brand blue, `outline`, `secondary`, `soft`, `ghost`, `destructive`, `link`) and `size` (`sm` / `default` / `lg`). Do not restyle a raw `<button>` with `bg-primary`.

**Badges**: `<Badge variant="…">` for generic labels; `<StatusBadge status="open|grading|closed|draft|scheduled">` for quiz status (renders its own Korean label); `<TypeBadge type="multiple_choice|true_false|…">` for question types.

### Where the truth lives

- Tokens + utilities: read `_ds_bundle.css` (reachable via `styles.css`).
- Per-component API and usage: each component's `<Name>.d.ts` (props) and `<Name>.prompt.md` (usage).

### Idiomatic snippet

```jsx
<Card>
  <CardHeader>
    <CardTitle>중간고사 퀴즈</CardTitle>
    <CardDescription>객관식 10문항 · 제한시간 30분</CardDescription>
    <CardAction><StatusBadge status="open" /></CardAction>
  </CardHeader>
  <CardContent>
    <p className="text-secondary-foreground">응시 기간: 6월 20일 09:00 ~ 18:00</p>
  </CardContent>
  <CardFooter>
    <Button size="sm">응시 시작</Button>
  </CardFooter>
</Card>
```
