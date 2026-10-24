"""NOVA logo kit masters: the Flare mark (a ring broken at 3 and 9 o'clock, NOVA's visor beam passing through), the NOVA wordmark built as paths,
lockups, colour versions and the social/token artwork. Run: python3 build.py  (writes into kit/)."""
import os

# monochrome edition: the beam is pure white on dark and carbon on light; no colour in the mark
INK, PAPER, BEAM, BG = "#F3F0E7", "#2A2529", "#F3F0E7", "#2A2529"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kit")
os.makedirs(OUT, exist_ok=True)


def f(v):
    return f"{v:.2f}".rstrip("0").rstrip(".")


def pill(x0, x1, yc, h):
    r = h / 2
    return f"M{f(x0 + r)} {f(yc - r)}H{f(x1 - r)}A{f(r)} {f(r)} 0 0 1 {f(x1 - r)} {f(yc + r)}H{f(x0 + r)}A{f(r)} {f(r)} 0 0 1 {f(x0 + r)} {f(yc - r)}Z"


def corners(m, L, t, size=256):
    out = []
    for sx, sy in [(1, 1), (-1, 1), (1, -1), (-1, -1)]:
        x = m if sx == 1 else size - m
        y = m if sy == 1 else size - m
        out.append(f"M{x} {y}H{x + sx * L}V{y + sy * t}H{x + sx * t}V{y + sy * L}H{x}Z")
    return "".join(out)


def flare(R, r, g, bh, x0, x1, c=128):
    """Ring (outer R, inner r) cut open at both sides where the beam passes, with a gap g above/below the beam centre."""
    import math
    o, i = math.sqrt(R * R - g * g), math.sqrt(r * r - g * g)
    top = f"M{f(c - o)} {f(c - g)}A{R} {R} 0 0 1 {f(c + o)} {f(c - g)}L{f(c + i)} {f(c - g)}A{r} {r} 0 0 0 {f(c - i)} {f(c - g)}Z"
    bot = f"M{f(c - o)} {f(c + g)}A{R} {R} 0 0 0 {f(c + o)} {f(c + g)}L{f(c + i)} {f(c + g)}A{r} {r} 0 0 1 {f(c - i)} {f(c + g)}Z"
    return {"frame": top + bot, "visor": pill(x0, x1, c, bh)}


# master symbol on a 256 grid: ring 26 thick (R96/r70), opened 26 above and below centre; the beam is a 28-high pill
SYM = flare(96, 70, 26, 28, 16, 240)
# small-size cut for 16-32 px: a heavier ring and beam and wider openings, so nothing closes up
SMALL = flare(104, 68, 32, 42, 6, 250)


def word(x0=0):
    """NOVA in heavy geometric caps on a 128-unit cap height (y 64..192), stroke 30; the O echoes the visor pill."""
    s, top, bot, p = 30, 64, 192, []
    # N
    x = x0
    p += [f"M{x} {top}H{x + s}V{bot}H{x}Z", f"M{x + 86} {top}H{x + 116}V{bot}H{x + 86}Z", f"M{x} {top}H{x + s}L{x + 116} {bot}H{x + 86}Z"]
    # O: a stadium ring, the same rounded form as the visor
    x += 116 + 22
    p.append(f"M{x + 64} {top}H{x + 64}A64 64 0 0 1 {x + 64} {bot}A64 64 0 0 1 {x + 64} {top}Z"
             f"M{x + 64} {top + s}A34 34 0 0 0 {x + 64} {bot - s}A34 34 0 0 0 {x + 64} {top + s}Z")
    # V
    x += 128 + 18
    p.append(f"M{x} {top}H{x + 32}L{x + 61} {bot - 40}L{x + 90} {top}H{x + 122}L{x + 78} {bot}H{x + 44}Z")
    # A
    x += 122 + 14
    p.append(f"M{x + 44} {top}H{x + 78}L{x + 122} {bot}H{x + 90}L{x + 61} {top + 40}L{x + 32} {bot}H{x}Z")
    p.append(f"M{x + 34} {bot - 46}H{x + 88}V{bot - 22}H{x + 34}Z")
    return p, x + 122


def svg(w, h, body, title="NOVA"):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><title>{title}</title>{body}</svg>\n'


def mark(parts, frame, visor, dx=0, dy=0, k=1):
    t = f' transform="translate({f(dx)} {f(dy)}) scale({f(k)})"' if (dx or dy or k != 1) else ""
    return f'<g{t}><path d="{parts["frame"]}" fill="{frame}"/><path d="{parts["visor"]}" fill="{visor}"/></g>'


def wordmark(fill, dx=0, dy=0, k=1):
    paths, w = word()
    t = f' transform="translate({f(dx)} {f(dy)}) scale({f(k)})"'
    return "".join(f'<path d="{d}" fill="{fill}" fill-rule="evenodd"{t}/>' for d in paths), w


def write(name, text):
    open(os.path.join(OUT, name), "w").write(text)


# symbol: black master, colour on dark, colour on light, small cut
write("nova-symbol.svg", svg(256, 256, mark(SYM, "#000", "#000")))
write("nova-symbol-small.svg", svg(256, 256, mark(SMALL, "#000", "#000")))
write("nova-symbol-dark.svg", svg(256, 256, mark(SYM, INK, BEAM)))
write("nova-symbol-light.svg", svg(256, 256, mark(SYM, PAPER, PAPER)))

# wordmark alone
_, WW = word()
ww, _ = wordmark("#000", 0, -64)
write("nova-wordmark.svg", svg(WW, 128, ww))

# horizontal lockup: symbol, then the wordmark at 0.62 of the symbol height, optically centred
K = 0.62
GAP = 40


def horizontal(frame, visor, text):
    wm, _ = wordmark(text, 256 + GAP, 128 - 128 * K, K)
    return svg(int(256 + GAP + WW * K) + 16, 256, mark(SYM, frame, visor) + wm)


write("nova-horizontal.svg", horizontal("#000", "#000", "#000"))
write("nova-horizontal-dark.svg", horizontal(INK, BEAM, INK))
write("nova-horizontal-light.svg", horizontal(PAPER, PAPER, PAPER))


# stacked lockup
def stacked(frame, visor, text):
    W = max(256, int(WW * 0.7))
    wm, _ = wordmark(text, (W - WW * 0.7) / 2, 256 + 8 - 64 * 0.7, 0.7)
    return svg(W, 256 + 8 + 96, mark(SYM, frame, visor, (W - 256) / 2, 0) + wm)


write("nova-stacked.svg", stacked("#000", "#000", "#000"))
write("nova-stacked-dark.svg", stacked(INK, BEAM, INK))

# token logo / X avatar: full-bleed dark square, mark at 62 % so a circle crop keeps every corner
write("nova-token.svg", svg(800, 800, f'<rect width="800" height="800" fill="{BG}"/>' + mark(SYM, INK, BEAM, 400 - 128 * 2.15, 400 - 128 * 2.15, 2.15)))

# X banner 1500x500: the HUD frame language at banner scale, lockup on the left third
wm, _ = wordmark(INK, 120 + 256 * 0.9 + 44, 250 - 128 * 0.62 * 0.9, 0.62 * 0.9)
banner = (f'<rect width="1500" height="500" fill="{BG}"/>'
          + mark(SYM, INK, BEAM, 120, 250 - 128 * 0.9, 0.9) + wm
          + f'<path d="M1180 40h60v8h-52v52h-8z M1460 460h-60v-8h52v-52h8z" fill="{BEAM}"/>'
          + f'<path d="{pill(1150, 1460, 250, 8)}" fill="#262624"/><path d="{pill(1150, 1290, 250, 8)}" fill="{INK}"/>')
write("nova-x-banner.svg", svg(1500, 500, banner))
print("wrote", sorted(os.listdir(OUT)))

# favicon / app icon in brand colours: the small-size cut on a dark rounded tile
write("nova-favicon.svg", svg(256, 256, f'<rect width="256" height="256" rx="56" fill="{BG}"/>' + mark(SMALL, INK, BEAM, 128 - 128 * 0.86, 128 - 128 * 0.86, 0.86)))
