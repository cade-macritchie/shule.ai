"""Build shule_bell.blend: a polished brass school hand bell with a turned walnut handle (lathe-modelled),
studio-lit, and render it on a transparent background for the website hero.

Run with Blender's Python:   blender -b -P build_bell.py -- [--samples 64] [--res 1400]
or with the bpy module:      python build_bell.py [--samples 64] [--res 1400]
Everything is procedural; no texture files needed. Materials and the bell collection are marked as assets.
"""
import argparse
import math
import os
import sys

import bpy  # noqa: E402  (bpy first: it makes bmesh importable)
import bmesh  # noqa: E402
from mathutils import Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
ap = argparse.ArgumentParser()
ap.add_argument("--samples", type=int, default=64)
ap.add_argument("--res", type=int, default=1400, help="output height in px (width is 4/5 of it)")
ap.add_argument("--out", default=os.path.join(HERE, "render"))
ap.add_argument("--no-render", action="store_true")
ap.add_argument("--shadow", action="store_true", help="add a shadow catcher under the bell (default: none; use CSS)")
args = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c) + (1.0,)


# ---------------------------------------------------------------- geometry
def lathe(name, profile, mat, steps=160, subsurf=2):
    """Spin a closed (r, z) profile around Z. Points on the axis (r=0) are welded."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    vs = [bm.verts.new((r, 0, z)) for r, z in profile]
    edges = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + edges, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=steps, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me)
    ob.data.materials.append(mat)
    if subsurf:
        m = ob.modifiers.new("Smooth", "SUBSURF"); m.levels = m.render_levels = subsurf
    return ob


# A hand bell, bell mouth at z=0, about 1 unit tall; the profile runs inner axis -> lip bead -> outer -> axis.
BELL = [(0.0, 0.975), (0.12, 0.97), (0.30, 0.925), (0.42, 0.84), (0.47, 0.72), (0.505, 0.57), (0.585, 0.41),
        (0.715, 0.24), (0.845, 0.11), (0.915, 0.04), (0.945, 0.0),
        (0.975, -0.018), (1.025, -0.012), (1.05, 0.025), (1.035, 0.07),          # rolled lip (sound bow)
        (0.985, 0.115), (0.855, 0.25), (0.715, 0.42), (0.63, 0.58), (0.59, 0.74), (0.545, 0.875),
        (0.455, 0.975), (0.31, 1.035), (0.15, 1.062), (0.0, 1.068)]
# brass ferrule that the handle seats into
FERRULE = [(0.0, 1.04), (0.2, 1.04), (0.205, 1.075), (0.18, 1.09), (0.165, 1.12), (0.18, 1.15), (0.175, 1.175), (0.0, 1.175)]
# turned walnut handle: bead, neck, swelling grip, rounded cap
HANDLE = [(0.0, 1.17), (0.125, 1.17), (0.14, 1.20), (0.125, 1.235), (0.085, 1.27), (0.075, 1.36), (0.082, 1.48),
          (0.105, 1.66), (0.122, 1.86), (0.124, 2.0), (0.112, 2.11), (0.122, 2.15), (0.118, 2.19), (0.09, 2.25),
          (0.05, 2.285), (0.0, 2.295)]


def ring(name, r, minor, z, mat):
    bm = bmesh.new()
    bmesh.ops.create_circle(bm, segments=24, radius=minor)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(r, 0, z))
    bmesh.ops.spin(bm, geom=bm.verts[:] + bm.edges[:], cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=160, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(name, me); ob.data.materials.append(mat)
    return ob


def clapper(mat):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=0.02, radius2=0.02, depth=0.62)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, 0.64))
    ball = bmesh.ops.create_uvsphere(bm, u_segments=32, v_segments=16, radius=0.085)
    bmesh.ops.translate(bm, verts=ball["verts"], vec=(0, 0, 0.28))
    me = bpy.data.meshes.new("Clapper"); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new("Clapper", me); ob.data.materials.append(mat)
    return ob


# ---------------------------------------------------------------- materials
def brass():
    m = bpy.data.materials.new("Polished brass")
    m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; L = nt.links
    b = n["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb("#E0AE4C")
    b.inputs["Metallic"].default_value = 1.0
    # faint hand-polish variation in roughness so reflections aren't CG-perfect
    tc = n.new("ShaderNodeTexCoord"); noise = n.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6.0; noise.inputs["Detail"].default_value = 8.0
    L.new(tc.outputs["Object"], noise.inputs["Vector"])
    ramp = n.new("ShaderNodeMapRange")
    ramp.inputs["To Min"].default_value = 0.13; ramp.inputs["To Max"].default_value = 0.27
    L.new(noise.outputs["Fac"], ramp.inputs["Value"])
    L.new(ramp.outputs["Result"], b.inputs["Roughness"])
    m.asset_mark(); m.asset_data.description = "Polished brass with subtle roughness variation"
    return m


def iron():
    m = bpy.data.materials.new("Dark iron")
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb("#3A332C"); b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = 0.42
    return m


def walnut():
    m = bpy.data.materials.new("Turned walnut")
    m.use_nodes = True
    nt = m.node_tree; n = nt.nodes; L = nt.links
    b = n["Principled BSDF"]
    tc = n.new("ShaderNodeTexCoord")
    mp = n.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (1.0, 1.0, 0.18)
    L.new(tc.outputs["Object"], mp.inputs["Vector"])
    wave = n.new("ShaderNodeTexWave")                 # growth rings along the turning axis
    wave.wave_type = "RINGS"; wave.rings_direction = "Z"
    wave.inputs["Scale"].default_value = 9.0; wave.inputs["Distortion"].default_value = 6.0
    wave.inputs["Detail"].default_value = 3.0; wave.inputs["Detail Scale"].default_value = 1.5
    L.new(mp.outputs["Vector"], wave.inputs["Vector"])
    ramp = n.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].color = srgb("#2A1409"); ramp.color_ramp.elements[1].color = srgb("#5E3216")
    L.new(wave.outputs["Fac"], ramp.inputs["Fac"])
    L.new(ramp.outputs["Color"], b.inputs["Base Color"])
    b.inputs["Roughness"].default_value = 0.5
    b.inputs["Coat Weight"].default_value = 0.15; b.inputs["Coat Roughness"].default_value = 0.25
    m.asset_mark(); m.asset_data.description = "Oiled, lacquered walnut for turned parts"
    return m


BRASS, IRON, WALNUT = brass(), iron(), walnut()

col = bpy.data.collections.new("School bell"); scene.collection.children.link(col)
rig = bpy.data.objects.new("Bell", None); col.objects.link(rig)
parts = [lathe("Bell body", BELL, BRASS), lathe("Ferrule", FERRULE, BRASS), lathe("Handle", [(r * 1.3, z) for r, z in HANDLE], WALNUT),
         ring("Shoulder bead", 0.555, 0.014, 0.86, BRASS), ring("Waist bead", 0.735, 0.012, 0.40, BRASS),
         clapper(IRON)]
for p in parts:
    col.objects.link(p); p.parent = rig
# Tip the bell toward the viewer so the mouth and clapper read, and turn it a touch for a three-quarter view.
rig.rotation_euler = (math.radians(-16), math.radians(-26), 0)
col.asset_mark(); col.asset_data.description = "Brass school hand bell with turned walnut handle"
bpy.context.view_layer.update()

# ---------------------------------------------------------------- staging
pts = [p.matrix_world @ Vector(c) for p in parts for c in p.bound_box]
zmin = min(v.z for v in pts); zmax = max(v.z for v in pts)
cx = (min(v.x for v in pts) + max(v.x for v in pts)) / 2
if args.shadow:
    bpy.ops.mesh.primitive_plane_add(size=12, location=(0, 0, zmin))
    floor = bpy.context.active_object; floor.name = "Shadow catcher"; floor.is_shadow_catcher = True


def area(name, loc, size, power, color=(1, 1, 1), shape="RECTANGLE", size_y=None, target=(0, 0, 1.0)):
    d = bpy.data.lights.new(name, "AREA"); d.energy = power; d.color = color; d.shape = shape
    d.size = size; d.size_y = size_y or size
    o = bpy.data.objects.new(name, d); scene.collection.objects.link(o); o.location = loc
    o.rotation_euler = (Vector(target) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    return o


area("Key softbox", (-3.2, -3.0, 3.4), 3.5, 1000, (1.0, 0.95, 0.88))
area("Rim strip", (3.0, 2.2, 2.6), 0.6, 600, (1.0, 0.9, 0.78), size_y=4.0)
area("Top", (0.3, 0.6, 5.0), 2.5, 300)
area("Low fill", (2.5, -3.5, 0.2), 2.0, 140, (1.0, 0.82, 0.7))

# Big soft cards seen only in reflections: they give polished brass its broad highlights.
for name, loc, rot, s, strength in [("Card L", (-2.6, -0.6, 1.2), (0, math.radians(70), 0), (2.2, 3.6), 3.0),
                                    ("Card R", (2.4, -1.4, 1.4), (0, math.radians(-75), 0), (1.0, 3.6), 2.0)]:
    bpy.ops.mesh.primitive_plane_add(size=1, location=loc, rotation=rot)
    c = bpy.context.active_object; c.name = name; c.scale = (s[0], s[1], 1)
    c.visible_camera = False; c.visible_shadow = False
    em = bpy.data.materials.new(name + " light"); em.use_nodes = True
    nn = em.node_tree.nodes; nn.remove(nn["Principled BSDF"])
    e = nn.new("ShaderNodeEmission"); e.inputs["Strength"].default_value = strength
    em.node_tree.links.new(e.outputs[0], nn["Material Output"].inputs["Surface"])
    c.data.materials.append(em)

# warm studio world: brighter overhead, darker floor (reflected in the lower bell)
world = bpy.data.worlds.new("Studio"); scene.world = world; world.use_nodes = True
wn = world.node_tree.nodes; wl = world.node_tree.links
tc = wn.new("ShaderNodeTexCoord"); sep = wn.new("ShaderNodeSeparateXYZ"); ramp = wn.new("ShaderNodeValToRGB")
wl.new(tc.outputs["Generated"], sep.inputs[0])
wl.new(sep.outputs["Z"], ramp.inputs["Fac"])
ramp.color_ramp.elements[0].position = 0.45; ramp.color_ramp.elements[0].color = srgb("#3A2A22")
ramp.color_ramp.elements[1].position = 0.6; ramp.color_ramp.elements[1].color = srgb("#FFF3E6")
wl.new(ramp.outputs["Color"], wn["Background"].inputs["Color"])
wn["Background"].inputs["Strength"].default_value = 0.55

cam_d = bpy.data.cameras.new("Camera"); cam_d.lens = 85
cam = bpy.data.objects.new("Camera", cam_d); scene.collection.objects.link(cam); scene.camera = cam
target = Vector((cx, 0, (zmin + zmax) / 2))
cam.location = target + Vector((0.6, -9.0, 0.35))
cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()

r = scene.render
r.engine = "CYCLES"; scene.cycles.device = "CPU"
scene.cycles.samples = args.samples; scene.cycles.use_denoising = True
r.film_transparent = True
r.resolution_y = args.res; r.resolution_x = args.res * 4 // 5
r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"
scene.view_settings.view_transform = "AgX"
try:
    scene.view_settings.look = "AgX - Medium High Contrast"
except TypeError:
    pass

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, "shule_bell.blend"))
print("saved shule_bell.blend")
if not args.no_render:
    os.makedirs(args.out, exist_ok=True)
    r.filepath = os.path.join(args.out, "school_bell.png")
    bpy.ops.render.render(write_still=True)
    print("rendered", r.filepath)
