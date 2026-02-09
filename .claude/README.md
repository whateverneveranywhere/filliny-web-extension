# Claude Code Configuration

This directory contains Claude Code hooks, agents, and configuration for the Filliny project.

## Configured Hooks

### 1. Automatic ESLint Formatting (`lint-on-change.sh`)

**Triggers**: After `Write`, `Edit`, or `MultiEdit` tool use on TypeScript/JavaScript files

**Features**:
- Automatically runs `bun run lint:fix` on modified files
- Runs TypeScript type checking for `.ts`/`.tsx` files
- Blocks execution if ESLint errors are found
- Caches results to avoid repeated linting
- Skips non-lintable files and directories

**Supported Extensions**: `.ts`, `.tsx`, `.js`, `.jsx`

**Blocked Patterns**:
- `/node_modules/`, `/dist/`, `/build/`
- `/.claude/`, `/migrations/`
- `.d.ts`, `cloudflare-env.d.ts`

### 2. Task Completion Notifications (`notify-completion.sh`)

**Triggers**:
- After `Task` tool use (subagent completion)
- On `Stop` event (main Claude completion)
- On `SubagentStop` event

**Features**:
- Cross-platform notification sound (macOS Ping, Linux system sounds, Windows beep)
- Visual feedback in Claude Code transcript

## Agents

### Backend Agent (`agents/backend-agent.md`)

Specialized for Hono + Cloudflare Workers + Drizzle ORM development.

**Skills**: drizzle-orm-d1, cloudflare-d1, cloudflare, cloudflare-kv, cloudflare-r2, wrangler, using-drizzle-queries, hono, hono-rpc, ai-sdk-core, posthog-analytics, software-architecture, better-auth

### Frontend Agent (`agents/frontend-agent.md`)

Specialized for TanStack Start + shadcn/ui + TanStack Query development.

**Skills**: shadcn-ui, tanstack-query, react-hook-form-zod, zustand-state-management, react-state-management, component-refactoring, react-modernization, motion, ai-sdk, posthog-analytics, seo-audit, software-architecture

## Skills

Skills are loaded from `.agents/skills/` and symlinked to `.claude/skills/`. Invoke via `/skill-name` syntax.

| Category | Skills |
|----------|--------|
| **Backend** | cloudflare, cloudflare-d1, cloudflare-kv, cloudflare-r2, drizzle-orm-d1, using-drizzle-queries, hono, hono-rpc, wrangler, better-auth |
| **Frontend** | shadcn-ui, tanstack-query, react-hook-form-zod, zustand-state-management, react-state-management, component-refactoring, react-modernization, motion |
| **AI** | ai-sdk, ai-sdk-core, posthog-analytics |
| **Architecture** | software-architecture, seo-audit |

## File Structure

```
.claude/
├── settings.json              # Hook configuration
├── settings.local.json        # Local permissions (gitignored)
├── agents/
│   ├── backend-agent.md       # Backend development agent
│   └── frontend-agent.md      # Frontend development agent
├── hooks/
│   ├── notify-completion.sh   # Notification bash script
│   └── lint-on-change.sh      # ESLint automation bash script
├── skills/                    # Symlinks to .agents/skills/
├── .cache/                    # ESLint cache (gitignored)
└── README.md                  # This documentation

.agents/
└── skills/                    # Skill definitions (gitignored)
```

## Performance Notes

- Hooks run in parallel when multiple match
- 60-second timeout for linting operations
- 10-second timeout for notifications
- Caching prevents repeated linting of unchanged files
- Files > 500KB are skipped

## Debugging

Run Claude Code with debug mode:

```bash
claude --debug
```

View hook execution in transcript mode (Ctrl-R).
