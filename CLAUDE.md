# 레포 규약

skill 은 `skills/<bucket>/<skill-name>/SKILL.md` 에 둔다. bucket:

- `engineering/`: 코드 작업에 매일 쓰는 것
- `productivity/`: 코드 밖 업무 도구
- `claude-code/`: Claude Code 자산 제작·분석 도구
- `harness/`: 프로젝트에 발판을 같이 깔아야 하는 하네스 skill. **플러그인에 넣지 않고** `prompt/` 이식 프롬프트로 복사 설치한다.

새 skill 을 추가·이동·이름 변경할 때 같이 고친다:

1. SKILL.md frontmatter 에 `name`(폴더명과 같게)·`description`.
2. 그 bucket 의 `README.md` 에 한 줄(이름을 SKILL.md 로 링크).
3. `harness/` 가 아니면 최상위 `README.md` Reference 와 `.claude-plugin/plugin.json` 의 `skills` 배열에도 추가. 플러그인 내용을 바꾸면 `plugin.json` 의 `version` 을 올린다(설치된 쪽은 version 이 바뀌어야 업데이트를 받는다).
4. `python3 scripts/check-skills.py` 와 `claude plugin validate . --strict` 를 통과시킨다. CI(`.github/workflows/check.yml`)가 앞의 것을 다시 돌린다.

skill 안에서 자기 폴더의 스크립트·파일을 부를 때는 `<skill-dir>/scripts/...` 로 쓴다(`<skill-dir>` = 그 SKILL.md 가 있는 디렉토리). `.claude/skills/<name>/...` 처럼 설치 위치를 가정한 경로를 쓰지 않는다. 플러그인 설치에서는 skill 폴더가 읽기 전용 캐시에 있으므로 토큰·설정 같은 사용자 파일은 `~/.config/<skill-name>/` 에 둔다.

sub-agent 는 `agents/` 에 둔다(플러그인이 같이 싣는다).
