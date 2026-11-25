# Harness

프로젝트에 **복사해서** 쓰는 자율 주행 하네스용 skill. 타겟 프로젝트에 `docs/`, `persuasion-data/`, `scripts/run-phases.py` 같은 발판이 있어야 동작하므로 플러그인에는 넣지 않는다. 설치는 [`prompt/`](../../prompt/) 의 이식 프롬프트로 한다.

- **[plan-and-build](./plan-and-build/SKILL.md)**: 요구사항 → task/phase 분해 → `scripts/run-phases.py` 실행까지 자동화한다.
- **[ideation](./ideation/SKILL.md)**: 페르소나 시뮬 결과로 다음 요구사항 1개를 도출하고 `tech-critic-lead` 결재를 받는다.
- **[persuasion-review](./persuasion-review/SKILL.md)**: 잠재고객 페르소나로 서비스·신규 기능의 설득력을 다중 headless 세션으로 시뮬한다.
- **[harness-starter](./harness-starter/SKILL.md)**: clarify → context-gather → plan → implement → verify 5단계 오케스트레이터. 이식: [`install-harness-starter.md`](./harness-starter/prompt/install-harness-starter.md)
- **[commit](./commit/SKILL.md)**: 대화 맥락을 근거로 변경을 의미 단위로 나눠 커밋하고 push 한다. `HARNESS_HEADLESS=1` 무인 모드를 지원한다. 자율 주행 하네스가 쓴다.

`agents/tech-critic-lead.md`: ideation·plan-and-build 가 결재를 받는 sub-agent. 이식할 때 타겟의 `.claude/agents/`로 복사한다.
