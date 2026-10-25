# Exam map: every CCDV-F objective → where you practise it

The 🟧 exam strand, laid out flat. Source: *Claude Certified Developer – Foundations Exam Guide* v1.0 (effective July 2026). Full text (your OCR) in [reference/Certified_Developer.md](../reference/Certified_Developer.md) and the original PDF in `reference/`, both local only and git-ignored.

**How to use this page**

- Before a step: find the step's objectives below so you know what you're really practising.
- After a step: tick the objective in the right-hand column only if you could explain it to someone without notes.
- Before the exam: anything unticked is your revision list. Weights tell you where the marks are.

Legend: **Build** = the main build covers it · **Side quest** = the step's optional 🧪 Exam side quest covers it · **Read** = reading only, no code.

---

## Domain weights at a glance

```
D2 Applications and Integration   ████████████████████████████████▏ 33.1%
D5 Model Selection & Optimization ████████████████▊                 16.8%
D1 Agents and Workflows           ██████████████▋                   14.7%
D6 Prompt & Context Engineering   ███████████                       11.0%
D8 Tools and MCPs                 ██████████▌                       10.6%
D7 Security and Safety            ████████                           8.1%
D3 Claude Code                    ███                                3.1%
D4 Eval, Testing, and Debugging   ██▌                                2.6%
```

---

## D1 Agents and Workflows (14.7%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **Agent Architecture** (4.5%) | Workflow vs agent decision criteria; manager/supervisor hierarchies; subagents | 04 Build (workflow vs agent concept + stretch comparison) · 08 Side quest (subagents in Claude Code) · Read: *Building effective agents* | [ ] |
| **Agent Construction with Claude** (5.3%) | Claude Agent SDK; custom loops and harnesses; managed deployment (self-hosted vs Anthropic-hosted); hooks for deterministic actions | 04 Build (hand-written loop) · 04 Side quest (SDK tool runner, Claude Agent SDK, Managed Agents reading) · 06 Build (guard = deterministic hook) · 08 Build (Claude Code hook) | [ ] |
| **Agent Patterns and Frameworks** (4.9%) | Tool-use loops, sub-agents, memory, context-window management; frameworks such as Strands, LangGraph, PydanticAI | 04 Build (tool-use loop) · 02 Build (history = memory, trimming) · 04 Side quest (read one framework's agent loop, map it to yours) | [ ] |

## D2 Applications and Integration (33.1%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **Understanding Requirements** (3.4%) | Turning business needs into functional and infrastructure requirements | Every step's *Why this matters* · 04 Build (define "healthy") · 07 Build (routing decision) · 08 Side quest (one-page requirements for hermes-ctl) | [ ] |
| **Systems Life Cycle** (2.8%) | Develop → implement → operate → maintain | Branch-per-step workflow · 08 Build (tests, CI) · 08 Side quest (lifecycle retrospective) | [ ] |
| **Claude API Mechanics** (6.8%) | Messages, tools, streaming, vision, thinking, caching, third-party vendors, data access patterns, batch, realtime vs batch | 01 Build (Messages API) · 01 Side quest (vision, token counting) · 02 Build (streaming) · 03 Build (structured outputs) · 04 Build (tools) · 07 Build (caching, effort/thinking) · 07 Side quest (Batches) · 00/01 (Bifrost = calling Claude through a third party) | [ ] |
| **Software Engineering Foundations** (7.4%) | REST, JSON, async, version control, SDLC, code review, refactoring | 00 Build (raw REST with `fetch`) · 01 Build (async) · 03 Build (JSON) · 05 Build (refactor into modules) · 08 Build (code review with Claude Code) · git throughout | [ ] |
| **Claude Application Design** (8.6%) | How Claude interprets instructions across interfaces (Claude Code, Desktop, claude.ai, API, SDKs); content boundaries; schema design; session hygiene; plugin management | 02 Build (system prompts) · 03 Build (schema design) · 05 Build (one server, several clients) · 06 Build (content boundaries for untrusted data) · 08 Build (sessions, plugins) | [ ] |
| **Configuration Management** (4.1%) | CLAUDE.md, settings.json, model version pinning, prompt versioning, plugin dependencies | 00 Build (`config.ts`, pinned package versions) · repo `CLAUDE.md` from day 1 · 08 Build (`.claude/settings.json`) · 07 Side quest (prompt versioning) | [ ] |

## D3 Claude Code (3.1%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **Claude Code Operation** (3.1%) | Rules, Skills, Commands, Agents, Agent Memory; session management; built-in and custom slash commands; headless mode; streaming mode; auto-mode; CLAUDE.md hierarchy; repo init; settings.json | Day 1: use `CLAUDE.md`, `/tutor-review`, `/exam-quiz` · 05 Build (`claude mcp add`) · 08 Build (write a skill and a hook, settings.json, headless `claude -p`) · 08 Side quest (subagents, CLAUDE.md hierarchy) | [ ] |

## D4 Eval, Testing, and Debugging (2.6%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **Debugging and Error Handling** (2.6%) | Error type identification; recovery strategy; trace analysis; isolating integration-layer vs model-output problems | 00 troubleshooting table · 01 *Break it* · 02 Build (what to retry) · 03 Build (harness proves itself) · 04 Build (tool errors) · 08 Build (debugging drill) | [ ] |

## D5 Model Selection and Optimization (16.8%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **LLM Fundamentals** (5.2%) | Tokens, context windows, sampling, non-determinism, next-token generation; fast mode, extended/adaptive thinking, effort; zero-shot, one-shot, few-shot prompting | 01 Build (tokens, `max_tokens`) · 03 Stretch (non-determinism) · 07 Build (effort + adaptive thinking, few-shot vs zero-shot classify) · 07 Read (fast mode) | [ ] |
| **Technical Fundamentals** (6.1%) | Working with SDKs that wrap REST APIs; websockets | 00 (raw `fetch`) vs 01 (SDK) on the *same* request · 02 (streaming = server-sent events) · 02 Side quest (SSE vs websockets) | [ ] |
| **Model Selection and Tradeoffs** (2.7%) | Opus vs Sonnet vs Haiku; adaptive thinking support; quality/latency/cost; breaking changes across releases | 07 Build (bench + routing) · 03 Build (forced `tool_choice` works on Haiku 4.5, returns 400 on newer models) | [ ] |
| **Cost and Token Management** (2.8%) | Usage tracking, cost modelling, prompt caching, cache checkpointing | 01 Build (usage footer) · 02 Build (`/tokens`) · 07 Build (cost table, caching) | [ ] |

## D6 Prompt and Context Engineering (11.0%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **Context Engineering** (3.8%) | Context window management; preventing drift and bloat (tool output pruning, compaction); context isolation via subagents or multi-step workflows | 02 Build (trimming) · 02 Stretch (summarising) · 02 Side quest (server-side compaction) · 04 Build (keep tool results small) · 08 Side quest (subagents isolate context) | [ ] |
| **Prompt Engineering** (4.6%) | Clear instructions, few-shot, system vs user placement, output constraints, placement across components, iterative refinement, input sanitisation | 01–02 Build (system prompts) · 03 Build (fixture prompt) · 04 Build (tool descriptions are prompts) · 05 Build (MCP prompt template) · 07 Build (iterating a classify prompt) | [ ] |
| **Output Handling** (2.6%) | Structured outputs, response validation, defensive parsing, scepticism toward confident output | 03 Build (structured outputs + Zod) · 04 Build (validate Proxmox JSON) | [ ] |

## D7 Security and Safety (8.1%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **AI Application Security** (3.2%) | Prompt injection, jailbreaks, untrusted input, data leakage, PII; authN, authZ, confidentiality, integrity | 03 Build (PII redaction proof) · 03 Stretch (injection case) · 06 Build (injection test, HTTP auth) | [ ] |
| **Guardrails and Safe Deployment** (2.3%) | Guardrail layering; secure-by-design; least privilege | 04 Build (read-only Proxmox token) · 06 Build (layers, approval gate, allow-lists) | [ ] |
| **Claude Hooks** (1.0%) | Hooks that block destructive actions | 06 Build (your guard is the same idea) · 08 Build (a real Claude Code `PreToolUse` hook) | [ ] |
| **Identity, Secrets, and Key Management** (1.6%) | Keys across dev/prod, identity validation, access approval, access monitoring | 00 Build (`.env`, validation) · 06 Build (separate tokens, audit log, timing-safe compare) | [ ] |

## D8 Tools and MCPs (10.6%)

| Objective (weight) | What it means | Where | ✔ |
|---|---|---|---|
| **Tool Implementation** (4.4%) | Tool use, external system config, tool descriptions, error handling, dispatch, client-side vs server-side tools, approval patterns, tool-set construction | 04 Build (two tools, registry, `is_error`) · 04 Side quest (a server tool such as web search) · 06 Build (approval pattern) | [ ] |
| **MCP Server Development** (2.1%) | Authoring, deployment, integration; resources, tools, prompts; stdio, sockets, client vs server | 05 Build (stdio server, all three primitives, real clients) · 06 Build (HTTP transport) · `playground/mcp-hello` | [ ] |
| **Agentic Customization** (4.1%) | Choosing between built-in tools, custom tools, Skills and MCP for a use case | 05 Build (decision table: when MCP vs a custom tool vs a Skill vs a built-in tool) · 08 Build (write a Skill, compare it with your MCP server) | [ ] |

---

## Sample questions from the guide

The guide has three sample items (Section 8 of [Certified_Developer.md](../reference/Certified_Developer.md)). Each one maps to something you build:

| Sample | Topic | You'll have built… |
|---|---|---|
| 1 (D2) | 10,000 overnight documents → Message Batches API | 07 Side quest: run your classify set through Batches |
| 2 (D7) | Hidden prompt injection in a web page → treat as untrusted, guardrails/hooks | 06 Build: the injection test stopped by your approval gate |
| 3 (D8) | Reusable access to an internal REST API → MCP server | 05 Build: Proxmox and Hermes exposed via MCP to several clients |

Try them *before* step 01 and again after step 08. Notice how differently you reason about them.

---

## Revision plan (after step 08)

1. Re-answer every step's **Exam check** without notes. Mark misses.
2. Go down this page. Untick anything you can't explain out loud.
3. Ask Claude Code: `/exam-quiz D5` (or any domain) for fresh exam-style questions.
4. Take a full mock exam. Spend the remaining time on weak domains **in proportion to their weight**.
