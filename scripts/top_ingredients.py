#!/usr/bin/env python3
"""전체 레시피에서 가장 많이 쓰이는 재료를 집계한다.
쿠팡 파트너스 딥링크를 어떤 재료부터 만들면 ROI가 높은지 알려주고,
coupang_links.json 템플릿(상위 N개 키, 값은 비움)을 생성한다.

사용: python3 scripts/top_ingredients.py [--top 50] [--write-template]
앱은 coupang_links.json 의 "재료명": "딥링크URL" 을 우선 사용하고,
없으면 쿠팡 검색 URL(제휴 파라미터 포함)로 자동 폴백한다.
"""
from __future__ import annotations
import argparse
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECIPES = ROOT / "recipes.json"
TEMPLATE = ROOT / "coupang_links.template.json"


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--top", type=int, default=50)
    ap.add_argument("--write-template", action="store_true", help="coupang_links.template.json 생성")
    args = ap.parse_args()

    db = json.loads(RECIPES.read_text(encoding="utf-8"))
    cnt: Counter[str] = Counter()
    for arr in db["recipes"].values():
        for r in arr:
            for ing in (r.get("ing") or []):
                n = (ing.get("n") or "").strip()
                if n:
                    cnt[n] += 1

    top = cnt.most_common(args.top)
    print(f"전체 고유 재료 {len(cnt)}종. 상위 {args.top}개 (등장 횟수):\n")
    for i, (name, c) in enumerate(top, 1):
        print(f"  {i:2}. {name}  ({c}회)")

    if args.write_template:
        tmpl = {name: "" for name, _ in top}
        TEMPLATE.write_text(json.dumps(tmpl, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"\n✓ 템플릿 → {TEMPLATE.relative_to(ROOT)}")
        print("  쿠팡 파트너스에서 각 재료의 딥링크를 만들어 값에 채운 뒤")
        print("  파일명을 coupang_links.json 으로 바꾸면 앱이 자동 사용합니다.")


if __name__ == "__main__":
    main()
