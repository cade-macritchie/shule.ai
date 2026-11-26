"""shule brand textures, generated procedurally and seamless (they tile on every edge).

Outputs PBR map sets under out/<material>/:  basecolor, normal (OpenGL, +Y up), roughness, height, [opacity]
  stained_glass      2048x2048  angular leaded panes in the brand palette (opacity: glass 1, lead 0)
  wood_planks        2048x2048  warm honey-walnut planks, grain along X
  wood_beam          2048x320   one chamfered timber beam with iron pegs, tiles horizontally (a border)
  chalkboard         2048x2048  used slate: grain, eraser sweeps, ghost writing, chalk dust

Usage: python gen_textures.py [--size 2048] [--seed 7] [--out out]
"""
from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

BRAND = {
    "coral": "#C8402B", "butter": "#FFD27A", "violet": "#5B3E8F", "blush": "#FBE3DA",
    "rose": "#E9A08F", "deep": "#1B2B5B", "warm": "#FFF8F3",
}


def hex_rgb(h: str) -> np.ndarray:
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)], dtype=np.float32)


# ---------------------------------------------------------------- periodic noise
def periodic_noise(h: int, w: int, rng: np.random.Generator, scale: float, aniso: tuple[float, float] = (1, 1)) -> np.ndarray:
    """Band-limited noise that tiles exactly: white noise low-passed in frequency space.
    scale = feature size in pixels; aniso stretches features (e.g. (8,1) = long along X)."""
    fy = np.fft.fftfreq(h)[:, None] * aniso[1]
    fx = np.fft.fftfreq(w)[None, :] * aniso[0]
    f2 = fx ** 2 + fy ** 2
    spec = np.fft.fft2(rng.standard_normal((h, w))) * np.exp(-f2 * (np.pi * scale) ** 2)
    n = np.real(np.fft.ifft2(spec))
    n -= n.mean()
    return (n / (n.std() + 1e-8)).astype(np.float32)


def fbm(h, w, rng, scale, octaves=4, aniso=(1, 1), gain=0.5):
    out = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        out += amp * periodic_noise(h, w, rng, scale / 2 ** o, aniso)
        tot += amp
        amp *= gain
    return out / tot


def normal_from_height(hgt: np.ndarray, strength: float) -> np.ndarray:
    """Tangent-space normal map (OpenGL convention), wrap-around differences so it tiles."""
    dx = (np.roll(hgt, -1, 1) - np.roll(hgt, 1, 1)) * 0.5
    dy = (np.roll(hgt, -1, 0) - np.roll(hgt, 1, 0)) * 0.5
    n = np.stack([-dx * strength, dy * strength, np.ones_like(hgt)], -1)
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return n * 0.5 + 0.5


def save(img: np.ndarray, path: Path, mode: str | None = None):
    path.parent.mkdir(parents=True, exist_ok=True)
    a = np.clip(img, 0, 1)
    if a.ndim == 2:
        Image.fromarray((a * 65535).astype(np.uint16) if mode == "16" else (a * 255).astype(np.uint8)).save(path)
    else:
        Image.fromarray((a * 255 + 0.5).astype(np.uint8)).save(path)


# ---------------------------------------------------------------- stained glass
def stained_glass(size: int, rng: np.random.Generator, cells: int = 24, split_share: float = 0.6):
    """Seamless Voronoi panes (straight, angular edges), about half of them cut again by a diagonal line
    so the leading zigzags; brand-colored glass with mottling, pour gradients and seeds; rounded lead came."""
    S = size
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
    pts = rng.random((cells, 2)).astype(np.float32)
    f1 = np.full((S, S), 9.0, np.float32); f2 = np.full((S, S), 9.0, np.float32)
    cid = np.zeros((S, S), np.int32)
    for i, (px, py) in enumerate(pts):
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                d = np.sqrt((xx - px - ox) ** 2 + (yy - py - oy) ** 2)
                closer = d < f1
                f2 = np.where(closer, f1, np.minimum(f2, d))
                cid = np.where(closer, i, cid)
                f1 = np.where(closer, d, f1)
    edge = (f2 - f1) * 0.5 * S                       # ≈ pixel distance to the nearest Voronoi edge

    # cut some panes with a straight line through their seed at a random angle (diagonal, jagged look)
    ids = cid.copy()
    for i, (px, py) in enumerate(pts):
        if rng.random() > split_share:
            continue
        a = rng.uniform(0, np.pi)
        nx, ny = np.cos(a), np.sin(a)
        off = rng.uniform(-0.25, 0.25) / np.sqrt(cells)
        dxw = (xx - px + 0.5) % 1 - 0.5; dyw = (yy - py + 0.5) % 1 - 0.5     # wrapped offset to the seed
        sd = (dxw * nx + dyw * ny - off) * S
        m = cid == i
        ids = np.where(m & (sd > 0), ids + cells, ids)
        edge = np.where(m, np.minimum(edge, np.abs(sd)), edge)

    lead_w = S / 190.0                                    # half-width of the lead came in px
    lead = np.clip(1 - (edge - lead_w) / 1.5, 0, 1)        # 1 on lead, anti-aliased edge
    came = np.clip(1 - edge / lead_w, 0, 1)
    came_h = np.sqrt(np.clip(1 - (1 - came) ** 2, 0, 1))  # rounded profile

    # glass color per pane: brand palette weighted, with hue/value jitter
    pal = [("coral", 3), ("butter", 3), ("violet", 2), ("blush", 2), ("rose", 2), ("cobalt", 1)]
    names = [p for p, w in pal for _ in range(w)]
    BRAND.setdefault("cobalt", "#3557A6")   # a lifted deep blue so blue panes read against the lead
    n_ids = cells * 2
    base = np.stack([hex_rgb(BRAND[names[rng.integers(len(names))]]) for _ in range(n_ids)])
    base = np.clip(base * rng.uniform(0.88, 1.08, (n_ids, 1)) + rng.normal(0, 0.025, (n_ids, 3)), 0, 1)
    col = base[ids]

    # pour gradient across each pane + mottling + slow streaks + seeds (tiny bubbles)
    ang = rng.uniform(0, 2 * np.pi, n_ids).astype(np.float32)
    g = (np.cos(ang)[ids] * xx + np.sin(ang)[ids] * yy) * 6.0
    pour = 0.9 + 0.12 * np.sin(g * np.pi + rng.uniform(0, 6, n_ids)[ids])
    mottle = 1 + 0.10 * fbm(S, S, rng, S / 18, 4)
    streak = 1 + 0.06 * periodic_noise(S, S, rng, S / 60, (10, 1))
    seeds = np.clip(periodic_noise(S, S, rng, 1.2) - 3.2, 0, 1) * 1.5
    rim = np.clip(edge / (lead_w * 5), 0, 1) * 0.18 + 0.82          # glass darkens slightly near the lead
    glass = col * (pour * mottle * streak * rim)[..., None] + seeds[..., None] * 0.35
    glass = np.clip(glass, 0, 1)

    lead_col = hex_rgb(BRAND["deep"]) * 0.55 + 0.04
    lead_tex = lead_col * (0.85 + 0.15 * came_h[..., None]) * (1 + 0.08 * fbm(S, S, rng, 6, 3))[..., None]
    basecolor = glass * (1 - lead[..., None]) + lead_tex * lead[..., None]

    height = 0.25 + 0.04 * mottle + 0.65 * came_h * lead
    rough = np.where(lead > 0.5, 0.42 + 0.08 * fbm(S, S, rng, 8, 3), 0.06 + 0.04 * (mottle - 1))
    opacity = 1 - lead
    return {"basecolor": basecolor, "normal": normal_from_height(height, 9.0), "roughness": np.clip(rough, 0, 1),
            "height": np.clip(height, 0, 1), "opacity": opacity}


# ---------------------------------------------------------------- wood
WOOD_LIGHT, WOOD_MID, WOOD_DARK = hex_rgb("#D3A06A"), hex_rgb("#A8703F"), hex_rgb("#5C3820")


def grain(h, w, rng, rings_per_tile: int, warp_px: float, fiber=0.18):
    """Periodic flat-sawn grain running along X: warped ring bands + fine fibers + pores."""
    yy = np.mgrid[0:h, 0:w][0].astype(np.float32)
    warp = fbm(h, w, rng, w / 3, 3, aniso=(14, 1)) * warp_px + fbm(h, w, rng, w / 24, 2, aniso=(10, 1)) * warp_px * 0.12
    phase = (yy + warp) / h * rings_per_tile          # integer cycles per tile → seamless in Y
    rings = 0.5 + 0.5 * np.sin(2 * np.pi * phase)
    rings = rings ** 3.0 * 0.8 + (0.5 + 0.5 * np.sin(4 * np.pi * phase + 1.3)) ** 6 * 0.25   # latewood + fine lines
    fibers = periodic_noise(h, w, rng, 1.4, (14, 1))
    pores = np.clip(periodic_noise(h, w, rng, 0.9, (5, 1)) - 1.6, 0, 1)
    return np.clip(rings * 0.75 + fibers * fiber * 0.5 + 0.25, 0, 1), pores


def wood_color(t: np.ndarray, tone: float = 0.0) -> np.ndarray:
    t = np.clip(t + tone, 0, 1)[..., None]
    lo = WOOD_LIGHT * (1 - t) + WOOD_MID * t
    return np.where(t > 0.6, WOOD_MID * (1 - (t - 0.6) / 0.4) + WOOD_DARK * ((t - 0.6) / 0.4), lo)


def knot(h, w, cx, cy, r, rng):
    """A knot: concentric rings around (cx, cy), wrapped so it tiles; returns (ring darkness, mask)."""
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx = (xx - cx + w / 2) % w - w / 2; dy = (yy - cy + h / 2) % h - h / 2
    d = np.sqrt((dx / 1.0) ** 2 + (dy * 1.8) ** 2)
    m = np.clip(1 - d / (r * 2.6), 0, 1) ** 1.5
    rings = 0.5 + 0.5 * np.sin(d / (r * 0.18))
    core = np.clip(1 - d / r, 0, 1)
    return np.clip(m * (0.35 + 0.35 * rings) + core * 0.6, 0, 1), m


def wood_planks(size: int, rng: np.random.Generator, planks: int = 4):
    S = size
    ph = S // planks
    base_t = np.zeros((S, S), np.float32); height = np.zeros((S, S), np.float32)
    for p in range(planks):
        t, pores = grain(ph, S, rng, rings_per_tile=int(rng.integers(9, 15)), warp_px=ph * 0.22)
        t = t + rng.uniform(-0.08, 0.08)
        if rng.random() < 0.6:
            k, km = knot(ph, S, rng.uniform(0, S), rng.uniform(0.3, 0.7) * ph, rng.uniform(14, 26) * S / 2048, rng)
            t = np.clip(t * (1 - km * 0.5) + k * 0.8, 0, 1)
        # one butt joint per plank, staggered
        jx = int(rng.uniform(0.15, 0.85) * S)
        xs = np.arange(S)
        joint = np.clip(1 - np.abs(((xs - jx + S / 2) % S) - S / 2) / 2.0, 0, 1)[None, :].repeat(ph, 0)
        ys = np.arange(ph)[:, None].repeat(S, 1)
        groove = np.clip(1 - np.minimum(ys, ph - 1 - ys) / 4.0, 0, 1) ** 0.7
        bevel = np.clip(np.minimum(ys, ph - 1 - ys) / 8.0, 0, 1)
        sl = slice(p * ph, (p + 1) * ph)
        base_t[sl] = np.clip(t * 0.85 + 0.9 * np.maximum(groove, joint) + pores * 0.3, 0, 1)
        height[sl] = 0.5 * bevel * (1 - joint) + 0.03 * t
    col = wood_color(base_t * 0.95)
    col *= (0.92 + 0.08 * fbm(S, S, rng, S / 4, 2))[..., None]            # gentle patina
    rough = np.clip(0.55 + 0.25 * base_t, 0, 1)
    return {"basecolor": col, "normal": normal_from_height(height, 6.0), "roughness": rough, "height": height}


def wood_beam(width: int, height_px: int, rng: np.random.Generator, peg_every: int = 512):
    """A single timber beam: chamfered top/bottom edges, grain along X, iron pegs; tiles horizontally."""
    W, H = width, height_px
    t, pores = grain(H, W, rng, rings_per_tile=6, warp_px=H * 0.35, fiber=0.25)
    for _ in range(2):
        k, km = knot(H, W, rng.uniform(0, W), rng.uniform(0.35, 0.65) * H, rng.uniform(16, 24), rng)
        t = np.clip(t * (1 - km * 0.5) + k * 0.8, 0, 1)
    ys = np.arange(H, dtype=np.float32)[:, None].repeat(W, 1)
    cham = H * 0.12
    edge = np.minimum(ys, H - 1 - ys)
    face = np.clip(edge / cham, 0, 1)
    hgt = 0.35 + 0.45 * face + 0.03 * t
    # worn, darker chamfers
    t = np.clip(t + (1 - face) * 0.25 + pores * 0.3, 0, 1)
    col = wood_color(t * 0.95, tone=0.05)
    col *= (0.88 + 0.12 * face)[..., None]
    # iron pegs (square heads) in deep-blue iron
    xx = np.arange(W, dtype=np.float32)[None, :].repeat(H, 0)
    iron = hex_rgb(BRAND["deep"]) * 0.6
    peg = np.zeros((H, W), np.float32)
    s = H * 0.11
    for cx in np.arange(peg_every / 2, W, peg_every):
        for cy in (H * 0.5,):
            d = np.maximum(np.abs(xx - cx), np.abs(ys - cy))
            m = np.clip((s - d) / 1.5, 0, 1)
            dome = np.clip(1 - (np.sqrt((xx - cx) ** 2 + (ys - cy) ** 2) / (s * 1.3)), 0, 1)
            peg = np.maximum(peg, m)
            hgt = np.where(m > 0, 0.85 + 0.15 * dome, hgt)
    col = col * (1 - peg[..., None]) + iron * peg[..., None] * (0.85 + 0.3 * fbm(H, W, rng, 3, 2))[..., None]
    rough = np.where(peg > 0.5, 0.35, np.clip(0.6 + 0.2 * t, 0, 1))
    return {"basecolor": np.clip(col, 0, 1), "normal": normal_from_height(hgt, 5.0), "roughness": rough, "height": np.clip(hgt, 0, 1)}


# ---------------------------------------------------------------- chalkboard
SLATE = hex_rgb("#1E2A3D")      # blue-black slate (brand-adjacent navy)
CHALK = hex_rgb("#EEEBE3")


def chalkboard(size: int, rng: np.random.Generator, swipes: int = 30, ghost_lines: int = 7):
    """A used slate chalkboard that tiles: fine slate grain, long side-to-side eraser swipes that leave
    a streaky chalk haze, faint half-erased lesson text, and chalk dust specks."""
    import cv2
    from PIL import ImageDraw, ImageFont
    S = size
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32) / S
    grain_f = periodic_noise(S, S, rng, 0.9)
    low = fbm(S, S, rng, S / 3, 3)
    streak = periodic_noise(S, S, rng, 1.8, (30, 1))        # felt-pad streaks, long along X
    haze = np.zeros((S, S), np.float32)

    # eraser swipes: wide horizontal bands with a slow wobble; ends fade (x wraps, so it tiles)
    for _ in range(swipes):
        y0, x0 = rng.random(), rng.random()
        L = rng.uniform(0.25, 0.8); w = rng.uniform(0.035, 0.08)
        amp, ph, k = rng.uniform(0, 0.04), rng.uniform(0, 2 * np.pi), int(rng.integers(1, 3))
        yc = y0 + amp * np.sin(2 * np.pi * k * xx + ph)       # integer k keeps the wobble periodic
        dy = (yy - yc + 0.5) % 1 - 0.5
        t = ((xx - x0) % 1) / L
        ends = np.clip(np.sin(np.pi * np.clip(t, 0, 1)) * 1.6, 0, 1) * (t < 1)
        band = np.clip(1 - np.abs(dy) / w, 0, 1) ** 0.8
        haze += band * ends * rng.uniform(0.05, 0.13)

    # ghost lesson: faint text written in rows, then mostly wiped (rendered on a 3x3 canvas so it wraps)
    big = Image.new("L", (S * 3, S * 3), 0)
    d = ImageDraw.Draw(big)
    lines = ["Amo, amas, amat, amamus, amatis, amant", "a² + b² = c²", "In principio erat Verbum",
             "Thesis → Antithesis → Synthesis", "¾ ÷ ½ = 1½", "Grammar · Logic · Rhetoric",
             "Psalm 119:105", "x = (−b ± √(b²−4ac)) / 2a", "Veritas"]
    font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSerif-Italic.ttf"
    for i in range(ghost_lines):
        fs = int(S * rng.uniform(0.035, 0.055))
        f = ImageFont.truetype(font_path, fs)
        x = S + rng.uniform(0, 0.6) * S
        y = S + (i + rng.uniform(0.1, 0.6)) * S / ghost_lines
        d.text((x, y), lines[int(rng.integers(len(lines)))], fill=int(rng.uniform(110, 200)), font=f)
    arr = np.asarray(big, np.float32) / 255
    ghost = sum(arr[r * S:(r + 1) * S, c * S:(c + 1) * S] for r in range(3) for c in range(3))
    ghost = cv2.GaussianBlur(np.clip(ghost, 0, 1), (0, 0), S / 900 + 0.8)
    rub = np.clip(0.5 * periodic_noise(S, S, rng, S / 50, (10, 1)) + 0.2, 0, 1)   # wiped unevenly along X
    ghost *= rub

    dust = np.clip(periodic_noise(S, S, rng, 0.7) - 2.9, 0, 1) * 2.0
    haze = haze * np.clip(0.68 + 0.32 * streak, 0.2, 1.3)
    haze = np.clip(haze + ghost * 0.16 + dust * 0.35 + 0.025 * (low * 0.5 + 0.5), 0, 0.5)
    slate = SLATE * (1 + 0.05 * low + 0.035 * grain_f)[..., None]
    col = slate * (1 - haze[..., None]) + CHALK * haze[..., None]
    height = 0.5 + 0.03 * grain_f + 0.05 * haze
    rough = np.clip(0.8 + 0.12 * haze + 0.03 * grain_f, 0, 1)
    return {"basecolor": np.clip(col, 0, 1), "normal": normal_from_height(height, 2.5), "roughness": rough, "height": np.clip(height, 0, 1)}

def bake_web(maps: dict, backlit: bool = False) -> np.ndarray:
    """Flat image for websites (no 3D lighting there): base color shaded by the normal map from a soft
    top-left light, plus a little specular on smooth areas. Backlit = light passing through glass."""
    n = maps["normal"] * 2 - 1
    L = np.array([-0.45, 0.55, 0.7], np.float32); L /= np.linalg.norm(L)
    diff = np.clip((n * L).sum(-1), 0, 1)
    H = L + np.array([0, 0, 1], np.float32); H /= np.linalg.norm(H)
    spec = np.clip((n * H).sum(-1), 0, 1) ** 40 * (1 - maps["roughness"]) * 0.5
    col = maps["basecolor"]
    if backlit and "opacity" in maps:
        glow = col * 1.18 + 0.05
        lit = col * (0.55 + 0.6 * diff[..., None])
        op = maps["opacity"][..., None]
        return np.clip(glow * op + lit * (1 - op) + spec[..., None] * (1 - op), 0, 1)
    return np.clip(col * (0.62 + 0.5 * diff[..., None]) + spec[..., None], 0, 1)


def write_set(name: str, maps: dict, out: Path):
    save(bake_web(maps, backlit=name == "stained_glass"), out / name / f"{name}_web.png")
    for k, v in maps.items():
        save(v, out / name / f"{name}_{k}.png", mode="16" if k == "height" else None)
    print("wrote", out / name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--size", type=int, default=2048)
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--out", default="out")
    a = ap.parse_args()
    out = Path(a.out)
    write_set("stained_glass", stained_glass(a.size, np.random.default_rng(a.seed)), out)
    write_set("wood_planks", wood_planks(a.size, np.random.default_rng(a.seed + 1)), out)
    write_set("wood_beam", wood_beam(a.size, max(160, a.size * 5 // 32), np.random.default_rng(a.seed + 2), peg_every=a.size // 4), out)
    write_set("chalkboard", chalkboard(a.size, np.random.default_rng(a.seed + 3)), out)


if __name__ == "__main__":
    main()
