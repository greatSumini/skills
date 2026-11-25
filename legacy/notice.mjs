#!/usr/bin/env node
// 옛 플러그인 greatsumini-skills: 세션 시작 때 새 이름 matfia로 옮기라고 알린다. 실패해도 세션을 막지 않는다.
process.stdout.write(JSON.stringify({
  systemMessage:
    "greatsumini-skills 플러그인 이름이 matfia로 바뀌었어요. 옮겨 주세요 → claude plugin marketplace add greatSumini/skills && claude plugin install matfia@matfia && claude plugin uninstall greatsumini-skills (skill은 /matfia:infra-map 처럼 부릅니다)",
}));
process.exit(0);
