"""Slice 6x7 character sheets into web GIFs (idle / walk / punch)."""
from pathlib import Path

from PIL import Image

SRC = {
    "cobruh": Path(
        r"C:\Users\joeli\Documents\snakes-with-fists-(steam-demo)\Game Images"
        r"\01 Player Characters Img\GGA_Character_Cobruh-Sheet.png"
    ),
    "conduh": Path(
        r"C:\Users\joeli\Documents\snakes-with-fists-(steam-demo)\Game Images"
        r"\01 Player Characters Img\GGA_Character_Conduh-Sheet.png"
    ),
}
OUT = Path(__file__).resolve().parent.parent / "images" / "characters"
OUT.mkdir(parents=True, exist_ok=True)

COLS, ROWS = 6, 7
SCALE = 3  # 80px -> 240px, nearest-neighbor


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


def slice_sheet(path):
    sheet = Image.open(path).convert("RGBA")
    fw, fh = sheet.width // COLS, sheet.height // ROWS
    frames = []
    for row in range(ROWS):
        for col in range(COLS):
            box = (col * fw, row * fh, (col + 1) * fw, (row + 1) * fh)
            frames.append(sheet.crop(box))
    return frames, fw, fh


def scale_frame(frame):
    frame = black_to_transparent(frame)
    if SCALE != 1:
        frame = frame.resize(
            (frame.width * SCALE, frame.height * SCALE),
            Image.Resampling.NEAREST,
        )
    return frame


def save_gif(frames, out_path, duration_ms, bounce=False):
    scaled = [scale_frame(f) for f in frames]
    kept = [f for f in scaled if not is_empty(f)]
    if not kept:
        print(f"  SKIP empty: {out_path.name}")
        return
    if bounce and len(kept) > 1:
        # 0,1,0 for a soft idle breathe if only 2 frames
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


# Layout (user: idle = frames 0 and 1; special = last row)
# 6 cols x 7 rows → last row indices 36–41
ANIMS = {
    "idle": {"indices": [0, 1], "duration": 300, "bounce": True},
    "walk": {"indices": list(range(6, 12)), "duration": 130, "bounce": False},
    "special": {"indices": list(range(36, 42)), "duration": 140, "bounce": False},
}


def main():
    for name, path in SRC.items():
        print(f"Processing {name}...")
        frames, fw, fh = slice_sheet(path)
        print(f"  frame size {fw}x{fh}, total {len(frames)}")
        for anim, cfg in ANIMS.items():
            subset = [frames[i] for i in cfg["indices"] if i < len(frames)]
            subset = [f for f in subset if not is_empty(f)]
            if not subset:
                print(f"  no frames for {anim}")
                continue
            out = OUT / f"{name}-{anim}.gif"
            save_gif(subset, out, cfg["duration"], bounce=cfg["bounce"])

    print("Done:", OUT)
    for p in sorted(OUT.glob("*.gif")):
        print(f"  {p.name}: {p.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
