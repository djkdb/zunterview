"""
Cut interviewer pose sheets into aligned frames for the interview room.

  assets/panel/frames.json        which sheet cells to use for each state, per seat
  assets/panel/<seat>-sheet.webp  pose sheet: a grid of head-and-shoulders shots on a
                                  transparent background, each cut straight at the desk line
  → public/panel/<seat>/<state>-<n>.webp

Every frame is placed on the same canvas with the desk line at the bottom, the head
centred and the head width normalised, so switching frames doesn't make the person jump.

Requires: pip install pillow numpy scipy
"""
import json
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets", "panel")
OUT = os.path.join(ROOT, "public", "panel")
CANVAS = (300, 230)  # width, height — must match PHOTO_BOX in src/config/panelPhotos.ts
HEAD_W = 112  # normalised width of the head (hair included) in px


def grid_cells(a, cols, rows):
    """Row bounds are the straight desk cuts; column bounds the emptiest columns near each 1/cols."""
    al = a[:, :, 3] > 128
    h, w = al.shape
    op = al.mean(axis=1)
    bottoms = [y for y in range(1, h) if op[y - 1] - op[y] > 0.4]
    if len(bottoms) != rows:
        sys.exit(f"expected {rows} rows, found desk cuts at {bottoms}")
    cells = {}
    for r, (t, b) in enumerate(zip([0] + bottoms[:-1], bottoms)):
        colop = al[t:b].mean(axis=0)
        cuts = [0]
        for k in range(1, cols):
            c = int(w * k / cols)
            cuts.append(c - 40 + int(np.argmin(colop[c - 40 : c + 40])))
        cuts.append(w)
        for c in range(cols):
            cells[f"r{r}c{c}"] = (cuts[c], t, cuts[c + 1], b)
    return cells


def frame(a, box):
    x0, t, x1, b = box
    crop = a[t:b, x0:x1].copy()
    mask = crop[:, :, 3] > 20
    lab, n = ndimage.label(mask)
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    main = int(np.argmax(sizes)) + 1
    keep = lab == main
    for i, s in enumerate(sizes, 1):  # a hand separated by a gap, but not a neighbour's hand
        if i != main and s >= 150:
            xs = np.where(lab == i)[1]
            if xs.min() > 2 and xs.max() < crop.shape[1] - 3:
                keep |= lab == i
    crop[~keep, 3] = 0
    ys = np.where(crop[:, :, 3] > 128)[0]
    band = crop[ys.min() : ys.min() + 60, :, 3] > 128
    hx = np.where(band.any(axis=0))[0]
    cx, hw = (hx.min() + hx.max()) / 2, hx.max() - hx.min()
    img = Image.fromarray(crop)
    s = HEAD_W / hw
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.paste(img, (round(CANVAS[0] / 2 - cx * s), CANVAS[1] - img.height), img)
    return canvas


def main():
    spec = json.load(open(os.path.join(SRC, "frames.json")))
    for seat, cfg in spec.items():
        if seat.startswith("_"):
            continue
        a = np.asarray(Image.open(os.path.join(SRC, cfg["sheet"])).convert("RGBA"))
        cells = grid_cells(a, *cfg["grid"])
        os.makedirs(os.path.join(OUT, seat), exist_ok=True)
        for state, names in cfg["frames"].items():
            for i, name in enumerate(names, 1):
                path = os.path.join(OUT, seat, f"{state}-{i}.webp")
                frame(a, cells[name]).save(path, "WEBP", quality=88, method=6)
                print(path.replace(ROOT + "/", ""), os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    main()
