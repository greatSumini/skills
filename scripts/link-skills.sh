#!/usr/bin/env bash
# 이 레포를 직접 고치면서 쓰는 사람용(메인테이너) 설치 스크립트.
# 모든 skill 을 ~/.claude/skills 와 ~/.agents/skills 에 심볼릭 링크로 건다.
# 링크라서 `git pull` 만 하면 최신이 된다. skill 을 추가·삭제·이름 변경한 뒤 다시 실행한다.
set -euo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
DESTS=("$HOME/.claude/skills" "$HOME/.agents/skills")

names=(); srcs=()
while IFS= read -r -d '' skill_md; do
  src="$(dirname "$skill_md")"
  names+=("$(basename "$src")"); srcs+=("$src")
done < <(find "$REPO/skills" -name SKILL.md -print0)

for DEST in "${DESTS[@]}"; do
  if [ -L "$DEST" ]; then
    case "$(readlink -f "$DEST")" in
      "$REPO"|"$REPO"/*) echo "error: $DEST 가 이 레포를 가리키는 링크다. 지우고 다시 실행한다." >&2; exit 1 ;;
    esac
  fi
  mkdir -p "$DEST"
  for i in "${!names[@]}"; do
    target="$DEST/${names[$i]}"
    if [ -e "$target" ] && [ ! -L "$target" ]; then
      echo "skip ${names[$i]}: $target 에 링크가 아닌 폴더가 이미 있다 (직접 정리 후 재실행)" >&2
      continue
    fi
    ln -sfn "${srcs[$i]}" "$target"
    echo "linked ${names[$i]} -> ${srcs[$i]} ($DEST)"
  done
done
