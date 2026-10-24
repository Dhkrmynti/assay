# NOVA logo: usage guide

**Idea:** Flare. A ring (the new star, the "nova") broken open at 3 and 9 o'clock, with NOVA's visor beam passing straight through it.

## Files
| Use | File |
|---|---|
| Token logo (Pons launch, Dex, CoinGecko) | `png/nova-token-800.png` |
| X profile photo | `png/nova-x-avatar-400.png` |
| X header | `png/nova-x-banner-1500x500.png` |
| Logo on dark (site, posts) | `nova-horizontal-dark.svg`, `png/nova-horizontal-dark-1200.png` |
| Logo on light | `nova-horizontal-light.svg`, `png/nova-horizontal-light-1200.png` |
| Stacked | `nova-stacked-dark.svg`, `nova-stacked.svg` |
| Symbol only | `nova-symbol-dark.svg`, `nova-symbol-light.svg`, `nova-symbol.svg` (black master) |
| Wordmark only | `nova-wordmark.svg` |
| One colour | `web/nova-symbol-black.svg`, `web/nova-symbol-white.svg` |
| Favicon and web icons | `web/` (favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512, site.webmanifest) |

Edit `../build.py` and run `python3 build.py` to rebuild every master.

## Colour
| Name | HEX | Use |
|---|---|---|
| Cream | `#F3F0E7` | The mark and text on dark |
| Plum charcoal | `#2A2529` | Main background, and the mark on light backgrounds |

Two colours only. Status colours (green for OK, red for flags) appear in the product UI, never in the mark.

## Rules
- **Clear space:** keep at least two ring thicknesses (52/256 of the symbol) empty around the logo.
- **Minimum size:** the master symbol works down to 32 px. Below that, use the small-size cut (`nova-symbol-small.svg`), which the favicon already uses. The horizontal lockup needs at least 120 px of width.
- **Backgrounds:** Void or Carbon give the brand look. Light backgrounds are fine with the light version. Avoid busy photos behind the symbol.
- **Don't:**
  - add colour to the mark;
  - rotate the mark;
  - shorten the beam inside the ring;
  - close the gaps in the ring;
  - add glows or shadows to the master files.

## Note
A ring crossed by a horizontal bar is a familiar shape, the London Underground roundel being the best known. The open ring and the rounded beam set NOVA's mark apart, but run a trademark search before registering it.

## Type
The wordmark is custom geometric caps built as paths, so no font licence is needed. The site pairs it with Inter Tight for headings, Inter for text and JetBrains Mono for labels. All three are open fonts.
