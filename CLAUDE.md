# 레포 규약

skill 은 `skills/<bucket>/<skill-name>/SKILL.md` 에 둔다. bucket:

- `engineering/`: 코드 작업에 매일 쓰는 것
- `productivity/`: 코드 밖 업무 도구
- `claude-code/`: Claude Code 자산 제작·분석 도구
- `harness/`: 프로젝트에 발판을 같이 깔아야 하는 하네스 skill. **플러그인에 넣지 않고** `prompt/` 이식 프롬프트로 복사 설치한다.

새 skill 을 추가·이동·이름 변경할 때 같이 고친다:

1. SKILL.md frontmatter 에 `name`(폴더명과 같게)·`description`.
2. 그 bucket 의 `README.md` 에 한 줄(이름을 SKILL.md 로 링크).
3. `harness/` 가 아니면 최상위 `README.md` Reference 와 `.claude-plugin/marketplace.json` 의 `matfia` 항목 `skills` 배열에도 추가. 플러그인 내용을 바꾸면 그 항목의 `version` 을 올린다(설치된 쪽은 version 이 바뀌어야 업데이트를 받는다). 옛 이름 별칭 `greatsumini-skills` 항목의 `skills`·`version`도 같이 맞춘다.
4. `python3 scripts/check-skills.py` 와 `claude plugin validate . --strict` 를 통과시킨다. CI(`.github/workflows/check.yml`)가 앞의 것을 다시 돌린다.

skill 안에서 자기 폴더의 스크립트·파일을 부를 때는 `<skill-dir>/scripts/...` 로 쓴다(`<skill-dir>` = 그 SKILL.md 가 있는 디렉토리). `.claude/skills/<name>/...` 처럼 설치 위치를 가정한 경로를 쓰지 않는다. 플러그인 설치에서는 skill 폴더가 읽기 전용 캐시에 있으므로 토큰·설정 같은 사용자 파일은 `~/.config/<skill-name>/` 에 둔다.

sub-agent 는 `agents/` 에 둔다(플러그인이 같이 싣는다).

플러그인 이름은 `matfia`(마켓플레이스도 `matfia`)다 — 마피아MCP(MCP 서버 `matfia-brain`)와 세션 시작 원칙 훅(`plugin-hooks/inject.mjs`)을 같이 싣는다. 마피아MCP의 plan·design·review·teach는 skill로 싣지 않는다(2026-11-26 최수민 — skill이 너무 많이 보인다. MCP `get_skill`로 받는다). **매니페스트는 `plugin.json`이 아니라 `marketplace.json` 항목(`strict: false`)에 둔다** — 옛 이름 `greatsumini-skills`(2026-11-25까지의 이름) 별칭이 같은 폴더를 쓰는데, `plugin.json`이 있거나 루트에 `hooks/`가 있으면 Claude Code가 매니페스트 충돌로 둘 다 못 띄운다. 별칭은 같은 skill과 옮기라는 알림 훅(`legacy/notice.mjs`)만 싣는다. 훅은 서버의 공개 원칙 요약만 받는다. MCP 서버 이름 `matfia-brain`은 회원 설정과 도구 이름(`mcp__plugin_matfia_matfia-brain__*`)이 걸려 있어 바꾸지 않는다.
