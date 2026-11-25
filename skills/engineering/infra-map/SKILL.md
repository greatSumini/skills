---
name: infra-map
description: 서비스의 인프라 지도(클라이언트 · 서버 · 외부 제공자 칸에 어떤 노드가 있고 어떻게 이어지는지)를 docs/infra-map.json으로 관리하고 손그림 지도로 그린다. 기능 하나를 만들기 전에 그 요청이 어느 노드를 어떤 순서로 지나가는지 리퀘스트 플로우으로 그린다. "인프라 맵", "인프라 지도", "infra map", "리퀘스트 플로우", "request flow", "리퀘스트 플로우", "요청 흐름 그려줘", "이 기능 요청이 어디를 지나가?", "노드 추가해줘" 등에 트리거된다.
---

# infra-map

두 가지를 한다.

1. **인프라 맵** — 이 서비스에 어떤 노드(웹·서버·DB·스토리지·외부 서비스)가 있고 어떻게 이어지는지. 원본은 레포의 `docs/infra-map.json` 하나다.
2. **리퀘스트 플로우**(옛 이름 리퀘스트 맵, 2026-11-26 개명) — 기능(도메인 스토리의 장면) 하나에서 요청이 어느 노드를 어떤 순서로 지나가는지. 인프라 맵 위에 번호 붙은 빨간 화살표로 겹쳐 그린다. **레포에 저장하지 않는다** — 코드가 생기면 코드에서 다시 읽을 수 있다. 그때그때 그려서 보여 준다.

이 skill만 레포에 넣어 쓰려면(플러그인 없이, `/infra-map`으로 부른다): `npx degit greatSumini/skills/skills/engineering/infra-map .claude/skills/infra-map`

리퀘스트 플로우은 기능을 만드는 첫 단계다. 이걸 그린 다음에 화면·API(경로·요청·응답) → ERD → 테스트 → 구현 순으로 간다.

## 인프라 맵 (`docs/infra-map.json`)

없으면 `<skill-dir>/templates/infra-map.json`을 복사하고(`<skill-dir>` = 이 SKILL.md가 있는 디렉토리), 레포(패키지 구성·배포 설정·환경변수 이름·외부 SDK)를 읽어 실제 노드로 고친다. 코드에서 확정할 수 없는 것(배포 위치·도메인)은 사용자에게 한 번에 묻는다.

```json
{ "nodes": [
  { "name": "User Web", "note": "(멤버용)\napp.example.com", "zone": "client", "stack": "Next.js", "deploy": "Vercel", "to": ["Server", "Google"] },
  { "name": "Server", "zone": "server", "stack": "Nest.js", "deploy": "Railway", "to": ["Database"], "risks": ["관리자 API가 같은 서버에 있음"] },
  { "name": "Database", "zone": "external", "deploy": "Supabase" },
  { "name": "Google", "note": "(로그인)", "zone": "external", "direct": true, "deploy": "OAuth" }
]}
```

| 필드 | 뜻 |
|---|---|
| `name` | 노드 이름. 리퀘스트 플로우이 이 이름으로 가리킨다 |
| `note` | 상자 안 둘째 줄부터 — 누가 쓰나(멤버용·운영진용), 도메인 |
| `zone` | `client`(사용자 기기에서 돈다) · `server`(우리가 운영하는 서버) · `external`(남이 운영하는 것 — DB·스토리지 서비스 포함) |
| `stack` · `deploy` | 기술과 배포 위치 |
| `to` | 이 노드가 부르는 노드 |
| `risks` | 이 노드에서 조심할 것. 빨간 글씨로 보인다 |
| `direct` | 브라우저(클라이언트)가 직접 여는 외부 — 로그인 제공자(Google·카카오)·결제창(토스·Payple·Stripe Checkout)이면 `true`. 옛 이름 `auth`도 받는다 |

규칙 — `--check`가 잡는다.

- 연결은 **client → server → external** 방향만 쓴다.
- 클라이언트가 외부를 직접 부르는 건 브라우저가 직접 여는 곳(`direct: true` — 로그인·결제창)뿐이다. 나머지는 서버를 거친다. 이런 노드는 외부 칸 맨 위에 그려진다.
- Google 로그인처럼 웹 화면과 서버가 따로 있는 외부 서비스도 **노드 하나**로 그린다.
- Supabase Auth·Clerk·Auth0처럼 **로그인을 중개하는 서비스**가 있으면 클라이언트는 중개자를 부르고, 중개자가 Kakao·Google을 부른다. 중개자에 `direct: true`를 붙이고 `to`에 제공자를 적는다(제공자는 `direct`를 빼고, 오른쪽 칸에 그려진다). 클라이언트에서 Kakao·Google로 바로 잇지 않는다.

노드를 더하거나 바꾸면 json을 고치고 그려서 보여 준다.

## 리퀘스트 플로우

장면 하나("구글로 가입·로그인한다")를 받으면 단계를 임시 파일에 적고 겹쳐 그린다.

```json
{ "name": "구글로 가입·로그인한다", "steps": [
  { "from": "User Web", "to": "Google", "label": "구글 로그인 창으로 보낸다" },
  { "from": "Google", "to": "User Web", "label": "콜백 URL로 돌아온다 (검증용 값 포함)" },
  { "from": "User Web", "to": "Server", "label": "콜백 값 전체를 보낸다" },
  { "from": "Server", "to": "Google", "label": "값이 진짜인지 검증한다" },
  { "from": "Server", "to": "Database", "label": "유저를 찾거나 만든다" },
  { "from": "Server", "to": "User Web", "label": "토큰 발급 + type(로그인/가입)" }
]}
```

- 한 단계 = 노드 하나에서 다른 노드로 가는 요청 또는 응답 하나. 응답이 그 장면에서 의미가 있을 때만(토큰을 받는다 등) 단계로 적는다.
- 인프라 맵에 없는 노드나 연결(어느 방향으로도 `to`에 없는 두 노드)이 필요하면 **먼저 인프라 맵에 넣자고 하고** 넣은 뒤 그린다. 스크립트가 경고한다(응답처럼 반대 방향 단계는 괜찮다). 예: AI 앱이 브라우저로 로그인 화면을 열면 AI 앱 `to`에 웹을 넣는다.
- 다 그리면 그림 아래에 이 흐름에서 **실패하거나 위조될 수 있는 단계**를 짚어 한두 줄로 묻는다. 예: "2단계 콜백 값을 누가 조작하면 4단계에서 막히나요?"

## 그리기

```bash
node <skill-dir>/scripts/infra-view.mjs docs/infra-map.json                       # 인프라 맵
node <skill-dir>/scripts/infra-view.mjs docs/infra-map.json --flow /tmp/login.json     # 리퀘스트 플로우
node <skill-dir>/scripts/infra-view.mjs docs/infra-map.json --check                # 규칙 검사만
```

- 리퀘스트 플로우 html은 **단계 보기**로 열린다 — 한 번에 선 하나와 설명 한 줄만 보이고, 그 단계의 두 노드만 진하게 남는다. ←/→(폰은 화면 오른쪽·왼쪽 탭)로 이동하고 0단계는 전체 보기다. 주소 끝 `#3`처럼 단계를 붙이면 그 단계로 바로 열린다. png는 전체 보기로 찍힌다.
- `.excalidraw`·`.html`을 임시 폴더에 만들고 html을 브라우저로 연다. `.excalidraw`는 excalidraw.com에 끌어다 놓으면 그대로 열려서 손으로 고칠 수 있다.
- `--png`면 크롬 헤드리스로 PNG까지 찍는다(문서·노트에 붙일 때). `--out 경로`로 저장 위치를 정한다.
- 의존성이 없다. 손그림 선은 스크립트가 직접 그리고, 글씨체는 `<skill-dir>/fonts/`의 손글씨 폰트(Excalifont·Gaegu, OFL)를 싣는다. 인터넷·npm 설치가 필요 없다.
