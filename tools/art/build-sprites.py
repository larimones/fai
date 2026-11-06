#!/usr/bin/env python3
"""Turns the owner's art into the mascot's sprite sheet (ADR-0013).

Reads the source GIF, removes its white background, adds a white sticker
outline, scales every frame to the same box and writes a sheet PNG plus an
Aseprite "JSON (Array)" file into the renderer's assets.

Usage (from the repository root):
    python3 tools/art/build-sprites.py [--preview-dir DIR]
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageSequence

ROOT = Path(__file__).resolve().parents[2]
SOURCE_GIF = ROOT / "resources" / "art" / "fai-idle-flap-source.gif"
OUTPUT_DIR = ROOT / "src" / "renderer" / "src" / "assets"
SHEET_PNG = OUTPUT_DIR / "fai-sheet.png"
SHEET_JSON = OUTPUT_DIR / "fai-sheet.json"

# Twice the mascot window (188x160 logical pixels), for screens up to 200% (ADR-0013).
FRAME_WIDTH, FRAME_HEIGHT = 376, 320
SHEET_COLUMNS = 4

# Background: near-white pixels connected to the image border.
BACKGROUND_MIN_CHANNEL = 230
BACKGROUND_MAX_SPREAD = 14
# White sticker outline, in source pixels.
OUTLINE_RADIUS = 7

# Animations by name: (source GIF frame index, duration in ms). Loop or play-once is decided
# by the app per name; this list only says which frames and for how long.
ANIMATIONS: list[tuple[str, list[tuple[int, int]]]] = [
    ("idle", [(index, 160) for index in range(8)]),
    # Provisional: the smiling blink, once and slower than in idle.
    ("react", [(3, 240), (4, 240), (5, 240)]),
    # Provisional: wings up, held still while being carried.
    ("dragged", [(0, 1000)]),
]


def remove_background(frame: Image.Image) -> Image.Image:
    """Makes the white area connected to the border transparent; white inside the drawing stays."""
    width, height = frame.size
    near_white = Image.new("L", frame.size)
    near_white.putdata(
        [
            255 if min(p) >= BACKGROUND_MIN_CHANNEL and max(p) - min(p) <= BACKGROUND_MAX_SPREAD else 0
            for p in frame.getdata()
        ]
    )
    border = [(x, y) for x in range(width) for y in (0, height - 1)]
    border += [(x, y) for y in range(height) for x in (0, width - 1)]
    for point in border:
        if near_white.getpixel(point) == 255:
            ImageDraw.floodfill(near_white, point, 128, thresh=0)
    alpha = near_white.point(lambda value: 0 if value == 128 else 255)
    result = frame.convert("RGBA")
    result.putalpha(alpha)
    return result


def add_outline(frame: Image.Image) -> Image.Image:
    """Puts the frame on a white silhouette grown by OUTLINE_RADIUS, with a soft edge."""
    grown = frame.getchannel("A")
    for _ in range(OUTLINE_RADIUS):
        grown = grown.filter(ImageFilter.MaxFilter(3))
    grown = grown.filter(ImageFilter.GaussianBlur(1))
    result = Image.new("RGBA", frame.size, (255, 255, 255, 0))
    result.putalpha(grown)
    result.alpha_composite(frame)
    return result


def fit_to_frame(image: Image.Image) -> Image.Image:
    """Scales to fit FRAME_WIDTH x FRAME_HEIGHT, centered and standing on the bottom edge."""
    scale = min(FRAME_WIDTH / image.width, FRAME_HEIGHT / image.height)
    size = (round(image.width * scale), round(image.height * scale))
    # Premultiplied alpha keeps the removed white background from bleeding into the edges.
    scaled = image.convert("RGBa").resize(size, Image.LANCZOS).convert("RGBA")
    frame = Image.new("RGBA", (FRAME_WIDTH, FRAME_HEIGHT), (0, 0, 0, 0))
    frame.alpha_composite(scaled, ((FRAME_WIDTH - size[0]) // 2, FRAME_HEIGHT - size[1]))
    return frame


def load_source_frames() -> list[Image.Image]:
    gif = Image.open(SOURCE_GIF)
    cut = [remove_background(frame.convert("RGB")) for frame in ImageSequence.Iterator(gif)]
    # One crop box for every frame, so the drawing does not jump between frames.
    boxes = [frame.getchannel("A").getbbox() for frame in cut]
    left = min(box[0] for box in boxes) - OUTLINE_RADIUS - 2
    top = min(box[1] for box in boxes) - OUTLINE_RADIUS - 2
    right = max(box[2] for box in boxes) + OUTLINE_RADIUS + 2
    bottom = max(box[3] for box in boxes) + OUTLINE_RADIUS + 2
    return [fit_to_frame(add_outline(frame.crop((left, top, right, bottom)))) for frame in cut]


def build_sheet(source: list[Image.Image]) -> tuple[Image.Image, dict]:
    entries = [(name, index, duration) for name, frames in ANIMATIONS for index, duration in frames]
    rows = -(-len(entries) // SHEET_COLUMNS)
    sheet = Image.new("RGBA", (SHEET_COLUMNS * FRAME_WIDTH, rows * FRAME_HEIGHT), (0, 0, 0, 0))
    frames = []
    for position, (name, index, duration) in enumerate(entries):
        x = (position % SHEET_COLUMNS) * FRAME_WIDTH
        y = (position // SHEET_COLUMNS) * FRAME_HEIGHT
        sheet.alpha_composite(source[index], (x, y))
        frames.append(
            {
                "filename": f"{name} {index}",
                "frame": {"x": x, "y": y, "w": FRAME_WIDTH, "h": FRAME_HEIGHT},
                "rotated": False,
                "trimmed": False,
                "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_WIDTH, "h": FRAME_HEIGHT},
                "sourceSize": {"w": FRAME_WIDTH, "h": FRAME_HEIGHT},
                "duration": duration,
            }
        )
    tags, start = [], 0
    for name, animation_frames in ANIMATIONS:
        tags.append({"name": name, "from": start, "to": start + len(animation_frames) - 1, "direction": "forward"})
        start += len(animation_frames)
    metadata = {
        "frames": frames,
        "meta": {
            "app": "tools/art/build-sprites.py",
            "version": "1",
            "image": SHEET_PNG.name,
            "format": "RGBA8888",
            "size": {"w": sheet.width, "h": sheet.height},
            "scale": "1",
            "frameTags": tags,
        },
    }
    return sheet, metadata


def write_previews(sheet: Image.Image, metadata: dict, directory: Path) -> None:
    """Each animation as an animated WebP, on a dark and a light background, at window size."""
    directory.mkdir(parents=True, exist_ok=True)
    window = (FRAME_WIDTH // 2, FRAME_HEIGHT // 2)
    for background_name, color in (("dark", (30, 30, 50)), ("light", (238, 238, 242))):
        for tag in metadata["meta"]["frameTags"]:
            images, durations = [], []
            for entry in metadata["frames"][tag["from"] : tag["to"] + 1]:
                box = entry["frame"]
                frame = sheet.crop((box["x"], box["y"], box["x"] + box["w"], box["y"] + box["h"]))
                canvas = Image.new("RGBA", frame.size, color + (255,))
                canvas.alpha_composite(frame)
                images.append(canvas.convert("RGB").resize(window, Image.LANCZOS))
                durations.append(entry["duration"])
            images[0].save(
                directory / f"{tag['name']}-{background_name}.webp",
                save_all=True,
                append_images=images[1:],
                duration=durations,
                loop=0,
                lossless=True,
            )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--preview-dir", type=Path, help="also write animated previews here (outside the repo)")
    arguments = parser.parse_args()

    sheet, metadata = build_sheet(load_source_frames())
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    sheet.save(SHEET_PNG, optimize=True)
    SHEET_JSON.write_text(json.dumps(metadata, indent=2) + "\n", encoding="utf-8")
    print(f"{SHEET_PNG.relative_to(ROOT)}: {sheet.width}x{sheet.height}, {len(metadata['frames'])} frames")
    if arguments.preview_dir is not None:
        write_previews(sheet, metadata, arguments.preview_dir)
        print(f"previews: {arguments.preview_dir}")


if __name__ == "__main__":
    main()
