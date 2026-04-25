# Third-Party Licensing Notes

Operational notes for third-party services and embeds used by wealth.Investing.
This is not legal advice — keep the actual contracts on file.

---

## TradingView (`/app/chart`)

We embed TradingView's free Advanced Chart widget on `/app/chart`.

### Constraint: branding visibility is mandatory

The TradingView free embed terms require that the TradingView **logo and
attribution remain visible** to the end user. This applies to both the
inline chart logo and any reasonable click-through to TradingView itself.

**Operational implications:**

- Do **not** hide, mask, crop, or recolor the TradingView watermark / logo
  inside the embed iframe.
- Do **not** wrap the embed in a container that visually obscures the
  attribution row (e.g. via overlapping cards, gradient fades, or
  z-indexed UI chrome).
- Theme overrides via the embed's documented `theme` / `style` props are
  fine — restyling the chrome to remove branding is not.
- If we ever need to ship a deeper TradingView integration without their
  branding, we must move to a paid Charting Library license (separate
  contract + billing). Track in a follow-up sprint.

### Closeout audit (2026-04-25)

`/app/chart` currently uses the public embed iframe with the TradingView
logo intact. No code change needed for this sprint. This file exists so
the constraint is documented and discoverable for future work on the
chart route.

---

## Other third-party embeds

(Add entries below as new third-party widgets / iframes / SDKs are
introduced.)
