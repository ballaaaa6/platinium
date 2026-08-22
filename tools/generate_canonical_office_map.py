"""Generate the canonical 24x10 office map GLB and small reference-derived textures.

The map is intentionally authored as ordinary glTF geometry.  The supplied
reference artwork is cropped only for the decorative window, picture, and
emblem panels; it is never used as a full-scene background.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path
from typing import Iterable

from PIL import Image


GRID_COLUMNS = 24
GRID_ROWS = 10
FLOOR_MIN_X = -12.0
FLOOR_MAX_X = 12.0
FLOOR_MIN_Z = -5.0
FLOOR_MAX_Z = 5.0
TOP_DOOR_X = -4.5  # C08
BOTTOM_DOOR_X = 8.5  # C21
DOOR_WIDTH = 1.0


MATERIALS = [
    ("floor-base", (0.84, 0.80, 0.75, 1.0), None),
    ("floor-seam", (0.56, 0.53, 0.49, 1.0), None),
    ("wall-white", (0.91, 0.88, 0.83, 1.0), None),
    ("stripe-red", (0.86, 0.025, 0.025, 1.0), None),
    ("trim-charcoal", (0.045, 0.05, 0.06, 1.0), None),
    ("door-dark", (0.035, 0.045, 0.055, 1.0), None),
    ("window-art", (1.0, 1.0, 1.0, 1.0), "canonical_window.png"),
    ("picture-left", (1.0, 1.0, 1.0, 1.0), "canonical_picture_left.png"),
    ("picture-right", (1.0, 1.0, 1.0, 1.0), "canonical_picture_right.png"),
    ("emblem-art", (1.0, 1.0, 1.0, 1.0), "canonical_emblem.png"),
    ("window-glint", (0.88, 0.96, 1.0, 1.0), None),
]


def align4(value: int) -> int:
    return (value + 3) & ~3


def padded_chunk(chunk_type: int, payload: bytes, pad_byte: bytes) -> bytes:
    padded_length = align4(len(payload))
    return struct.pack("<II", padded_length, chunk_type) + payload + pad_byte * (padded_length - len(payload))


def crop_reference_images(reference_dir: Path, output_dir: Path) -> None:
    source = Image.open(reference_dir / "default_office_24x10_corrected.png").convert("RGB")

    # These are deliberately small, local decorative crops.  The floor and
    # wall field are authored from geometry and materials below.
    crops = {
        "canonical_window.png": (146, 52, 214, 112),
        "canonical_picture_left.png": (652, 52, 742, 112),
        "canonical_picture_right.png": (1020, 52, 1112, 112),
        "canonical_emblem.png": (480, 27, 551, 88),
    }

    output_dir.mkdir(parents=True, exist_ok=True)
    for name, box in crops.items():
        crop = source.crop(box)
        if name == "canonical_emblem.png":
            crop = remove_border_background(crop)
        crop.save(output_dir / name, format="PNG", optimize=True)


def remove_border_background(image: Image.Image) -> Image.Image:
    """Make only the connected pale border transparent, preserving the ball."""

    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    queue = []
    visited = set()

    for x in range(width):
        queue.extend([(x, 0), (x, height - 1)])
    for y in range(height):
        queue.extend([(0, y), (width - 1, y)])

    while queue:
        x, y = queue.pop()
        if (x, y) in visited or not (0 <= x < width and 0 <= y < height):
            continue
        visited.add((x, y))
        r, g, b, _ = pixels[x, y]
        if min(r, g, b) < 215 or max(r, g, b) - min(r, g, b) > 18:
            continue
        pixels[x, y] = (r, g, b, 0)
        queue.extend(((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))

    return rgba


class GeometryBuilder:
    def __init__(self) -> None:
        self.groups = {
            name: {"positions": [], "normals": [], "uvs": [], "indices": []}
            for name, _, _ in MATERIALS
        }
        self.box_count = 0

    def add_box(
        self,
        material: str,
        center: tuple[float, float, float],
        size: tuple[float, float, float],
        rotation_z: float = 0.0,
    ) -> None:
        group = self.groups[material]
        cx, cy, cz = center
        sx, sy, sz = (value / 2.0 for value in size)
        cos_z = math.cos(rotation_z)
        sin_z = math.sin(rotation_z)

        faces = [
            ((0.0, 0.0, 1.0), [(-sx, -sy, sz), (sx, -sy, sz), (sx, sy, sz), (-sx, sy, sz)]),
            ((0.0, 0.0, -1.0), [(sx, -sy, -sz), (-sx, -sy, -sz), (-sx, sy, -sz), (sx, sy, -sz)]),
            ((-1.0, 0.0, 0.0), [(-sx, -sy, -sz), (-sx, -sy, sz), (-sx, sy, sz), (-sx, sy, -sz)]),
            ((1.0, 0.0, 0.0), [(sx, -sy, sz), (sx, -sy, -sz), (sx, sy, -sz), (sx, sy, sz)]),
            ((0.0, 1.0, 0.0), [(-sx, sy, sz), (sx, sy, sz), (sx, sy, -sz), (-sx, sy, -sz)]),
            ((0.0, -1.0, 0.0), [(-sx, -sy, -sz), (sx, -sy, -sz), (sx, -sy, sz), (-sx, -sy, sz)]),
        ]
        face_uvs = [(0.0, 1.0), (1.0, 1.0), (1.0, 0.0), (0.0, 0.0)]

        for normal, corners in faces:
            base = len(group["positions"]) // 3
            nx, ny, nz = normal
            rotated_normal = (cos_z * nx - sin_z * ny, sin_z * nx + cos_z * ny, nz)
            for (lx, ly, lz), (u, v) in zip(corners, face_uvs):
                x = cos_z * lx - sin_z * ly + cx
                y = sin_z * lx + cos_z * ly + cy
                group["positions"].extend((x, y, lz + cz))
                group["normals"].extend(rotated_normal)
                group["uvs"].extend((u, v))
            group["indices"].extend((base, base + 1, base + 2, base, base + 2, base + 3))

        self.box_count += 1

    def add_wall_segments(
        self,
        material: str,
        y: float,
        height: float,
        z: float,
        depth: float,
        door_x: float,
    ) -> None:
        door_min = door_x - DOOR_WIDTH / 2.0
        door_max = door_x + DOOR_WIDTH / 2.0
        left_width = door_min - FLOOR_MIN_X
        right_width = FLOOR_MAX_X - door_max
        if left_width > 0:
            self.add_box(material, ((FLOOR_MIN_X + door_min) / 2.0, y, z), (left_width, height, depth))
        if right_width > 0:
            self.add_box(material, ((door_max + FLOOR_MAX_X) / 2.0, y, z), (right_width, height, depth))


def add_floor(builder: GeometryBuilder) -> None:
    builder.add_box("floor-base", (0.0, -0.08, 0.0), (24.0, 0.16, 10.0))

    seam_width = 0.018
    for column in range(GRID_COLUMNS + 1):
        x = FLOOR_MIN_X + column
        builder.add_box("floor-seam", (x, 0.012, 0.0), (seam_width, 0.022, 10.0))
    for row in range(GRID_ROWS + 1):
        z = FLOOR_MIN_Z + row
        builder.add_box("floor-seam", (0.0, 0.013, z), (24.0, 0.024, seam_width))


def add_top_wall(builder: GeometryBuilder) -> None:
    z = FLOOR_MIN_Z - 0.16
    builder.add_wall_segments("wall-white", 1.72, 1.95, z, 0.32, TOP_DOOR_X)
    builder.add_wall_segments("wall-white", 0.18, 0.32, z, 0.32, TOP_DOOR_X)
    builder.add_wall_segments("stripe-red", 0.53, 0.30, z - 0.015, 0.36, TOP_DOOR_X)
    builder.add_wall_segments("trim-charcoal", 0.34, 0.10, z - 0.03, 0.38, TOP_DOOR_X)
    builder.add_wall_segments("trim-charcoal", 2.70, 0.12, z, 0.34, TOP_DOOR_X)

    add_top_door(builder, TOP_DOOR_X, z)

    for column in (3, 4, 5, 20, 21, 22):
        x = column - (GRID_COLUMNS / 2.0 + 0.5)
        builder.add_box("trim-charcoal", (x, 1.88, z + 0.20), (0.98, 0.88, 0.12))
        builder.add_box("window-art", (x, 1.88, z + 0.285), (0.74, 0.63, 0.035))

    for x, material in ((-2.5, "picture-left"), (3.5, "picture-right")):
        builder.add_box("trim-charcoal", (x, 1.74, z + 0.20), (1.42, 0.94, 0.12))
        builder.add_box(material, (x, 1.74, z + 0.285), (1.15, 0.68, 0.035))

    builder.add_box("trim-charcoal", (TOP_DOOR_X, 2.99, z + 0.20), (0.86, 0.72, 0.12))
    builder.add_box("emblem-art", (TOP_DOOR_X, 2.99, z + 0.285), (0.70, 0.58, 0.035))


def add_top_door(builder: GeometryBuilder, x: float, z: float) -> None:
    front_z = z + 0.25
    builder.add_box("wall-white", (x, 0.92, front_z - 0.04), (1.26, 1.92, 0.20))
    builder.add_box("trim-charcoal", (x, 0.92, front_z + 0.10), (0.86, 1.70, 0.08))
    builder.add_box("door-dark", (x, 0.92, front_z + 0.16), (0.70, 1.50, 0.045))
    builder.add_box("stripe-red", (x - 0.52, 0.92, front_z + 0.18), (0.13, 1.88, 0.08))
    builder.add_box("stripe-red", (x + 0.52, 0.92, front_z + 0.18), (0.13, 1.88, 0.08))
    builder.add_box("stripe-red", (x, 1.82, front_z + 0.18), (1.17, 0.13, 0.08))
    builder.add_box("trim-charcoal", (x, 0.12, front_z + 0.18), (1.17, 0.10, 0.08))


def add_bottom_wall(builder: GeometryBuilder) -> None:
    z = FLOOR_MAX_Z + 0.16
    builder.add_wall_segments("wall-white", 0.36, 0.68, z, 0.32, BOTTOM_DOOR_X)
    builder.add_wall_segments("stripe-red", 0.51, 0.22, z + 0.02, 0.36, BOTTOM_DOOR_X)
    builder.add_wall_segments("trim-charcoal", 0.18, 0.10, z + 0.03, 0.38, BOTTOM_DOOR_X)
    builder.add_wall_segments("trim-charcoal", 0.76, 0.10, z, 0.36, BOTTOM_DOOR_X)

    front_z = z + 0.24
    x = BOTTOM_DOOR_X
    builder.add_box("wall-white", (x, 0.57, front_z - 0.03), (1.26, 1.14, 0.20))
    builder.add_box("trim-charcoal", (x, 0.58, front_z + 0.10), (0.86, 1.00, 0.08))
    builder.add_box("door-dark", (x, 0.58, front_z + 0.16), (0.70, 0.82, 0.045))
    builder.add_box("stripe-red", (x - 0.52, 0.58, front_z + 0.18), (0.13, 1.10, 0.08))
    builder.add_box("stripe-red", (x + 0.52, 0.58, front_z + 0.18), (0.13, 1.10, 0.08))
    builder.add_box("stripe-red", (x, 1.10, front_z + 0.18), (1.17, 0.13, 0.08))


def create_gltf(builder: GeometryBuilder) -> dict:
    material_indices = {name: index for index, (name, _, _) in enumerate(MATERIALS)}
    materials = []
    textures = []
    images = []

    for index, (name, color, texture_uri) in enumerate(MATERIALS):
        pbr = {
            "baseColorFactor": list(color),
            "metallicFactor": 0.0,
            "roughnessFactor": 0.86,
        }
        material = {
            "name": name,
            "pbrMetallicRoughness": pbr,
            "doubleSided": False,
        }
        if texture_uri:
            image_index = len(images)
            texture_index = len(textures)
            images.append({"uri": texture_uri, "name": texture_uri})
            textures.append({"sampler": 0, "source": image_index})
            pbr["baseColorTexture"] = {"index": texture_index}
        materials.append(material)

    binary = bytearray()
    buffer_views = []
    accessors = []

    def append_bytes(data: bytes, target: int | None = None) -> int:
        while len(binary) % 4:
            binary.append(0)
        offset = len(binary)
        binary.extend(data)
        view = {"buffer": 0, "byteOffset": offset, "byteLength": len(data)}
        if target is not None:
            view["target"] = target
        buffer_views.append(view)
        return len(buffer_views) - 1

    meshes = []
    primitives = []
    for material_name, group in builder.groups.items():
        if not group["indices"]:
            continue
        position_data = struct.pack(f"<{len(group['positions'])}f", *group["positions"])
        normal_data = struct.pack(f"<{len(group['normals'])}f", *group["normals"])
        uv_data = struct.pack(f"<{len(group['uvs'])}f", *group["uvs"])
        index_data = struct.pack(f"<{len(group['indices'])}I", *group["indices"])

        position_view = append_bytes(position_data, 34962)
        normal_view = append_bytes(normal_data, 34962)
        uv_view = append_bytes(uv_data, 34962)
        index_view = append_bytes(index_data, 34963)

        def add_accessor(view: int, component_type: int, count: int, accessor_type: str, minimum=None, maximum=None) -> int:
            accessor = {
                "bufferView": view,
                "componentType": component_type,
                "count": count,
                "type": accessor_type,
            }
            if minimum is not None:
                accessor["min"] = minimum
            if maximum is not None:
                accessor["max"] = maximum
            accessors.append(accessor)
            return len(accessors) - 1

        position_values = list(zip(*(iter(group["positions"]),) * 3))
        position_accessor = add_accessor(
            position_view,
            5126,
            len(position_values),
            "VEC3",
            [min(point[index] for point in position_values) for index in range(3)],
            [max(point[index] for point in position_values) for index in range(3)],
        )
        normal_accessor = add_accessor(normal_view, 5126, len(group["normals"]) // 3, "VEC3")
        uv_accessor = add_accessor(uv_view, 5126, len(group["uvs"]) // 2, "VEC2")
        index_accessor = add_accessor(index_view, 5125, len(group["indices"]), "SCALAR")

        primitives.append({
            "attributes": {
                "POSITION": position_accessor,
                "NORMAL": normal_accessor,
                "TEXCOORD_0": uv_accessor,
            },
            "indices": index_accessor,
            "material": material_indices[material_name],
        })

    meshes.append({"name": "CanonicalOfficeMap", "primitives": primitives})
    return {
        "asset": {"version": "2.0", "generator": "generate_canonical_office_map.py"},
        "scene": 0,
        "scenes": [{"name": "Canonical Office 24x10", "nodes": [0]}],
        "nodes": [{"name": "Canonical Office 24x10 Map", "mesh": 0}],
        "meshes": meshes,
        "materials": materials,
        "textures": textures,
        "images": images,
        "samplers": [{"magFilter": 9728, "minFilter": 9728, "wrapS": 33071, "wrapT": 33071}],
        "accessors": accessors,
        "bufferViews": buffer_views,
        "buffers": [{"byteLength": len(binary)}],
    }, bytes(binary)


def write_glb(path: Path, document: dict, binary: bytes) -> None:
    json_bytes = json.dumps(document, separators=(",", ":"), ensure_ascii=False).encode("utf-8")
    json_chunk = padded_chunk(0x4E4F534A, json_bytes, b" ")
    bin_chunk = padded_chunk(0x004E4942, binary, b"\0")
    total_length = 12 + len(json_chunk) + len(bin_chunk)
    path.write_bytes(struct.pack("<4sII", b"glTF", 2, total_length) + json_chunk + bin_chunk)


def build_map(output_dir: Path, reference_dir: Path) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    crop_reference_images(reference_dir, output_dir)

    builder = GeometryBuilder()
    add_floor(builder)
    add_top_wall(builder)
    add_bottom_wall(builder)
    document, binary = create_gltf(builder)
    write_glb(output_dir / "default_office.glb", document, binary)

    return {
        "grid": {"columns": GRID_COLUMNS, "rows": GRID_ROWS, "world_units_per_tile": 1.0},
        "doors": {"top": "C08,R01", "bottom": "C21,R10"},
        "walls": {"top": True, "bottom": True, "left": False, "right": False},
        "materials": len(MATERIALS),
        "boxes": builder.box_count,
        "primitives": len(document["meshes"][0]["primitives"]),
        "textures": [image["uri"] for image in document["images"]],
        "glb_bytes": (output_dir / "default_office.glb").stat().st_size,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--reference-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    args = parser.parse_args()
    summary = build_map(args.output_dir, args.reference_dir)
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
