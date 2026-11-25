# Matfia skills

매일 쓰는 Claude Code skill · sub-agent · 하네스 자산 모음. 작고 고치기 쉽게 만들고, 필요한 조각만 골라 쓴다.

## 설치 (30초)

플러그인은 알아서 업데이트되고, 심볼릭 링크는 `git pull`로, 복사 설치는 손으로 업데이트한다. 같은 skill이 두 번 보이지 않게 한 가지만 고른다.

<details open>
<summary><strong>Claude Code 플러그인</strong> (권장)</summary>

```bash
claude plugin marketplace add greatSumini/skills
claude plugin install matfia@matfia
```

skill은 `/matfia:commit`, `/matfia:infra-map`처럼 플러그인 이름이 앞에 붙는다. 업데이트: `claude plugin marketplace update matfia`

마피아MCP(판단 카드 MCP, 하루 10회 무료) 연결도 같이 들어 있다. 다시 켠 뒤 `/mcp`에서 matfia-brain 로그인을 하면 쓸 수 있다.

> 예전 이름 `greatsumini-skills@greatsumini` 또는 마피아MCP 플러그인 `matfia@matfia-brain-plugin`을 쓰고 있었다면 지우고 위 명령으로 다시 설치한다:
> `claude plugin uninstall greatsumini-skills` / `claude plugin uninstall matfia@matfia-brain-plugin`

</details>

<details>
<summary><strong>다른 에이전트, 또는 고쳐 쓸 파일로 복사</strong> (수동 업데이트)</summary>

```bash
npx skills@latest add greatSumini/skills            # 설치할 skill을 고른다
npx skills@latest add greatSumini/skills -a cursor  # 에이전트 지정: cursor, codex, opencode ...
```

업데이트는 `npx skills@latest update`.

</details>

<details>
<summary><strong>이 레포를 직접 고치면서 쓰기</strong> (심볼릭 링크)</summary>

```bash
git clone https://github.com/greatSumini/skills ~/repos/greatSumini/skills
~/repos/greatSumini/skills/scripts/link-skills.sh
```

`skills/harness/`를 뺀 모든 skill을 `~/.claude/skills`, `~/.agents/skills`에 링크한다. `git pull`만 하면 최신이 된다.

</details>

`skills/harness/`의 skill은 프로젝트에 발판(`docs/`, `persuasion-data/`, `scripts/`)을 같이 깔아야 해서 플러그인에 없다. 아래 [하네스 이식](#하네스-이식)의 프롬프트로 설치한다.

## Reference

### Engineering

코드 작업에 매일 쓰는 skill.

- **[commit](./skills/engineering/commit/SKILL.md)**: 대화 맥락을 근거로 변경을 의미 단위로 나눠 커밋하고 push 한다. `HARNESS_HEADLESS=1` 무인 모드를 지원한다.
- **[ship](./skills/engineering/ship/SKILL.md)**: 커밋 → push → PR 생성 → squash merge 를 한 번에 한다.
- **[domain-storytelling](./skills/engineering/domain-storytelling/SKILL.md)**: 기획 전에 AI가 나를 인터뷰해 업무 흐름·문제·해결 범위를 `docs/DOMAIN.md`로 남기는 도메인 스토리텔링 워크숍.
- **[infra-map](./skills/engineering/infra-map/SKILL.md)**: 클라이언트·서버·외부 제공자 칸의 인프라 지도를 `docs/infra-map.json`으로 관리하고, 기능 하나의 요청이 지나가는 길(리퀘스트 맵)을 손그림 지도로 그린다(의존성 없음).

### Productivity

코드 밖 업무 도구.

- **[gmail](./skills/productivity/gmail/SKILL.md)**: gogcli 로 Gmail 을 검색·조회·발송한다.
- **[google-calendar](./skills/productivity/google-calendar/SKILL.md)**: gogcli 로 Google Calendar 일정을 조회·생성·수정·삭제한다.
- **[email-draft](./skills/productivity/email-draft/SKILL.md)**: 비즈니스 메일·답장 초안을 쓸 때의 글쓰기 매너.
- **[transcribe](./skills/productivity/transcribe/SKILL.md)**: 로컬 오디오 파일(m4a 등)을 한국어로 전사한다.
- **[youtube-collector](./skills/productivity/youtube-collector/SKILL.md)**: 유튜브 채널을 등록하고 새 영상을 모아 자막 기반 요약을 만든다.
- **[discord-message](./skills/productivity/discord-message/SKILL.md)**: Discord 봇으로 나에게 DM 을 보낸다.

### Claude Code

Claude Code 자산을 만들고 사용 이력을 분석하는 도구.

- **[skill-creator](./skills/claude-code/skill-creator/SKILL.md)**: 새 skill 을 설계·생성·패키징한다.
- **[slash-command-creator](./skills/claude-code/slash-command-creator/SKILL.md)**: slash command 를 만든다.
- **[subagent-creator](./skills/claude-code/subagent-creator/SKILL.md)**: 전용 sub-agent 를 만든다.
- **[hook-creator](./skills/claude-code/hook-creator/SKILL.md)**: Claude Code hook 을 만들고 설정한다.
- **[cc-usage-audit](./skills/claude-code/cc-usage-audit/SKILL.md)**: 한 프로젝트의 Claude Code 프롬프트 이력을 분석해 사용 패턴·개발 철학·개선점을 뽑는다.

### Harness (복사 설치, 플러그인 미포함)

- **[plan-and-build](./skills/harness/plan-and-build/SKILL.md)**: 요구사항 → task/phase 분해 → `scripts/run-phases.py` 실행까지 자동화한다.
- **[ideation](./skills/harness/ideation/SKILL.md)**: 페르소나 시뮬 결과로 다음 요구사항 1개를 도출하고 `tech-critic-lead` 결재를 받는다.
- **[persuasion-review](./skills/harness/persuasion-review/SKILL.md)**: 잠재고객 페르소나로 설득력을 다중 headless 세션으로 시뮬한다.
- **[harness-starter](./skills/harness/harness-starter/SKILL.md)**: clarify → context-gather → plan → implement → verify 5단계 오케스트레이터.

### Sub-agents

플러그인 설치 시 같이 들어온다.

- **[tech-critic-lead](./agents/tech-critic-lead.md)**: "기능은 비용" 전제의 비판적 CTO.
- **[brand-logo-finder](./agents/brand-logo-finder.md)**: 브랜드 로고 파일을 찾아온다.

## 레포 구조

```
skills/
  engineering/ productivity/ claude-code/   플러그인에 들어가는 skill (bucket별 README.md)
  harness/                                  복사 설치용 하네스 skill
agents/                  sub-agent (플러그인에 포함)
.claude-plugin/          marketplace.json (플러그인 매니페스트 matfia + 옛 이름 별칭)
scripts/
  link-skills.sh         심볼릭 링크 설치
  check-skills.py        규약 검사 (CI에서 실행)
  run-server.py · run-phases.py · gen-docs-diff.py · _utils.py   자율 주행 하네스 실행기
prompt/                  하네스 이식 프롬프트
prompts/task-create.md   plan-and-build 이 따르는 task/phase 규격
findings-cycles-goals/   gate 기반 빌드 하네스 이식 키트
docs/cc/                 Claude Code hook · slash-command · sub-agent 참고 문서
```

skill 추가·이동 규칙은 [CLAUDE.md](./CLAUDE.md).

## 하네스 이식

### persuasion-review 단일 이식

[`prompt/install-persuasion-review.md`](prompt/install-persuasion-review.md) 의 내용을 타겟 프로젝트에서 연 Claude Code 세션에 그대로 붙여넣는다. Claude 가 이 레포를 얕은 clone 해서 필요한 파일을 복사하고, 프로젝트의 기동 방식에 맞춘 `ux_probe_adapter.py` 까지 써준다.

### 자율 주행 하네스 전체 이식

[`prompt/install-harness.md`](prompt/install-harness.md) 를 타겟 프로젝트 Claude Code 세션에 붙여넣으면 아래 파일 전체를 clone → 복사하고 필요한 데이터 디렉토리까지 스캐폴드한다.

복사 대상 (수동으로 체크하고 싶다면):

- `skills/harness/{persuasion-review, ideation, plan-and-build}/`, `skills/engineering/commit/` → 타겟의 `.claude/skills/` (4개 skill 통째)
- `agents/tech-critic-lead.md` → 타겟의 `.claude/agents/`
- `scripts/run-server.py`, `scripts/run-phases.py`, `scripts/gen-docs-diff.py`, `scripts/_utils.py`
- `prompts/task-create.md`

타겟 프로젝트가 추가로 갖춰야 할 것:

- `docs/{mission,spec,testing,user-intervention}.md` — plan-and-build 이 읽는 컨텍스트
- `persuasion-data/personas/<1명 이상>/profile.md` — ideation 시뮬 대상
- `persuasion-data/probe_tasks.md` + `persuasion-data/ux_probe_adapter.py` — UX probe 용 (install-persuasion-review 프롬프트가 프로젝트별로 작성)
- git 초기 커밋 1개 이상 — rollback 타겟용
- `claude` CLI 설치 + 로그인

`HARNESS_HEADLESS=1` 이 무인 모드 시그널이다. (레거시로 `BET_HEADLESS` 도 fallback 으로 수용됨 — 추후 제거 예정.)

### findings → cycles → goals 빌드 하네스 이식

[`vibemafiaclub/vooster`](https://github.com/vibemafiaclub/vooster) 가 쓰는 **gate 기반 자율 빌드 하네스**를 스택 중립으로 추출한 키트(`findings-cycles-goals/`)다. 위의 `install-harness` (ideation→build 루프)와는 별개의 시스템으로, 루핑 에이전트가 **machine-verified gate** 로 "완료"를 증명하며 미션 스택을 쌓아 올린다.

[`prompt/install-findings-cycles-goals.md`](prompt/install-findings-cycles-goals.md) 를 타겟 프로젝트 Claude Code 세션에 붙여넣으면 `findings-cycles-goals/` 의 자산을 clone → 복사하고, `_meta` 검사와 goal 0 을 타겟 스택에 맞게 적응시킨 뒤 검증까지 한다.

3-자산 모델:

- **findings** (`docs/findings/`) — out-of-scope 발견을 잃지 않는 부채/통찰 큐 (검증 없음).
- **cycles** (`cycles/`) — 무한 루프 에이전트에 넘기는 한 세션 프롬프트 (이력).
- **goals** (`goals/`) — `<n>-<name>.{md,gates.sh,next-task.sh}` 세 파일/goal. 가장 낮은 번호의 실패 goal 이 active. `scripts/completion-check.sh` 가 전체 체인을 병렬 검증한다.

설계·규약 단일 출처는 키트 안의 `docs/goal-design.md`, `guidelines/goal-iteration.md`, 각 폴더 `AGENTS.md` 다. 자세한 매핑은 [`findings-cycles-goals/README.md`](findings-cycles-goals/README.md).
