"""Build shule_assets.blend: three PBR materials (marked as assets) and a lancet stained-glass window
framed in timber, then render the window on a transparent background for the website.

Run with Blender's Python:   blender -b -P build_blend.py -- [--samples 96] [--res 1200]
or with the bpy module:      python build_blend.py [--samples 96] [--res 1200]
Textures are read from ./out/<material>/ (made by gen_textures.py) with relative paths.
"""
import argparse
import math
import os
import sys

import bpy  # noqa: E402  (bpy first: it makes bmesh importable)
import bmesh  # noqa: E402

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument("--samples", type=int, default=96)
ap.add_argument("--res", type=int, default=1200)
ap.add_argument("--out", default=os.path.join(HERE, "render"))
args = ap.parse_args(argv)


def tex_path(mat, kind):
    return os.path.join(HERE, "out", mat, f"{mat}_{kind}.png")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


def image_node(nodes, mat, kind, non_color=False, loc=(0, 0)):
    n = nodes.new("ShaderNodeTexImage")
    n.image = bpy.data.images.load(tex_path(mat, kind), check_existing=True)
    n.image.filepath = bpy.path.relpath(tex_path(mat, kind)) if bpy.data.filepath else tex_path(mat, kind)
    if non_color:
        n.image.colorspace_settings.name = "Non-Color"
    n.location = loc
    n.label = kind
    return n


def pbr_material(name, mat_dir, glass=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree; nodes, links = nt.nodes, nt.links
    bsdf = nodes["Principled BSDF"]
    out = nodes["Material Output"]
    uv = nodes.new("ShaderNodeTexCoord"); uv.location = (-1100, 0)
    mapping = nodes.new("ShaderNodeMapping"); mapping.location = (-900, 0)
    links.new(uv.outputs["UV"], mapping.inputs["Vector"])
    base = image_node(nodes, mat_dir, "basecolor", loc=(-600, 300))
    rough = image_node(nodes, mat_dir, "roughness", True, (-600, 0))
    norm = image_node(nodes, mat_dir, "normal", True, (-600, -300))
    nmap = nodes.new("ShaderNodeNormalMap"); nmap.location = (-300, -300)
    for t in (base, rough, norm):
        links.new(mapping.outputs["Vector"], t.inputs["Vector"])
    links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
    links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
    links.new(norm.outputs["Color"], nmap.inputs["Color"])
    links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
    if glass:
        # Backlit stained glass: panes emit their own color (light coming through), the lead stays an
        # opaque, slightly glossy metal. Opacity map: 1 = glass, 0 = lead.
        op = image_node(nodes, mat_dir, "opacity", True, (-600, -600))
        links.new(mapping.outputs["Vector"], op.inputs["Vector"])
        emit = nodes.new("ShaderNodeEmission"); emit.location = (0, 300)
        emit.inputs["Strength"].default_value = 1.35
        links.new(base.outputs["Color"], emit.inputs["Color"])
        mix = nodes.new("ShaderNodeMixShader"); mix.location = (300, 100)
        links.new(op.outputs["Color"], mix.inputs["Fac"])
        links.new(bsdf.outputs["BSDF"], mix.inputs[1])
        links.new(emit.outputs["Emission"], mix.inputs[2])
        links.new(mix.outputs["Shader"], out.inputs["Surface"])
        bsdf.inputs["Metallic"].default_value = 0.6
    m.asset_mark()
    m.asset_data.description = f"shule brand material: {name}"
    for tag in ("shule", "brand", "glass" if glass else "wood"):
        m.asset_data.tags.new(tag)
    return m


# ---------------------------------------------------------------- geometry
def lancet_outline(w, h, segs=48):
    """Rectangle with a semicircular head: bottom-left → bottom-right → up the right side → arc → down."""
    r = w / 2
    pts = [(-r, 0), (r, 0), (r, h - r)]
    for i in range(1, segs):
        a = math.pi * i / segs
        pts.append((r * math.cos(a), h - r + r * math.sin(a)))
    pts.append((-r, h - r))
    return pts


def offset_outline(pts, d):
    """Offset a closed convex outline outward by d (miter by averaging edge normals)."""
    n = len(pts); out = []
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        e1 = (p1[0] - p0[0], p1[1] - p0[1]); e2 = (p2[0] - p1[0], p2[1] - p1[1])
        n1 = (e1[1], -e1[0]); n2 = (e2[1], -e2[0])
        l1 = math.hypot(*n1) or 1; l2 = math.hypot(*n2) or 1
        nx, ny = n1[0] / l1 + n2[0] / l2, n1[1] / l1 + n2[1] / l2
        ln = math.hypot(nx, ny) or 1
        cos_half = (n1[0] * n2[0] / (l1 * l2) + n1[1] * n2[1] / (l1 * l2) + 1) / 2
        k = d / max(math.sqrt(max(cos_half, 1e-4)), 0.3)
        out.append((p1[0] + nx / ln * k, p1[1] + ny / ln * k))
    return out


def make_glass(pts, mat, z=0.0):
    me = bpy.data.meshes.new("Glass"); bm = bmesh.new()
    vs = [bm.verts.new((x, 0, y)) for x, y in pts]
    bm.faces.new(vs)
    uv = bm.loops.layers.uv.new()
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    s = max(w, h)
    for f in bm.faces:
        for l in f.loops:
            l[uv].uv = ((l.vert.co.x - min(xs)) / s * 1.1, (l.vert.co.z - min(ys)) / s * 1.1)
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new("Glass", me); ob.data.materials.append(mat)
    bpy.context.collection.objects.link(ob)
    return ob


def make_frame(inner, width, depth, mat, name="Frame"):
    """Timber ring around the outline; U runs along the perimeter so the beam grain follows the frame."""
    outer = offset_outline(inner, width)
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    iv = [bm.verts.new((x, 0, y)) for x, y in inner]
    ov = [bm.verts.new((x, 0, y)) for x, y in outer]
    uv = bm.loops.layers.uv.new()
    n = len(inner); run = 0.0
    lengths = [math.dist(inner[i], inner[(i + 1) % n]) for i in range(n)]
    total = sum(lengths)
    for i in range(n):
        j = (i + 1) % n
        f = bm.faces.new((iv[i], iv[j], ov[j], ov[i]))
        u0 = run / total * 3; u1 = (run + lengths[i]) / total * 3
        for l, (u, v) in zip(f.loops, ((u0, 0.15), (u1, 0.15), (u1, 0.85), (u0, 0.85))):
            l[uv].uv = (u, v)
        run += lengths[i]
    bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat)
    bpy.context.collection.objects.link(ob)
    sol = ob.modifiers.new("Solidify", "SOLIDIFY"); sol.thickness = depth; sol.offset = 0
    bev = ob.modifiers.new("Bevel", "BEVEL"); bev.width = width * 0.12; bev.segments = 2; bev.limit_method = "ANGLE"
    return ob


def make_bar(x0, y0, x1, y1, width, depth, mat, name):
    """A straight timber bar from (x0,y0) to (x1,y1) in the window plane, UV along its length."""
    bpy.ops.mesh.primitive_cube_add(size=1)
    ob = bpy.context.active_object; ob.name = name
    length = math.dist((x0, y0), (x1, y1))
    ob.scale = (length, depth, width)
    ob.location = ((x0 + x1) / 2, 0, (y0 + y1) / 2)
    ob.rotation_euler = (0, -math.atan2(y1 - y0, x1 - x0), 0)
    bpy.ops.object.transform_apply(scale=True, rotation=False, location=False)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.uv.cube_project(cube_size=length); bpy.ops.object.mode_set(mode="OBJECT")
    ob.data.materials.append(mat)
    bev = ob.modifiers.new("Bevel", "BEVEL"); bev.width = width * 0.12; bev.segments = 2
    return ob


# ---------------------------------------------------------------- build
reset()
scene = bpy.context.scene
glass_mat = pbr_material("shule Stained Glass", "stained_glass", glass=True)
beam_mat = pbr_material("shule Wood Beam", "wood_beam")
plank_mat = pbr_material("shule Wood Planks", "wood_planks")

W, H = 1.6, 3.4                                  # window opening (metres)
FW, FD = 0.16, 0.12                              # frame width / depth
inner = lancet_outline(W, H)
glass = make_glass(inner, glass_mat)
frame = make_frame(inner, FW, FD, beam_mat)
mull = make_bar(0, 0, 0, H - 0.02, FW * 0.55, FD * 0.8, plank_mat, "Mullion")
transom = make_bar(-W / 2, H - W / 2, W / 2, H - W / 2, FW * 0.55, FD * 0.8, plank_mat, "Transom")
sill = make_bar(-W / 2 - FW * 1.6, -FW * 0.75, W / 2 + FW * 1.6, -FW * 0.75, FW * 1.3, FD * 2.2, beam_mat, "Sill")

# put the window in a collection and mark it as an asset you can drag into other scenes
col = bpy.data.collections.new("shule Lancet Window")
scene.collection.children.link(col)
for ob in (glass, frame, mull, transom, sill):
    for c in ob.users_collection:
        c.objects.unlink(ob)
    col.objects.link(ob)
col.asset_mark(); col.asset_data.description = "Timber-framed lancet window with shule stained glass"
col.asset_data.tags.new("shule")

# a small plank swatch so the planks material has a preview object in the file
bpy.ops.mesh.primitive_plane_add(size=1.2, location=(3, 0, 1.2), rotation=(math.pi / 2, 0, 0))
sw = bpy.context.active_object; sw.name = "Plank Swatch"; sw.data.materials.append(plank_mat)

# camera, light, render
cam_data = bpy.data.cameras.new("Cam"); cam_data.type = "ORTHO"; cam_data.ortho_scale = H + 0.9
cam = bpy.data.objects.new("Cam", cam_data); scene.collection.objects.link(cam)
cam.location = (0, -10, H / 2 - 0.05); cam.rotation_euler = (math.pi / 2, 0, 0)
scene.camera = cam
key = bpy.data.lights.new("Key", "AREA"); key.energy = 450; key.size = 5
ko = bpy.data.objects.new("Key", key); ko.location = (-3, -5, 4); ko.rotation_euler = (math.radians(55), 0, math.radians(-30))
scene.collection.objects.link(ko)
back = bpy.data.lights.new("Back", "AREA"); back.energy = 300; back.size = 4
bo = bpy.data.objects.new("Back", back); bo.location = (0, 3, H / 2); bo.rotation_euler = (math.radians(90), 0, math.radians(180))
scene.collection.objects.link(bo)
world = bpy.data.worlds.new("World"); scene.world = world; world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (1.0, 0.97, 0.94, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.35

scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.cycles.use_denoising = True
scene.render.film_transparent = True
scene.render.resolution_x = int(args.res * (W + FW * 4) / (H + 0.9)) + 120
scene.render.resolution_y = args.res
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Medium High Contrast"
cam_data.ortho_scale = H + 0.9
cam_data.sensor_fit = "VERTICAL"

os.makedirs(args.out, exist_ok=True)
blend_path = os.path.join(HERE, "shule_assets.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend_path, relative_remap=True)
bpy.ops.file.make_paths_relative()
bpy.ops.wm.save_mainfile()
scene.render.filepath = os.path.join(args.out, "lancet_window.png")
bpy.ops.render.render(write_still=True)
print("saved", blend_path, "and", scene.render.filepath)
