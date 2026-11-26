# shule brand: Studio + chapel accent

Warm, friendly SaaS at the base, with a few cues from Christian school and seminary identities (stained glass, arches, a serif voice, formation language) used as accents, never as the whole look.
Design canvas: https://claude.ai/artifact/66rExeS9KAQEuRV59DVqrJ (artboard "B+ · Studio, chapel accent").
Code: `apps/web/app/globals.css` (tokens + classes) and `apps/web/components/brand.tsx` (Mark, Logo, Accent, StainedGlass, VERSE).

## Color

| Token | Hex | Use |
|---|---|---|
| Coral | `#C8402B` | primary buttons, the serif accent word, major findings |
| Deep blue | `#1B2B5B` | text, dark surfaces, lead lines in the glass |
| Chapel violet | `#5B3E8F` | secondary accent, used sparingly (eyebrows, one card, verse line) |
| Butter | `#FFD27A` | highlights, "share screen", quick wins |
| Blush | `#FBE3DA` | soft surfaces |
| Warm white | `#FFF8F3` | page background |
| Rose | `#E9A08F` | glass pane only |

Text on coral or violet is white (both pass 4.5:1). Text on butter, blush or warm white is deep blue.

## Type

- **Plus Jakarta Sans** for everything: 800 for headlines with tight tracking, 500–600 for UI, 400 for body.
- **Instrument Serif italic** for **one accent phrase per headline**, never more ("Steward the work behind the *mission.*").

## Shapes and motifs

- **Mark:** a lancet window with four panes (coral, butter, violet, blush) under a round arch. It also reads as a document.
- **Arches:** cards and frames with round tops and small bottom radii (`.arch`, `.arch-sm`). Pill buttons.
- **Stained-glass band:** a few large panes with diagonal, jagged cuts and heavy deep-blue lead lines (`<StainedGlass />`). Use it once per page as a divider, or cropped as a header strip on a card. Don't tile it or use it as a background.

## Voice

- **Use:** steward, calling, formation, mission, serve, faithful, good order, flourishing.
- **Avoid:** hustle, disrupt, crush, 10x, synergy.
- **Headline options:** "Steward the work behind the mission." · "Good order for the work you're called to." · "Faithful in the small things."
- **Optional verse lines** (KJV, public domain), for footers and reports:
  - "Let all things be done decently and in order." 1 Cor. 14:40
  - "He that is faithful in that which is least is faithful also in much." Luke 16:10

## Textures and accents

Files and sources: `brand-assets/` (PBR maps, `shule_assets.blend`, generator scripts). Preview: `/brand-assets` on the site.

- `.tex-glass` (stained glass, tiles seamlessly): frames, card headers, thin dividers. Never put text directly on it; text sits on a warm-white panel.
- `.tex-wood` (oak planks, tiles seamlessly): warm panels such as quotes, testimonials or footers.
- `.beam-rule` (timber beam with iron pegs): a divider or shelf line.
- `.tex-chalk` (slate chalkboard, tiles seamlessly): hero backdrops and lesson-style panels. Chalk-hand lettering only on this surface.
- `school-bell.webp`: the brass hand bell, mid-ring, on a transparent background. **The central motif**: it is the landing hero (over a chalkboard arch) and it "rings" when a constraint is found.
- `lancet-window.webp` and the stained-glass band: secondary accents now (chapel moments, verses), no longer the hero.
- Use one texture per screen.
