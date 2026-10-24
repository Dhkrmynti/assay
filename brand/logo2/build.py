"""Ocula logo kit, "Watch": a thick lid over one point (an eye on the chain, a new star rising), with a lowercase
"ocula" wordmark drawn as paths. Run: python3 build.py  (writes into kit/)."""
import os

INK, PAPER = "#161514", "#F5F3EC"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "kit")
os.makedirs(OUT, exist_ok=True)
f = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")


def watch(R, r, dot, cx=128, base=156):
    """Half-ring (outer R, inner r) standing on a baseline, a solid point centred on that baseline."""
    lid = f"M{f(cx - R)} {base}A{R} {R} 0 0 1 {f(cx + R)} {base}H{f(cx + r)}A{r} {r} 0 0 0 {f(cx - r)} {base}Z"
    pt = f"M{f(cx - dot)} {base}A{dot} {dot} 0 1 0 {f(cx + dot)} {base}A{dot} {dot} 0 1 0 {f(cx - dot)} {base}Z"
    return lid, pt


SYM = watch(84, 54, 26)            # master: lid 30 thick, point r 26
SMALL = watch(92, 52, 34, base=160)  # 16-32 px cut: heavier lid, bigger point, wider gap kept


def word():
    """lowercase 'ocula' on a 128-unit x-height (y 64..192), ascender to y 20, stroke 26; returns (paths, width)."""
    import math
    t, b, s, p = 64, 192, 26, []
    ring = lambda x: f"M{x} 128A64 64 0 1 0 {x + 128} 128A64 64 0 1 0 {x} 128ZM{x + s} 128A38 38 0 1 1 {x + 128 - s} 128A38 38 0 1 1 {x + s} 128Z"
    x = 0  # o
    p.append(ring(x)); x += 128 + 14
    # c: the o's ring opened on the right between -40° and +40°
    a = math.radians(40); cx = x + 64
    o1 = (cx + 64 * math.cos(a), 128 + 64 * math.sin(a)); o2 = (cx + 64 * math.cos(a), 128 - 64 * math.sin(a))
    i1 = (cx + 38 * math.cos(a), 128 - 38 * math.sin(a)); i2 = (cx + 38 * math.cos(a), 128 + 38 * math.sin(a))
    p.append(f"M{f(o1[0])} {f(o1[1])}A64 64 0 1 1 {f(o2[0])} {f(o2[1])}L{f(i1[0])} {f(i1[1])}A38 38 0 1 0 {f(i2[0])} {f(i2[1])}Z")
    x += 128 + 12
    # u: the n turned over
    p.append(f"M{x} {t}V136A56 56 0 0 0 {x + 112} 136V{t}H{x + 112 - s}V136A30 30 0 0 1 {x + s} 136V{t}Z")
    x += 112 + 16
    # l: one stem to the ascender
    p.append(f"M{x} 20H{x + s}V{b}H{x}Z")
    x += s + 16
    # a: single storey, a ring and a right stem
    p.append(ring(x)); p.append(f"M{x + 128 - s} {t}H{x + 128}V{b}H{x + 128 - s}Z")
    return p, x + 128


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}"><title>ocula</title>{body}</svg>\n'


def mark(parts, fill, dx=0, dy=0, k=1):
    t = f' transform="translate({f(dx)} {f(dy)}) scale({f(k)})"' if (dx or dy or k != 1) else ""
    return f'<g{t} fill="{fill}"><path d="{parts[0]}"/><path d="{parts[1]}"/></g>'


def wordmark(fill, dx=0, dy=0, k=1):
    paths, _ = word()
    return f'<g transform="translate({f(dx)} {f(dy)}) scale({f(k)})" fill="{fill}" fill-rule="evenodd">' + "".join(f'<path d="{d}"/>' for d in paths) + "</g>"


def write(name, text):
    open(os.path.join(OUT, name), "w").write(text)


_, WW = word()
write("ocula-symbol.svg", svg(256, 256, mark(SYM, "#000")))
write("ocula-symbol-small.svg", svg(256, 256, mark(SMALL, "#000")))
write("ocula-symbol-ink.svg", svg(256, 256, mark(SYM, INK)))
write("ocula-symbol-paper.svg", svg(256, 256, mark(SYM, PAPER)))
write("ocula-wordmark.svg", svg(WW, 172, wordmark("#000", 0, -20)))

# horizontal lockup: the lid's baseline sits on the wordmark's baseline; symbol trimmed to its ink (x 44..212, y 72..182)
K = 0.92


def horizontal(fill):
    sx, sy = -44 * 1.0, 192 - 156  # symbol baseline 156 → wordmark baseline 192
    w = int(168 + 48 + WW * K)
    body = mark(SYM, fill, sx, sy - 36) + wordmark(fill, 168 + 48, 192 - 36 - 192 * K + 64 * K - 64 * K, K)
    return svg(w, 220, body)


def horizontal2(fill):
    # one baseline (y=170) for the lid and the letters; the view box is cropped to the ink with even margins
    base = 170
    sym = mark(SYM, fill, -44, base - 156)
    wm = wordmark(fill, 168 + 46, base - 192 * K, K)
    top, bottom, w = min(base - 172 * K, base - 110), base + 26, int(168 + 46 + WW * K) + 2
    pad = 12
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 {f(top - pad)} {w} {f(bottom - top + 2 * pad)}"><title>ocula</title>{sym + wm}</svg>\n'


write("ocula-horizontal.svg", horizontal2("#000"))
write("ocula-horizontal-ink.svg", horizontal2(INK))
write("ocula-horizontal-paper.svg", horizontal2(PAPER))


def stacked(fill):
    W = int(max(168, WW * 0.62)) + 8
    sym = mark(SYM, fill, (W - 256) / 2, -60)
    wm = wordmark(fill, (W - WW * 0.62) / 2, 166 - 20 * 0.62, 0.62)
    return svg(W, 286, sym + wm)


write("ocula-stacked-ink.svg", stacked(INK))

# token logo / X avatar: ink tile, paper mark, sized so a circle crop keeps the lid
write("ocula-token.svg", svg(800, 800, f'<rect width="800" height="800" fill="{INK}"/>' + mark(SYM, PAPER, 400 - 128 * 2.4, 400 - 128 * 2.4 + 12, 2.4)))
# X banner: paper ground, the lockup at left third
write("ocula-x-banner.svg", svg(1500, 500, f'<rect width="1500" height="500" fill="{PAPER}"/>' + mark(SYM, INK, 150 - 44 * 1.1, 250 - 156 * 1.1 + 40, 1.1) + wordmark(INK, 150 + 168 * 1.1 + 50, 250 + 40 - 192 * 0.95, 0.95)))
# favicon: the small cut on a rounded ink tile
write("ocula-favicon.svg", svg(256, 256, f'<rect width="256" height="256" rx="56" fill="{INK}"/>' + mark(SMALL, PAPER, 128 - 128 * 0.84, 128 - 128 * 0.84 + 4, 0.84)))
print("wrote", sorted(os.listdir(OUT)))
