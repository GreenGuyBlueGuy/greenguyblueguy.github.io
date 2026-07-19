"""Slice enemy sprite sheets into web GIFs (idle / walk / special)."""
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "images" / "characters"
OUT.mkdir(parents=True, exist_ok=True)

SCALE = 3

# Crawlers: 384x832 → 6x13 grid of 64x64
# Knuckleheads: 480x560 → 6x7 grid of 80x80 (same as players)
ENEMIES = {
    "crawler": {
        "path": Path(
            r"C:\Users\joeli\Documents\snakes-with-fists-(steam-demo)\Game Images"
            r"\02 Enemies Img\GGA_Robot_Character-Sheet.png"
        ),
        "cols": 6,
        "rows": 13,
        # Inferred: row0 ambient/walk-bob, row1 walk, row2 laser attack
        "anims": {
            "idle": {"indices": [0, 1, 2, 3], "duration": 280, "bounce": True},
            "walk": {"indices": list(range(6, 12)), "duration": 130, "bounce": False},
            "special": {"indices": list(range(12, 18)), "duration": 150, "bounce": False},
        },
    },
    "knucklehead": {
        "path": Path(
            r"C:\Users\joeli\Documents\snakes-with-fists-(steam-demo)\Game Images"
            r"\02 Enemies Img\GGA_EnemyBasic_Unarmed_-Sheet.png"
        ),
        "cols": 6,
        "rows": 7,
        # idle 0-1, walk row2 (indices 6-11), punch row3 (indices 12-17)
        "anims": {
            "idle": {"indices": [0, 1], "duration": 300, "bounce": True},
            "walk": {"indices": list(range(6, 12)), "duration": 130, "bounce": False},
            "special": {"indices": list(range(12, 18)), "duration": 150, "bounce": False},
        },
    },
}


def is_empty(frame, threshold=8):
    frame = frame.convert("RGBA")
    extrema = frame.getextrema()
    r, g, b, a = extrema
    return r[1] < threshold and g[1] < threshold and b[1] < threshold


def black_to_transparent(im, thresh=12):
    im = im.convert("RGBA")
    pixels = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r <= thresh and g <= thresh and b <= thresh:
                pixels[x, y] = (0, 0, 0, 0)
    return im


def slice_sheet(path, cols, rows):
    sheet = Image.open(path).convert("RGBA")
    fw, fh = sheet.width // cols, sheet.height // rows
    assert fw * cols == sheet.width and fh * rows == sheet.height, (
        f"{path.name}: {sheet.width}x{sheet.height} not divisible by {cols}x{rows}"
    )
    frames = []
    for row in range(rows):
        for col in range(cols):
            box = (col * fw, row * fh, (col + 1) * fw, (row + 1) * fh)
            frames.append(sheet.crop(box))
    return frames, fw, fh


def scale_frame(frame, scale):
    frame = black_to_transparent(frame)
    if scale != 1:
        frame = frame.resize(
            (frame.width * scale, frame.height * scale),
            Image.Resampling.NEAREST,
        )
    return frame


def save_gif(frames, out_path, duration_ms, bounce=False, scale=SCALE):
    scaled = [scale_frame(f, scale) for f in frames]
    kept = [f for f in scaled if not is_empty(f)]
    if not kept:
        print(f"  SKIP empty: {out_path.name}")
        return
    if bounce and len(kept) > 1:
        if len(kept) == 2:
            kept = [kept[0], kept[1], kept[0]]
        else:
            kept = kept + kept[-2:0:-1]
    kept[0].save(
        out_path,
        save_all=True,
        append_images=kept[1:],
        duration=duration_ms,
        loop=0,
        disposal=2,
        optimize=False,
    )
    print(f"  wrote {out_path.name} ({len(kept)} frames, {duration_ms}ms)")


def main():
    for name, cfg in ENEMIES.items():
        print(f"Processing {name}...")
        frames, fw, fh = slice_sheet(cfg["path"], cfg["cols"], cfg["rows"])
        # Scale crawlers (64px) a bit more so they match player card size roughly
        scale = 4 if fw <= 64 else SCALE
        print(f"  frame size {fw}x{fh}, total {len(frames)}, scale x{scale}")
        for anim, anim_cfg in cfg["anims"].items():
            subset = [frames[i] for i in anim_cfg["indices"] if i < len(frames)]
            subset = [f for f in subset if not is_empty(f)]
            if not subset:
                print(f"  no frames for {anim}")
                continue
            out = OUT / f"{name}-{anim}.gif"
            save_gif(
                subset,
                out,
                anim_cfg["duration"],
                bounce=anim_cfg.get("bounce", False),
                scale=scale,
            )

    print("Done:", OUT)
    for p in sorted(OUT.glob("*.gif")):
        print(f"  {p.name}: {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
