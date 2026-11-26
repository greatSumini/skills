# Matfia skills

유튜브에서 소개한 Claude Code skill 모음. 작고 고치기 쉽게 만들고, 필요한 조각만 골라 쓴다.

## 설치 (30초)

플러그인은 알아서 업데이트되고, 심볼릭 링크는 `git pull`로, 복사 설치는 손으로 업데이트한다. 같은 skill이 두 번 보이지 않게 한 가지만 고른다.

<details open>
<summary><strong>Claude Code 플러그인</strong> (권장)</summary>

```bash
claude plugin marketplace add greatSumini/skills
claude plugin install matfia@matfia
```

skill은 `/matfia:domain-storytelling`, `/matfia:infra-map`처럼 플러그인 이름이 앞에 붙는다. 업데이트: `claude plugin marketplace update matfia`

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

모든 skill을 `~/.claude/skills`, `~/.agents/skills`에 링크한다. `git pull`만 하면 최신이 된다.

</details>

## Reference

### Engineering

- **[domain-storytelling](./skills/engineering/domain-storytelling/SKILL.md)**: 기획 전에 AI가 나를 인터뷰해 업무 흐름·문제·해결 범위를 `docs/DOMAIN.md`로 남기는 도메인 스토리텔링 워크숍.
- **[infra-map](./skills/engineering/infra-map/SKILL.md)**: 클라이언트·서버·외부 제공자 칸의 인프라 지도를 `docs/infra-map.json`으로 관리하고, 기능 하나의 요청이 지나가는 길(리퀘스트 플로우)을 손그림 지도로 그린다(의존성 없음).

<a href="https://www.star-history.com/#greatSumini/skills&Date">
 <picture>
   <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=greatSumini/skills&type=Date&theme=dark" />
   <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=greatSumini/skills&type=Date" />
   <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=greatSumini/skills&type=Date" />
 </picture>
</a>
