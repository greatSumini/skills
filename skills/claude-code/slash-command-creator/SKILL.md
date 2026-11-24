---
name: slash-command-creator
description: Guide for creating Claude Code slash commands. Use when the user wants to create a new slash command, update an existing slash command, or asks about slash command syntax, frontmatter options, or best practices.
---

# Slash Command Creator

> 아래 경로의 `<skill-dir>`는 이 SKILL.md가 있는 디렉토리다 (Claude Code가 skill을 불러올 때 "Base directory for this skill"로 알려 준다). 플러그인·심볼릭 링크·프로젝트 복사 어느 설치 방식에서도 같은 명령이 통한다.

Create custom slash commands for Claude Code to automate frequently-used prompts.

## Quick Start

Initialize a new command:
```bash
<skill-dir>/scripts/init_command.py <command-name> [--scope project|personal]
```

## Command Structure

Slash commands are Markdown files with optional YAML frontmatter:

```markdown
---
description: Brief description shown in /help
---

Your prompt instructions here.

$ARGUMENTS
```

### File Locations

| Scope    | Path                    | Shown as           |
|----------|-------------------------|-------------------|
| Project  | `.claude/commands/`     | (project)         |
| Personal | `~/.claude/commands/`   | (user)            |

### Namespacing

Organize commands in subdirectories:
- `.claude/commands/frontend/component.md` → `/component` shows "(project:frontend)"
- `~/.claude/commands/backend/api.md` → `/api` shows "(user:backend)"

## Features

### Arguments

**All arguments** - `$ARGUMENTS`:
```markdown
Fix issue #$ARGUMENTS following our coding standards
# /fix-issue 123 → "Fix issue #123 following..."
```

**Positional** - `$1`, `$2`, etc.:
```markdown
Review PR #$1 with priority $2
# /review 456 high → "Review PR #456 with priority high"
```

### Bash Execution

Execute shell commands with `!` prefix (requires `allowed-tools` in frontmatter):

```markdown
---
allowed-tools: Bash(git status:*), Bash(git diff:*)
---

Current status: !`git status`
Changes: !`git diff HEAD`
```

### File References

Include file contents with `@` prefix:

```markdown
Review @src/utils/helpers.js for issues.
Compare @$1 with @$2.
```

## Frontmatter Options

| Field                     | Purpose                                | Required |
|---------------------------|----------------------------------------|----------|
| `description`             | Brief description for /help            | Yes      |
| `allowed-tools`           | Tools the command can use              | No       |
| `argument-hint`           | Expected arguments hint                | No       |
| `model`                   | Specific model to use                  | No       |
| `disable-model-invocation`| Prevent SlashCommand tool invocation   | No       |

See [references/frontmatter.md](references/frontmatter.md) for detailed reference.

## Examples

See [references/examples.md](references/examples.md) for complete examples including:
- Simple review/explain commands
- Commands with positional arguments
- Git workflow commands with bash execution
- Namespaced commands for frontend/backend

## Creation Workflow

1. **Identify the use case**: What prompt do you repeat often?
2. **Choose scope**: Project (shared) or personal (private)?
3. **Initialize**: Run `<skill-dir>/scripts/init_command.py <name>`
4. **Edit**: Update description and body
5. **Test**: Run the command in Claude Code
