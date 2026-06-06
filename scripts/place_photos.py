#!/usr/bin/env python3
"""photos_src/ 의 음식 사진을 assets/{id}.jpg 로 리사이즈·배치한다.

워크플로우:
  1) docs/photo-prompts.md 프롬프트로 ChatGPT에서 이미지 생성
  2) 다운로드한 파일 이름에 레시피 id를 포함시켜 photos_src/ 에 저장
     (예: 10011.png, 또는 'recipe-10011-된장찌개.png' 처럼 id가 들어있기만 하면 됨)
  3) python3 scripts/place_photos.py   (--dry-run 으로 먼저 확인 가능)

- 리사이즈: 최대 900px, 정사각형 중앙 크롭(썸네일·배너 공용, object-fit:cover 가정)
- macOS는 sips, 그 외/sips 실패 시 Pillow(PIL) 폴백. 둘 다 없으면 안내.
- 안전: 원본은 건드리지 않음. 기존 assets/{id}.jpg 는 --force 없으면 건너뜀.
"""
from __future__ import annotations
import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "photos_src"
DST = ROOT / "assets"
SIZE = 900
EXTS = {".png", ".jpg", ".jpeg", ".webp", ".heic"}


def valid_ids() -> set[int]:
    db = json.loads((ROOT / "recipes.json").read_text(encoding="utf-8"))
    return {r["id"] for arr in db["recipes"].values() for r in arr}


def id_from_name(name: str, ids: set[int]) -> int | None:
    nums = [int(n) for n in re.findall(r"\d{3,}", name)]
    for n in nums:
        if n in ids:
            return n
    return None


def resize_sips(src: Path, dst: Path) -> bool:
    try:
        tmp = dst.with_suffix(".tmp.jpg")
        shutil.copy(src, tmp)
        # 가장 긴 변 기준 축소 후 중앙 정사각 크롭
        subprocess.run(["sips", "-Z", str(SIZE), str(tmp)], check=True, capture_output=True)
        subprocess.run(["sips", "-c", str(SIZE), str(SIZE), str(tmp), "--out", str(dst)],
                       check=True, capture_output=True)
        tmp.unlink(missing_ok=True)
        return True
    except Exception:
        return False


def resize_pil(src: Path, dst: Path) -> bool:
    try:
        from PIL import Image  # type: ignore
        im = Image.open(src).convert("RGB")
        w, h = im.size
        s = min(w, h)
        im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
        im = im.resize((SIZE, SIZE), Image.LANCZOS)
        im.save(dst, "JPEG", quality=82, optimize=True)
        return True
    except Exception:
        return False


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="배치 계획만 출력")
    ap.add_argument("--force", action="store_true", help="기존 assets/{id}.jpg 덮어쓰기")
    args = ap.parse_args()

    if not SRC.exists():
        SRC.mkdir(parents=True, exist_ok=True)
        print(f"photos_src/ 생성했습니다. 여기에 사진을 넣고 다시 실행하세요: {SRC}")
        return
    DST.mkdir(parents=True, exist_ok=True)
    ids = valid_ids()

    files = [p for p in sorted(SRC.iterdir()) if p.suffix.lower() in EXTS]
    if not files:
        print("photos_src/ 에 이미지가 없습니다.")
        return

    placed, skipped, nomatch = 0, 0, []
    for f in files:
        rid = id_from_name(f.stem, ids)
        if rid is None:
            nomatch.append(f.name)
            continue
        out = DST / f"{rid}.jpg"
        if out.exists() and not args.force:
            skipped += 1
            print(f"  건너뜀(이미 존재): {out.name}  ← {f.name}")
            continue
        if args.dry_run:
            print(f"  [dry-run] {f.name} → {out.relative_to(ROOT)}")
            placed += 1
            continue
        ok = resize_sips(f, out) or resize_pil(f, out)
        if ok:
            placed += 1
            print(f"  ✓ {f.name} → {out.relative_to(ROOT)}")
        else:
            print(f"  ✗ 리사이즈 실패(sips/Pillow 둘 다 불가): {f.name}", file=sys.stderr)

    print(f"\n배치 {placed} · 건너뜀 {skipped} · id 매칭 실패 {len(nomatch)}")
    if nomatch:
        print("  매칭 실패(파일명에 레시피 id 포함 필요):", ", ".join(nomatch[:10]))


if __name__ == "__main__":
    main()
