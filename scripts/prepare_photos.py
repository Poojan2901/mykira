#!/usr/bin/env python3
"""
prepare_photos.py
=================
Rename, face-aware crop, resize and place photos for "You Are My Sun".

What it does
------------
1. Reads every image in a source folder (JPG, PNG, HEIC, WebP, TIFF, BMP).
2. Fixes phone rotation (EXIF), skips videos and exact duplicates.
3. Sorts photos by the date they were taken (or by name / random).
4. Detects faces (OpenCV YuNet, Haar cascade fallback).
5. Crops around the faces with headroom, in a frame the UI will not crop again:
     portrait 4:5, landscape 5:4, near-square 1:1, memory orbs always 1:1.
6. Resizes, saves as WebP, strips EXIF (removes GPS location).
7. Names files 01.webp, 02.webp ... into public/photos/<folder>/.
8. Writes a visual preview page, a JSON map and a captions template.

Routing
-------
- Files named mem1 ... mem6 (any extension, e.g. "mem3.jpg" or "mem3 vapi.heic")
  go to the 6 memory orbs of the Joy chapter.
- Everything else, in sorted order: first --orbit photos to orbit/,
  next --stars photos to stars/, the rest is reported as unused.

Usage
-----
  python3 scripts/prepare_photos.py                       # defaults
  python3 scripts/prepare_photos.py --dry-run             # preview only, writes nothing to public/
  python3 scripts/prepare_photos.py --orbit 40 --stars 10
  python3 scripts/prepare_photos.py --order name
  python3 scripts/prepare_photos.py --move                # move originals to <src>/_processed after success
"""

import argparse
import hashlib
import html
import json
import random
import shutil
import sys
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

try:
    import cv2
    import numpy as np
    from PIL import Image, ImageDraw, ImageOps
except ImportError as e:
    sys.exit(
        f"Missing dependency: {e.name}\n"
        "Activate the venv and run: pip install opencv-python pillow pillow-heif numpy"
    )

try:
    from pillow_heif import register_heif_opener

    register_heif_opener()
    HEIC_OK = True
except ImportError:
    HEIC_OK = False


# ─────────────────────────────────────────────────────────────
# Paths and settings
# ─────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT = SCRIPT_DIR.parent
PUBLIC_PHOTOS = PROJECT / "public" / "photos"
MODEL_DIR = SCRIPT_DIR / "models"
PREVIEW_DIR = SCRIPT_DIR / "_preview"
BACKUP_DIR = SCRIPT_DIR / "_backup"

YUNET_URL = (
    "https://github.com/opencv/opencv_zoo/raw/main/models/"
    "face_detection_yunet/face_detection_yunet_2023mar.onnx"
)
YUNET_PATH = MODEL_DIR / "face_detection_yunet_2023mar.onnx"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".heic", ".heif", ".webp", ".tif", ".tiff", ".bmp"}
VIDEO_EXT = {".mov", ".mp4", ".m4v", ".avi"}

# Must match file names used in src/content/memories.js
MEMORY_NAMES = {
    1: "01-school",
    2: "02-apart",
    3: "03-message",
    4: "04-15-march",
    5: "05-palanpur-vapi",
    6: "06-laughing",
}

# face_fill: minimum fraction of crop height the faces should take (zooms in on small faces)
# eye_line:  where the faces' centre sits, as a fraction from the top of the crop
PROFILES = {
    "memories": dict(folder="memories", long_side=800, aspect="square", face_fill=0.42, eye_line=0.46),
    "orbit": dict(folder="orbit", long_side=1000, aspect="auto", face_fill=0.30, eye_line=0.40),
    "stars": dict(folder="stars", long_side=1000, aspect="auto", face_fill=0.30, eye_line=0.40),
}

DETECT_MAX = 1280      # detection runs on a downscaled copy this size
MIN_SCORE = 0.70       # YuNet confidence threshold
MIN_KEEP = 0.45        # never crop tighter than this fraction of the largest possible frame
MIN_CROP_PX = 700      # never crop tighter than this many pixels tall (keeps it sharp)
NO_FACE_Y = 0.35       # no face found: frame sits slightly above centre
LOW_RES_WARN = 0.6     # warn when crop is smaller than 60% of target output size
PREVIEW_W = 420


# ─────────────────────────────────────────────────────────────
# Data
# ─────────────────────────────────────────────────────────────

@dataclass
class Face:
    x: float
    y: float
    w: float
    h: float
    score: float

    @property
    def area(self):
        return self.w * self.h


@dataclass
class Item:
    src: Path
    taken: datetime
    md5: str
    group: str = ""
    name: str = ""
    faces: list = field(default_factory=list)
    detector: str = ""
    aspect: float = 1.0
    crop: tuple = ()
    out_size: tuple = ()
    ok: bool = False
    warnings: list = field(default_factory=list)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def log(msg=""):
    print(msg, flush=True)


def md5_of(path: Path) -> str:
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def taken_date(path: Path) -> datetime:
    """Date the photo was taken (EXIF), falling back to file modified time."""
    try:
        with Image.open(path) as im:
            exif = im.getexif()
            raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)  # DateTimeOriginal, DateTime
            if raw:
                return datetime.strptime(str(raw).strip()[:19], "%Y:%m:%d %H:%M:%S")
    except Exception:
        pass
    return datetime.fromtimestamp(path.stat().st_mtime)


def load_image(path: Path):
    """Open, apply EXIF rotation, flatten to RGB. Returns (image, icc_profile)."""
    img = Image.open(path)
    icc = img.info.get("icc_profile")
    img = ImageOps.exif_transpose(img)
    if img.mode != "RGB":
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGBA")
            bg = Image.new("RGB", img.size, (10, 6, 4))
            bg.paste(img, mask=img.split()[-1])
            img = bg
        else:
            img = img.convert("RGB")
    return img, icc


def memory_slot(path: Path):
    """'mem3.jpg' or 'mem3 vapi.heic' -> 3. Anything else -> None."""
    stem = path.stem.lower().strip()
    if stem.startswith("mem") and len(stem) >= 4 and stem[3].isdigit():
        n = int(stem[3])
        if n in MEMORY_NAMES and (len(stem) == 4 or not stem[4].isdigit()):
            return n
    return None


def ensure_model(allow_download: bool) -> bool:
    if YUNET_PATH.exists() and YUNET_PATH.stat().st_size > 100_000:
        return True
    if not allow_download:
        return False
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    log("Downloading face detection model (YuNet, ~230 KB)...")
    tmp = YUNET_PATH.with_suffix(".part")
    try:
        with urllib.request.urlopen(YUNET_URL, timeout=30) as r, open(tmp, "wb") as f:
            shutil.copyfileobj(r, f)
        tmp.rename(YUNET_PATH)
        return True
    except Exception as e:
        log(f"  Could not download model ({e}). Falling back to Haar cascade.")
        tmp.unlink(missing_ok=True)
        return False


# ─────────────────────────────────────────────────────────────
# Face detection
# ─────────────────────────────────────────────────────────────

class FaceFinder:
    def __init__(self, allow_download=True):
        self.yunet = None
        if ensure_model(allow_download):
            try:
                self.yunet = cv2.FaceDetectorYN.create(str(YUNET_PATH), "", (320, 320), MIN_SCORE, 0.3, 5000)
            except Exception as e:
                log(f"  YuNet failed to load ({e}). Falling back to Haar cascade.")
                # Haar fallback exists only in OpenCV 4.x. OpenCV 5 moved it to contrib.
        self.haar = None
        if hasattr(cv2, "CascadeClassifier") and hasattr(cv2, "data"):
            try:
                self.haar = cv2.CascadeClassifier(
                    cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                )
            except Exception:
                self.haar = None
        if self.yunet is None and self.haar is None:
            log("  WARNING: no face detector available. Photos will get centred crops.")

    def find(self, img: Image.Image):
        W, H = img.size
        scale = min(1.0, DETECT_MAX / max(W, H))
        small = img.resize((round(W * scale), round(H * scale)), Image.BILINEAR) if scale < 1 else img
        bgr = cv2.cvtColor(np.array(small), cv2.COLOR_RGB2BGR)

        faces, used = [], "none"

        if self.yunet is not None:
            h, w = bgr.shape[:2]
            self.yunet.setInputSize((w, h))
            _, res = self.yunet.detect(bgr)
            if res is not None:
                for r in res:
                    faces.append(Face(r[0] / scale, r[1] / scale, r[2] / scale, r[3] / scale, float(r[14])))
                used = "yunet"

        if not faces and self.haar is not None and not self.haar.empty():
            gray = cv2.equalizeHist(cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY))
            ms = max(24, int(min(gray.shape) * 0.06))
            rects = self.haar.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(ms, ms))
            for (x, y, w, h) in rects:
                faces.append(Face(x / scale, y / scale, w / scale, h / scale, 0.5))
            if len(rects):
                used = "haar"

        return filter_faces(faces, W, H), used


def filter_faces(faces, W, H):
    """Drop weak, tiny and background faces."""
    out = []
    for f in faces:
        x0, y0 = max(0, f.x), max(0, f.y)
        x1, y1 = min(W, f.x + f.w), min(H, f.y + f.h)
        if x1 - x0 < 4 or y1 - y0 < 4:
            continue
        out.append(Face(x0, y0, x1 - x0, y1 - y0, f.score))
    if not out:
        return []
    biggest = max(f.area for f in out)
    min_side = 0.015 * min(W, H)
    # Background people: much smaller than the main face
    return [f for f in out if f.area >= 0.2 * biggest and f.w >= min_side]


# ─────────────────────────────────────────────────────────────
# Crop planning
# ─────────────────────────────────────────────────────────────

def pick_aspect(profile, W, H):
    if profile["aspect"] == "square":
        return 1.0
    r = W / H
    if r >= 1.15:
        return 5 / 4
    if r <= 0.87:
        return 4 / 5
    return 1.0


def clamp_box(x0, y0, cw, ch, W, H):
    cw, ch = min(cw, W), min(ch, H)
    x0 = min(max(0, x0), W - cw)
    y0 = min(max(0, y0), H - ch)
    return (round(x0), round(y0), round(cw), round(ch))


def plan_crop(W, H, aspect, faces, prof):
    # Largest frame of this aspect that fits the image
    if W / H > aspect:
        mh, mw = H, H * aspect
    else:
        mw, mh = W, W / aspect

    if not faces:
        return clamp_box((W - mw) / 2, (H - mh) * NO_FACE_Y, mw, mh, W, H)

    ux0 = min(f.x for f in faces)
    uy0 = min(f.y for f in faces)
    ux1 = max(f.x + f.w for f in faces)
    uy1 = max(f.y + f.h for f in faces)
    uh = uy1 - uy0
    fs = max(f.h for f in faces)  # largest face height

    # Head and shoulders box: detector boxes are tight on the face
    hx0 = max(0, ux0 - 0.35 * fs)
    hx1 = min(W, ux1 + 0.35 * fs)
    hy0 = max(0, uy0 - 0.55 * fs)  # hair
    hy1 = min(H, uy1 + 0.45 * fs)  # chin and neck
    hw, hh = hx1 - hx0, hy1 - hy0

    need_h = max(hh, hw / aspect)                    # must contain heads
    want_h = uh / prof["face_fill"]                  # zoom so faces read clearly
    floor_h = min(mh, max(mh * MIN_KEEP, MIN_CROP_PX))  # do not over-zoom
    ch = min(mh, max(need_h, want_h, floor_h))
    cw = ch * aspect

    cx = (ux0 + ux1) / 2
    cy = (uy0 + uy1) / 2
    x0 = cx - cw / 2
    y0 = cy - ch * prof["eye_line"]

    # Keep the whole head box inside when it fits
    if hw <= cw:
        x0 = min(max(x0, hx1 - cw), hx0)
    if hh <= ch:
        y0 = min(max(y0, hy1 - ch), hy0)

    return clamp_box(x0, y0, cw, ch, W, H)


# ─────────────────────────────────────────────────────────────
# Processing
# ─────────────────────────────────────────────────────────────

def process(item: Item, finder: FaceFinder, quality: int, dry_run: bool):
    prof = PROFILES[item.group]
    img, icc = load_image(item.src)
    W, H = img.size

    item.faces, item.detector = finder.find(img)
    item.aspect = pick_aspect(prof, W, H)
    item.crop = plan_crop(W, H, item.aspect, item.faces, prof)

    x0, y0, cw, ch = item.crop
    long_crop = max(cw, ch)
    scale = min(1.0, prof["long_side"] / long_crop)  # never upscale
    out_w, out_h = max(1, round(cw * scale)), max(1, round(ch * scale))
    item.out_size = (out_w, out_h)

    if long_crop < prof["long_side"] * LOW_RES_WARN:
        item.warnings.append(f"low resolution ({cw}x{ch})")
    if not item.faces:
        item.warnings.append("no face found, centred crop")
    if len(item.faces) > 1 and cw >= W * 0.98 and ch >= H * 0.98:
        item.warnings.append("group photo, using full frame")

    out = img.crop((x0, y0, x0 + cw, y0 + ch)).resize((out_w, out_h), Image.LANCZOS)

    if not dry_run:
        dest = PUBLIC_PHOTOS / prof["folder"] / f"{item.name}.webp"
        dest.parent.mkdir(parents=True, exist_ok=True)
        kwargs = dict(quality=quality, method=6)
        if icc:
            kwargs["icc_profile"] = icc  # keeps iPhone colours accurate; no EXIF, so no GPS
        out.save(dest, "WEBP", **kwargs)

    write_preview(item, img, out)
    item.ok = True


def write_preview(item: Item, original: Image.Image, out: Image.Image):
    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
    W, H = original.size
    s = PREVIEW_W / W
    thumb = original.resize((PREVIEW_W, max(1, round(H * s))), Image.BILINEAR)
    d = ImageDraw.Draw(thumb)

    for f in item.faces:
        d.rectangle([f.x * s, f.y * s, (f.x + f.w) * s, (f.y + f.h) * s], outline=(255, 80, 80), width=2)
    x0, y0, cw, ch = item.crop
    d.rectangle([x0 * s, y0 * s, (x0 + cw) * s, (y0 + ch) * s], outline=(255, 200, 90), width=3)

    base = f"{item.group}-{item.name}"
    thumb.save(PREVIEW_DIR / f"{base}-src.jpg", quality=85)
    o = out.copy()
    o.thumbnail((PREVIEW_W, PREVIEW_W))
    o.save(PREVIEW_DIR / f"{base}-out.jpg", quality=85)


# ─────────────────────────────────────────────────────────────
# Reports
# ─────────────────────────────────────────────────────────────

def write_preview_html(items):
    rows = []
    for it in items:
        base = f"{it.group}-{it.name}"
        warn = "".join(f'<div class="warn">{html.escape(w)}</div>' for w in it.warnings)
        status = "" if it.ok else '<div class="warn">FAILED</div>'
        rows.append(f"""
        <div class="row">
          <img src="{base}-src.jpg" alt="">
          <img src="{base}-out.jpg" alt="" class="out">
          <div class="info">
            <div class="name">{it.group}/{it.name}.webp</div>
            <div>{html.escape(it.src.name)}</div>
            <div>{it.taken:%d %b %Y}</div>
            <div>{len(it.faces)} face(s) · {it.detector}</div>
            <div>{it.out_size[0] if it.out_size else 0} × {it.out_size[1] if it.out_size else 0}</div>
            {warn}{status}
          </div>
        </div>""")

    page = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Photo preview</title>
<style>
  body {{ background:#0d0a08; color:#f3e6d0; font:14px/1.5 -apple-system,system-ui,sans-serif; margin:24px; }}
  h1 {{ font-weight:400; }}
  .legend span {{ display:inline-block; margin-right:18px; }}
  .row {{ display:flex; gap:18px; align-items:flex-start; padding:14px 0; border-bottom:1px solid #2a211a; }}
  .row img {{ max-width:{PREVIEW_W}px; border-radius:6px; }}
  .row img.out {{ max-height:300px; box-shadow:0 0 18px rgba(255,180,80,.25); }}
  .info .name {{ color:#ffcf80; font-size:16px; margin-bottom:4px; }}
  .warn {{ color:#ff9b7a; margin-top:4px; }}
</style></head><body>
<h1>You Are My Sun · photo preview</h1>
<p class="legend"><span style="color:#ff5050">■ detected faces</span><span style="color:#ffc85a">■ chosen crop</span> Left: original. Right: what the site shows.</p>
{''.join(rows)}
</body></html>"""
    (PREVIEW_DIR / "index.html").write_text(page, encoding="utf-8")


def write_reports(items):
    data = [
        dict(
            output=f"{it.group}/{it.name}.webp",
            original=it.src.name,
            taken=it.taken.isoformat(timespec="minutes"),
            faces=len(it.faces),
            detector=it.detector,
            crop=list(it.crop),
            size=list(it.out_size),
            warnings=it.warnings,
            ok=it.ok,
        )
        for it in items
    ]
    (SCRIPT_DIR / "photo-map.json").write_text(json.dumps(data, indent=2), encoding="utf-8")

    orbit = [it for it in items if it.group == "orbit" and it.ok]
    stars = [it for it in items if it.group == "stars" and it.ok]

    def note(it):
        return f"// {it.src.name} · {it.taken:%d %b %Y} · {len(it.faces)} face(s)"

    lines = [
        f"// Generated by scripts/prepare_photos.py on {datetime.now():%d %b %Y %H:%M}",
        "// Paste into src/content/photos.js (replace ORBIT_CAPTIONS and STAR_PHOTOS).",
        "// Write one short real caption per line. No apostrophes inside the quotes.",
        "",
        "const ORBIT_CAPTIONS = [",
        *[f"  'Write caption orbit {it.name}', {note(it)}" for it in orbit],
        "]",
        "",
        "export const ORBIT_PHOTOS = ORBIT_CAPTIONS.map((caption, i) => ({",
        "  src: `/photos/orbit/${String(i + 1).padStart(2, '0')}.webp`,",
        "  caption,",
        "}))",
        "",
        "export const STAR_PHOTOS = [",
        *[
            f"  {{ src: '/photos/stars/{it.name}.webp', caption: 'Write caption star {it.name}' }}, {note(it)}"
            for it in stars
        ],
        "]",
        "",
    ]
    (SCRIPT_DIR / "captions-template.js").write_text("\n".join(lines), encoding="utf-8")


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def backup_existing(folders):
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for folder in folders:
        d = PUBLIC_PHOTOS / folder
        files = [p for p in d.glob("*") if p.is_file()] if d.exists() else []
        if not files:
            continue
        target = BACKUP_DIR / stamp / folder
        target.mkdir(parents=True, exist_ok=True)
        for p in files:
            shutil.move(str(p), target / p.name)
        log(f"Backed up {len(files)} existing file(s) from {folder}/ to {target.relative_to(PROJECT)}")


def main():
    ap = argparse.ArgumentParser(description="Prepare photos for You Are My Sun")
    ap.add_argument("--src", default=str(Path.home() / "Downloads" / "temp"), help="source folder")
    ap.add_argument("--orbit", type=int, default=40, help="photos for Become the Sun (default 40)")
    ap.add_argument("--stars", type=int, default=None, help="photos for Constellation (default: all remaining, max 40)")
    ap.add_argument("--order", choices=["date", "name", "random"], default="date")
    ap.add_argument("--seed", type=int, default=7, help="seed for --order random")
    ap.add_argument("--quality", type=int, default=82, help="WebP quality 1-100")
    ap.add_argument("--dry-run", action="store_true", help="preview only, write nothing to public/")
    ap.add_argument("--move", action="store_true", help="move originals to <src>/_processed after success")
    ap.add_argument("--no-download", action="store_true", help="do not download YuNet model")
    args = ap.parse_args()

    src = Path(args.src).expanduser().resolve()
    if not src.is_dir():
        sys.exit(f"Source folder not found: {src}")
    if not (PROJECT / "package.json").exists():
        sys.exit(f"Run this from inside the project. Expected package.json in {PROJECT}")

    log(f"Source:  {src}")
    log(f"Project: {PROJECT}")
    log("Mode:    DRY RUN (nothing written to public/)" if args.dry_run else "Mode:    write")
    log()

    # ── Collect ──
    files, skipped = [], []
    for p in sorted(src.iterdir()):
        if not p.is_file() or p.name.startswith("."):
            continue
        ext = p.suffix.lower()
        if ext in IMAGE_EXT:
            if ext in (".heic", ".heif") and not HEIC_OK:
                skipped.append((p.name, "HEIC support missing: pip install pillow-heif"))
            else:
                files.append(p)
        elif ext in VIDEO_EXT:
            skipped.append((p.name, "video"))
        else:
            skipped.append((p.name, "not an image"))

    if not files:
        sys.exit("No images found.")

    # ── Dedupe + dates ──
    items, seen = [], {}
    for p in files:
        h = md5_of(p)
        if h in seen:
            skipped.append((p.name, f"duplicate of {seen[h]}"))
            continue
        seen[h] = p.name
        items.append(Item(src=p, taken=taken_date(p), md5=h))

    # ── Order ──
    if args.order == "date":
        items.sort(key=lambda it: (it.taken, it.src.name.lower()))
    elif args.order == "name":
        items.sort(key=lambda it: it.src.name.lower())
    else:
        random.Random(args.seed).shuffle(items)

    # ── Route ──
    memory_items, rest = [], []
    for it in items:
        slot = memory_slot(it.src)
        if slot is not None and not any(m.name == MEMORY_NAMES[slot] for m in memory_items):
            it.group, it.name = "memories", MEMORY_NAMES[slot]
            memory_items.append(it)
        else:
            rest.append(it)

    n_orbit = min(args.orbit, len(rest))
    n_stars = min(args.stars if args.stars is not None else 40, len(rest) - n_orbit)

    for i, it in enumerate(rest[:n_orbit]):
        it.group, it.name = "orbit", f"{i + 1:02d}"
    for i, it in enumerate(rest[n_orbit:n_orbit + n_stars]):
        it.group, it.name = "stars", f"{i + 1:02d}"
    unused = rest[n_orbit + n_stars:]

    work = [it for it in items if it.group]
    log(f"Found {len(items)} unique photo(s): {len(memory_items)} memories, {n_orbit} orbit, {n_stars} stars, {len(unused)} unused")
    log()

    # ── Prepare folders ──
    if PREVIEW_DIR.exists():
        shutil.rmtree(PREVIEW_DIR)
    if not args.dry_run:
        backup_existing(sorted({PROFILES[it.group]["folder"] for it in work}))
        log()

    finder = FaceFinder(allow_download=not args.no_download)
    log()

    # ── Process ──
    for i, it in enumerate(work, 1):
        try:
            process(it, finder, args.quality, args.dry_run)
            x0, y0, cw, ch = it.crop
            msg = (
                f"[{i:>2}/{len(work)}] {it.src.name[:34]:<34} -> {it.group}/{it.name}.webp  "
                f"faces:{len(it.faces)} ({it.detector})  crop {cw}x{ch} -> {it.out_size[0]}x{it.out_size[1]}"
            )
            log(msg + (f"  ! {', '.join(it.warnings)}" if it.warnings else ""))
        except Exception as e:
            it.warnings.append(f"error: {e}")
            log(f"[{i:>2}/{len(work)}] {it.src.name} FAILED: {e}")

    write_preview_html(work)
    write_reports(work)

    # ── Move originals ──
    if args.move and not args.dry_run:
        done_dir = src / "_processed"
        done_dir.mkdir(exist_ok=True)
        for it in work:
            if it.ok:
                shutil.move(str(it.src), done_dir / it.src.name)
        log(f"\nMoved processed originals to {done_dir}")

    # ── Summary ──
    ok = [it for it in work if it.ok]
    no_face = [it for it in ok if not it.faces]
    low_res = [it for it in ok if any("low resolution" in w for w in it.warnings)]
    failed = [it for it in work if not it.ok]

    log("\n" + "─" * 60)
    log(f"Done: {len(ok)} saved, {len(failed)} failed, {len(skipped)} skipped, {len(unused)} unused")
    if no_face:
        log(f"\nNo face found ({len(no_face)}), check these in the preview:")
        for it in no_face:
            log(f"  {it.group}/{it.name}.webp  <- {it.src.name}")
    if low_res:
        log(f"\nLow resolution ({len(low_res)}), may look soft:")
        for it in low_res:
            log(f"  {it.group}/{it.name}.webp  <- {it.src.name}")
    if skipped:
        log("\nSkipped:")
        for name, why in skipped:
            log(f"  {name}: {why}")
    if unused:
        log("\nUnused (raise --orbit or --stars to include):")
        for it in unused:
            log(f"  {it.src.name}")

    log("\nNext:")
    log(f"  1. Open the preview:  open {PREVIEW_DIR / 'index.html'}")
    log(f"  2. Captions template: {SCRIPT_DIR / 'captions-template.js'}")
    log(f"  3. Full map:          {SCRIPT_DIR / 'photo-map.json'}")
    if args.dry_run:
        log("  4. Happy with crops? Run again without --dry-run.")


if __name__ == "__main__":
    main()