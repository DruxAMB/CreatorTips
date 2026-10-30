# CreatorTips — Design record

## Source system

**Monzo** — https://styles.refero.design/style/e8a1d114-6924-4f03-acd2-996dd30f15a6
Chosen from a Refero shortlist (Monarch, Monzo, Cake Equity); user picked Monzo.
Theme: light. Register: "warm coral on cool mint paper — confident restraint with a
single hot accent." Adapted, not copied — no Monzo assets, photography, or the
MonzoSans font files are used.

## Token mapping (globals.css)

| Role | Value | Notes |
|---|---|---|
| canvas | `#f2f8f3` | Page Mist |
| card | `#ffffff` | paper card, one step above canvas |
| elevated/inset | `#e3ebe4` | Soft Mint — pills, resolved-handle row, hairlines |
| border-strong | `#b5b9bd` | Fog — input borders, dashed empty state |
| foreground | `#091723` | Midnight Ink — body + CTA fills |
| secondary | `#3b4c54` | Slate |
| steel | `#75817e` | supporting copy (Ash value; see contrast note) |
| coral | `#ff4f40` | Hot Coral — text/heading/product stains only |
| primary | `#091723` | CTAs are ink pills, never coral |
| navy | `#112231` | footer band |
| radii | 4 / 24 / 32 / 64px | badges, inputs, containers, cards; buttons `rounded-full` |
| shadow | `0 0 10px rgba(0,0,0,.1)` | the one permitted shadow (tip card only) |

## Signature moves applied

- Mint canvas + white paper cards, elevation by surface stepping, no card shadows
- Hot Coral as *stain*: headline word, @handles (≥20px bold — the "loud text
  moment" per the Category Link List pattern), wordmark square, input focus ring
- The physical-card-product coral fill: the `tip-card` hero visual is the one
  place Monzo permits a coral surface — used as a literal tip card
- All buttons 500px pills; CTAs Midnight Ink fill (the "Sign Up CTA" pattern);
  claim is an ink outline pill — coral is never a control color
- Navy footer band with BOT Chain wordmark + links + contract address
- Type: body Inter (MonzoSansText substitute) with the brand-defining `-0.05em`
  tracking; display Manrope 600–800 (MonzoSansDisplay substitute); mono kept for
  addresses/hashes only

## Substitutions & deviations

- MonzoSansText → **Inter** (spec's own listed fallback; OFL)
- MonzoSansDisplay → **Manrope** (spec's own listed fallback; OFL)
- Coral `#ff4f40` = 3.3:1 on white — fails 4.5 at small sizes, so coral is
  restricted to large bold text (≥20px, passes 3:1) and decorative marks, matching
  Monzo's own usage anyway. Small supporting text uses Steel/Ash instead.
- `Steel #6b747b` (4.9:1) kept for readable secondary copy; `Ash #75817e` (4.0:1)
  reserved for ≥19px or decorative use.
- No photography: the hero carries the coral tip-card product instead of Monzo's
  lifestyle imagery — honest generative/CSS graphic, same role.

## Contrast (measured)

- ink/canvas 16.8:1 · ink/white 18.1:1 · secondary/white 8.9:1
- steel/white 4.0:1 (used ≥ supporting-copy sizes only) · coral/white 3.3:1
  (large bold only) · white/ink 18.1:1 · white/navy 16.2:1
- success 5.0:1 · warning 5.0:1

## Verified

- `next build` clean; real 375px CDP emulation: scrollWidth 375, zero elements
  past viewport; desktop 1440 screenshot reviewed
