# shule brand assets

Procedural, seamless textures in the brand palette, plus a Blender file.

| Folder / file | What |
|---|---|
| `textures/stained_glass/` | 2048² PBR set: basecolor, normal (OpenGL), roughness, height (16-bit), opacity (glass = white, lead = black) |
| `textures/wood_planks/` | 2048² PBR set: oak planks, grain along X, staggered joints, knots |
| `textures/wood_beam/` | 2048×320 PBR set: one chamfered beam with iron pegs; repeats horizontally |
| `textures/chalkboard/` | 2048² PBR set: used slate with eraser sweeps, faint half-erased lessons (Latin, Trivium, geometry) and chalk dust |
| `shule_bell.blend`, `render/school_bell.png` | Brass school hand bell (materials "Polished brass", "Turned walnut" and the "School bell" collection marked as assets) and its 1400 px transparent render |
| `shule_assets.blend` | Materials "shule Stained Glass / Wood Beam / Wood Planks" and the "shule Lancet Window" collection, all marked as **assets** (Asset Browser → Current File). Texture paths are relative to this folder. |
| `render/lancet_window.png` | 1600 px render of the window on a transparent background |
| `gen_textures.py` | Regenerate: `python gen_textures.py --size 2048 --seed 7 --out textures` (change `--seed` for new layouts) |
| `build_bell.py` | The brass school hand bell (lathe-modelled bell, ferrule, turned walnut handle, clapper) with studio lights: `python build_bell.py --samples 64 --res 1400` writes `shule_bell.blend` and `render/school_bell.png`. Fully procedural; `--shadow` adds a shadow catcher. |
| `build_blend.py` | Rebuild the .blend and the render: `blender -b -P build_blend.py -- --samples 160 --res 1600` (or `python build_blend.py` with `pip install bpy`). It reads `./textures/` (or `./out/`); add `--no-render` to only rebuild the .blend. |

Web-ready versions (WebP, with lighting baked in) are in `apps/web/app/textures/` and are used through
the CSS classes `.tex-glass`, `.tex-wood`, `.tex-chalk`, `.beam-rule` and `.glass-panel`; the bell is `school-bell.webp` (and `-sm`). See `/brand-assets` on the site.
