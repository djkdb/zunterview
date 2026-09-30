"""
Cut interviewer pose sheets into aligned frames for the interview room.

  assets/panel/frames.json        which sheet cells to use for each state, per seat
  assets/panel/<seat>-sheet.webp  pose sheet: a grid of head-and-shoulders shots, each cut
                                  straight at the desk line, on a transparent background — or on
                                  a baked-in grey/white checkerboard ("background": "checker"),
                                  which is keyed out here
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


def is_backdrop(a):
    """Light, colourless pixels: the checkerboard squares (and white shirts/paper, told apart by connectivity)."""
    rgb = a[:, :, :3].astype(int)
    return (rgb.min(axis=2) >= 188) & (rgb.max(axis=2) - rgb.min(axis=2) <= 14)


def key_checker(a, cols, rows):
    """Turn a checkerboard sheet into RGBA: backdrop reachable from a cell's top or sides becomes transparent."""
    a = a.copy()
    a[:, :, 3] = np.where(is_backdrop(a), 0, 255)  # rough alpha, only to find the grid
    for x0, t, x1, b in grid_cells(a, cols, rows).values():
        cand = is_backdrop(a[t:b, x0:x1])
        lab, _ = ndimage.label(cand)
        edge = set(np.unique(np.concatenate([lab[0], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(edge))
        bg = ndimage.binary_dilation(bg, iterations=1)  # eat the grey fringe along hair and shoulders
        alpha = np.where(bg, 0.0, 255.0)
        alpha = ndimage.gaussian_filter(alpha, 0.6)
        a[t:b, x0:x1, 3] = np.clip(alpha, 0, 255).astype(np.uint8)
    return a


def grid_cells(a, cols, rows):
    """Row bounds are the straight desk cuts; column bounds the emptiest columns near each 1/cols."""
    al = a[:, :, 3] > 128
    h, w = al.shape
    op = al.mean(axis=1)
    bottoms = [y for y in range(1, h) if op[y - 1] - op[y] > 0.4]
    if len(bottoms) == rows - 1:  # the last row runs to the image edge
        bottoms.append(h)
    if len(bottoms) != rows:
        sys.exit(f"expected {rows} rows, found desk cuts at {bottoms}")
    cells = {}
    for r, (t, b) in enumerate(zip([0] + [y + 2 for y in bottoms[:-1]], bottoms)):  # +2: skip the cut line above
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
    # head: widest run of opaque pixels through the crown, over the first rows below the top
    op = crop[:, :, 3] > 128
    ys, xs = np.where(op)
    top = ys.min()
    x = int(np.median(xs[ys <= top + 4]))
    hw, cx = 0, x
    for y in range(top, min(top + 70, op.shape[0])):
        if not op[y, x]:
            continue
        l, r = x, x
        while l > 0 and op[y, l - 1]:
            l -= 1
        while r < op.shape[1] - 1 and op[y, r + 1]:
            r += 1
        if r - l > hw and r - l < 0.6 * op.shape[1]:  # stop before the shoulders
            hw, cx = r - l, (l + r) / 2
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
        if cfg.get("background") == "checker":
            a = key_checker(a, *cfg["grid"])
        cells = grid_cells(a, *cfg["grid"])
        os.makedirs(os.path.join(OUT, seat), exist_ok=True)
        for state, names in cfg["frames"].items():
            for i, name in enumerate(names, 1):
                path = os.path.join(OUT, seat, f"{state}-{i}.webp")
                frame(a, cells[name]).save(path, "WEBP", quality=88, method=6)
                print(path.replace(ROOT + "/", ""), os.path.getsize(path) // 1024, "KB")


if __name__ == "__main__":
    main()
