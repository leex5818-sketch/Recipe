#!/usr/bin/env python3
"""recipes.json → docs/photo-prompts.md
130개 음식별 ChatGPT(무과금) 이미지 생성 프롬프트를 만든다.
생성한 이미지는 `{id}.png` 로 저장해 photos_src/ 에 넣고 place_photos.py 실행.

사용: python3 scripts/gen_photo_prompts.py
"""
from __future__ import annotations
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECIPES = ROOT / "recipes.json"
OUT = ROOT / "docs" / "photo-prompts.md"

# 카테고리 id → 요리 분류(프롬프트 맥락용)
CUISINE = {1: "한식", 2: "일식", 3: "중식", 4: "이유식", 5: "양식", 6: "분식", 7: "동남아"}


def build_prompt(name: str, cuisine: str, ings: list[str]) -> str:
    top = ", ".join(ings[:3]) if ings else ""
    base = (
        f"{cuisine} '{name}' 요리 사진. "
        + (f"주재료: {top}. " if top else "")
        + "깔끔한 그릇/접시에 담긴 먹음직스러운 정통 가정식, 45도 각도, 부드러운 자연광, "
        "미니멀한 단색 배경, 음식만 클로즈업, 초고화질 실사 사진, 텍스트·손·로고 없음, 정사각형 구도."
    )
    if cuisine == "이유식":
        base = (
            f"아기 이유식 '{name}' 사진. "
            + (f"주재료: {top}. " if top else "")
            + "작은 유아용 그릇에 담긴 부드러운 죽/미음, 위에서 본 각도, 파스텔톤 깔끔한 배경, "
            "따뜻하고 위생적인 느낌, 초고화질 실사 사진, 텍스트·손 없음, 정사각형 구도."
        )
    return base


def main() -> None:
    db = json.loads(RECIPES.read_text(encoding="utf-8"))
    dishes = db["dishes"]
    recipes = db["recipes"]

    rows: list[tuple[int, str, str, str]] = []  # (id, cuisine, name, prompt)
    for cid, arr in dishes.items():
        cuisine = CUISINE.get(int(cid), "요리")
        for d in arr:
            rs = recipes.get(str(d["id"]), [])
            if not rs or not rs[0].get("steps"):
                continue  # 빈/준비중 음식 제외
            r = rs[0]
            ings = [i.get("n", "") for i in (r.get("ing") or [])]
            name = r.get("title") or d.get("name", "")
            # 앱은 recipe id(r["id"])로 assets/{id}.jpg 를 찾는다 (dish id 아님)
            rows.append((r["id"], cuisine, name, build_prompt(name, cuisine, ings)))

    rows.sort(key=lambda x: x[0])
    lines = [
        "# 음식 사진 프롬프트 (ChatGPT 이미지 생성용)",
        "",
        f"총 {len(rows)}개. ChatGPT(또는 이미지 생성)에 아래 프롬프트를 붙여 1장씩 생성 →",
        "다운로드 시 **`{id}.png`** 로 저장 → `photos_src/` 폴더에 모아두고 →",
        "`python3 scripts/place_photos.py` 실행하면 자동으로 `assets/{id}.jpg`로 리사이즈·배치됩니다.",
        "",
        "> 팁: 130장 한 번에 말고, **인기/대표 음식 20~30개 먼저** 만들어 효과를 확인하세요.",
        "> 앱은 사진이 있으면 자동 표시, 없으면 이모지로 폴백하므로 부분만 채워도 됩니다.",
        "",
        "---",
        "",
    ]
    cur = None
    for rid, cuisine, name, prompt in rows:
        if cuisine != cur:
            lines.append(f"\n## {cuisine}\n")
            cur = cuisine
        lines.append(f"### {rid} — {name}")
        lines.append("```text")
        lines.append(prompt)
        lines.append("```")
        lines.append("")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("\n".join(lines), encoding="utf-8")
    print(f"✓ {len(rows)}개 프롬프트 → {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
