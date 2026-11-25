#!/usr/bin/env python3
"""레포 규약을 기계로 검사한다 (CLAUDE.md 참고). 의존성 없음.

1. 모든 SKILL.md 에 frontmatter `name`·`description` 이 있고, name 이 폴더명과 같다.
2. 배포 bucket(engineering)의 skill 은 marketplace.json matfia 항목 `skills` 와
   최상위 README.md 와 bucket README.md 에 모두 있다. harness/ 는 거기 없어야 한다.
3. 그 skills 경로가 실제로 있다.
"""
import json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROMOTED = ["engineering"]
NOT_SHIPPED = ["harness"]
fail = []

market = json.loads((ROOT / ".claude-plugin/marketplace.json").read_text())
# 플러그인 매니페스트는 marketplace.json 의 matfia 항목 하나다(plugin.json 없음 — 옛 이름 greatsumini-skills 별칭과 같은 폴더를 공유하려고)
plugin = next(p for p in market["plugins"] if p["name"] == "matfia")
shipped = {p.removeprefix("./").rstrip("/") for p in plugin["skills"]}
readme = (ROOT / "README.md").read_text()

for skill_md in sorted((ROOT / "skills").glob("*/*/SKILL.md")):
    d = skill_md.parent
    rel = d.relative_to(ROOT).as_posix()
    bucket, name = d.parent.name, d.name
    m = re.match(r"^---\n(.*?)\n---\n", skill_md.read_text(), re.S)
    if not m:
        fail.append(f"{rel}: frontmatter 없음"); continue
    keys = dict(re.findall(r"^([A-Za-z_-]+):\s*(.*)$", m.group(1), re.M))
    if keys.get("name", "").strip().strip("\"'") != name:
        fail.append(f"{rel}: frontmatter name 이 폴더명({name})과 다름")
    if not keys.get("description", "").strip():
        fail.append(f"{rel}: description 없음")
    if bucket not in PROMOTED + NOT_SHIPPED:
        fail.append(f"{rel}: 알 수 없는 bucket '{bucket}'")
    bucket_readme = d.parent / "README.md"
    if not bucket_readme.exists() or f"./{name}/SKILL.md" not in bucket_readme.read_text():
        fail.append(f"{rel}: skills/{bucket}/README.md 에 링크 없음")
    if bucket in PROMOTED:
        if rel not in shipped:
            fail.append(f"{rel}: marketplace.json matfia skills 에 없음")
        if f"./{rel}/SKILL.md" not in readme:
            fail.append(f"{rel}: 최상위 README.md 에 링크 없음")
    elif rel in shipped:
        fail.append(f"{rel}: {bucket}/ 는 플러그인에 넣지 않는다")

for p in shipped:
    if not (ROOT / p / "SKILL.md").exists():
        fail.append(f"marketplace.json: {p}/SKILL.md 가 없음")

if fail:
    print("\n".join(fail)); print(f"\n{len(fail)}건 실패"); sys.exit(1)
print("OK: 모든 skill 이 규약을 지킨다")
