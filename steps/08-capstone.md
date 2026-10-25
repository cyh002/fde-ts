# Step 08 — Capstone: tests, Claude Code and exam revision

**Time:** 10–12 hours · **Builds on:** everything, especially step 04 (agent loop), step 05 (MCP server) and step 06 (guard) · **Unlocks:** the exam

## The three strands in this step

| Strand | In this step | How it connects |
|---|---|---|
| 🟦 **JS/TS** | Vitest (`describe`/`it`/`expect`), fake functions with `vi.fn`, dependency injection, reading stack traces | Tests let you change code without fear. Dependency injection is the small design change that makes an LLM app testable without calling a model. |
| 🟩 **Homelab** | Tests for hermes-ctl; a Claude Code setup for this repo: a richer `CLAUDE.md`, your own Skill, a hook that protects `.env`, headless reviews | You finish with a tool you trust and a Claude Code setup that helps you work on it safely |
| 🟧 **Exam** | D3 Claude Code Operation (3.1%) · D8 Agentic Customization (4.1%) · D7 Claude Hooks (1.0%) · D4 Debugging and Error Handling (2.6%) · D2 Software Engineering Foundations (7.4%) · D2 Configuration Management (4.1%) | Claude Code, Skills vs MCP vs tools, and hooks add up to more marks than you'd guess. Then you revise everything. |

---

## Why this matters

Code you can't rerun, trust or understand a month later isn't finished. This step makes hermes-ctl something *future you* can safely change: tested where it matters, with Claude Code set up to help rather than surprise you.

It's also your revision pass. By the end you'll have answered every exam check twice and know exactly which domains need more time.

---

## 🟦 Warm-up drills (scratch.ts, 20–40 min)

First install Vitest if `npm install` didn't already: it's in `devDependencies`, so `npm install` is enough. Create `test/scratch.test.ts` for these drills (delete it afterwards).

**Drill 1: your first test.**

```ts
import { it, expect } from "vitest";
it("adds", () => {
  expect(1 + 1).toBe(2);
});
```

Run `npm test`. *Predict:* change `2` to `3`. What does the failure output show you?

**Drill 2: `toBe` vs `toEqual`.**

```ts
it("compares objects", () => {
  expect({ a: 1 }).toEqual({ a: 1 });
  expect({ a: 1 }).toBe({ a: 1 });
});
```

*Predict:* which line fails, and why? (Hint: same contents vs same object.)

**Drill 3: a fake function remembers its calls.**

```ts
import { vi } from "vitest";
it("records calls", () => {
  const fake = vi.fn().mockReturnValue(42);
  fake("hello");
  expect(fake).toHaveBeenCalledWith("hello");
  expect(fake()).toBe(42);
});
```

*Predict:* how many times has `fake` been called by the end?

**Drill 4: fake async results in order.**

```ts
it("returns scripted answers", async () => {
  const fake = vi.fn().mockResolvedValueOnce("first").mockResolvedValueOnce("second");
  console.log(await fake(), await fake(), await fake());
});
```

*Predict:* what's the third value?

**Drill 5: dependency injection in five lines.**

```ts
function greet(getName: () => string) {
  return `Hello ${getName()}`;
}
console.log(greet(() => "test-user"));
```

*Predict:* why is `greet` easier to test than a version that reads `process.env.USER` itself?

---

## Concepts

### 1. What to test in an LLM app

```
 ┌─────────────────────────────────────────────────────────────┐
 │  Unit tests (fast, no network, run on every change)          │
 │   • config validation      • parseAgents()                   │
 │   • policy decisions       • redactSecrets()                 │
 │   • cost calculation       • PII leak detection              │
 ├─────────────────────────────────────────────────────────────┤
 │  Agent-loop tests with a FAKE Claude (no network)            │
 │   • tool_use → runs tool → sends tool_result → stops         │
 │   • tool error → is_error: true                              │
 │   • stops at MAX_ROUNDS                                      │
 ├─────────────────────────────────────────────────────────────┤
 │  Evals (slow, real model, run on demand)                     │
 │   • PII harness (03)        • model bench (07)               │
 └─────────────────────────────────────────────────────────────┘
```

Most of your logic is plain code, so test it like plain code. Fake the model so tests are fast, free and give the same result every time.

### 2. Faking the model, in one picture

```
 real:   agent loop ──► client.messages.create ──► Bifrost ──► Claude
 test:   agent loop ──► fakeCreate()  returns scripted responses:
                          call 1 → { stop_reason: "tool_use", content: [tool_use get_vm_status] }
                          call 2 → { stop_reason: "end_turn", content: [text "hermes-b is down"] }
```

To make this possible, the loop must *receive* the `create` function as an argument instead of importing the client directly. That's **dependency injection** (Drill 5), and it's why testable code is often better-designed code.

### 3. Four ways to give Claude a capability

D8 *Agentic Customization* asks you to choose between these. You've now built three of them.

| Option | What it is | You built | Best when |
|---|---|---|---|
| **Built-in tool** | A tool the platform already has (Claude Code's Read/Bash/Grep, or the API's server tools like web search) | used them in Claude Code | The capability is generic and already exists |
| **Custom tool** | A function you define and run in *your* app's loop | step 04 registry | Only one app needs it, and it's simple |
| **MCP server** | Tools/resources/prompts exposed over a protocol, usable by any MCP client | step 05 | Several apps or clients should share it, maintained separately |
| **Skill** | A folder with a `SKILL.md` of instructions (plus optional scripts) that Claude loads when relevant | this step | It's *know-how* or a procedure ("how to triage a VM"), not a new connection to a system |

A useful rule of thumb: **MCP gives Claude new hands; a Skill gives Claude a recipe.** A Skill can tell Claude *how* to use your MCP tools.

### 4. Claude Code as reviewer, not author

```
 you write code ──► Claude Code reviews it ──► you decide what to change ──► you change it
                    (guided by CLAUDE.md and /tutor-review)
```

The repo has worked this way since step 00. Now you'll understand and extend the setup.

---

## Read first (1.5 hours)

- Vitest docs: *Getting started*, *Mocking* (`vi.fn`)
- Claude Code docs (code.claude.com/docs): *Memory* (CLAUDE.md files and where they live), *Skills*, *Hooks*, *Settings*, and running Claude Code non-interactively (headless)
- Reread this repo's `CLAUDE.md` and `.claude/skills/*/SKILL.md`. You've been using them; now read them as configuration.

---

## Build

### Step 1 — Make the agent loop testable

Move the loop out of `agent.ts` into `src/agentLoop.ts`:

```ts
// src/agentLoop.ts
export type CreateFn = (params: any) => Promise<any>;

export async function runAgent(opts: {
  question: string;
  create: CreateFn;                                    // injected
  runTool: (name: string, input: unknown) => Promise<{ content: string; isError: boolean }>;
  maxRounds?: number;
}): Promise<{ answer: string | null; rounds: number; toolCalls: string[] }> {
  // TODO 1: your loop from step 04, using opts.create and opts.runTool
}
```

`agent.ts` becomes a few lines that pass the real `(p) => client.messages.create(p)` and `runTool`.

**Predict:** why pass `(p) => client.messages.create(p)` instead of just `client.messages.create`? (Try both and see whether `this` survives.)

### Step 2 — Unit tests: `test/*.test.ts`

Write at least these. Each test: arrange, act, assert.

```ts
// test/policy.test.ts
import { describe, it, expect } from "vitest";
import { checkPolicy } from "../src/security/policy.js";

describe("checkPolicy", () => {
  it("allows read tools", () => {
    expect(checkPolicy("get_vm_status").allowed).toBe(true);
  });
  it("denies unknown tools", () => {
    // TODO
  });
  it("denies write tools when writes are disabled", () => {
    // TODO
  });
});
```

Checklist:

- [ ] `parseAgents`: normal, empty string, extra spaces, missing `=`
- [ ] `checkPolicy`: read, write disabled, unknown
- [ ] `redactSecrets`: nested objects, arrays, keys in different cases
- [ ] `costUSD`: known model, unknown model
- [ ] PII leak detection: a leak, a pass, an over-redaction

(Some of these functions aren't exported yet. Exporting them so you can test them is normal.)

### Step 3 — Agent-loop tests with a fake model

```ts
// test/agentLoop.test.ts
import { it, expect, vi } from "vitest";
import { runAgent } from "../src/agentLoop.js";

it("calls a tool then answers", async () => {
  const create = vi.fn()
    .mockResolvedValueOnce({
      stop_reason: "tool_use",
      content: [{ type: "tool_use", id: "tu_1", name: "get_vm_status", input: {} }],
    })
    .mockResolvedValueOnce({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "hermes-b is stopped" }],
    });

  const runTool = vi.fn().mockResolvedValue({ content: "[]", isError: false });

  const result = await runAgent({ question: "status?", create, runTool });

  expect(result.answer).toBe("hermes-b is stopped");
  expect(runTool).toHaveBeenCalledWith("get_vm_status", {});
  // TODO 2: assert the SECOND create call's messages end with a user message
  //         containing a tool_result for tool_use_id "tu_1"
  //         hint: create.mock.calls[1][0].messages
});

// TODO 3: test that a tool error is sent back with is_error: true
// TODO 4: test that the loop stops at maxRounds if the model never stops asking for tools
// TODO 5: test two tool_use blocks in one response → one user message with two tool_results
```

**Break it:** in `agentLoop.ts`, set `tool_use_id` to the tool *name* instead of the id. Which test catches it? If none does, write the test that would.

### Step 4 — Claude Code, part 1: CLAUDE.md and review

**a) The CLAUDE.md hierarchy.** Claude Code reads memory files from several places and combines them:

```
 ~/.claude/CLAUDE.md          ← you, across every project (personal preferences)
 ./CLAUDE.md                  ← this project, shared with anyone who clones it
 ./src/security/CLAUDE.md     ← (optional) extra rules only for files in that folder
```

Read the docs to confirm the exact order and which ones are loaded when. Then:

- Extend the repo's `CLAUDE.md` with two rules you've learned you need (for example: "tool handlers must return errors as `isError`, not throw" or "never `console.log` in `src/mcp/` or `src/tools/`").
- Add a small `src/security/CLAUDE.md` with one security-specific rule. Ask Claude Code something about `guard.ts` and check that it follows the rule.
- Look up what `/init` does. **Predict:** what would it write for this repo? (Don't overwrite your CLAUDE.md to find out. Try it in a scratch copy if you're curious.)

**b) A review pass.** Run `/tutor-review` on `src/agentLoop.ts`, `src/security/guard.ts` and `src/pii/harness.ts`, one at a time. For each suggestion decide **accept, reject or modify**, and record why in `notes/08.md`. Make the changes yourself.

### Step 5 — Claude Code, part 2: write your own Skill

Create `.claude/skills/hermes-triage/SKILL.md` (if you did step 05's side quest, you already have a first draft: improve it here rather than starting again). Use the two existing skills as a model for the frontmatter (`name`, `description`). The description matters: it's how Claude decides when to load the skill, just like a tool description in step 04.

Your skill should describe a *procedure*, using the hermes-ctl MCP tools you connected in step 05:

```md
---
name: hermes-triage
description: TODO — when should Claude use this? (e.g. "a VM or Hermes agent seems down")
---

# Homelab triage

TODO: the steps, in order. For example:
1. Use the hermes-ctl MCP tools to get VM status and agent health.
2. Compare with hermes://inventory.
3. …
4. Report: what's wrong, likely cause, the next thing a human should check.
   Never call write tools.
```

Ask Claude Code "hermes-b feels slow, can you look?" and see whether it picks up the skill.

Then fill in this comparison in your notes. This is D8 Agentic Customization:

| Question | Custom tool (04) | MCP server (05) | Skill (08) |
|---|---|---|---|
| What does it add: new abilities or know-how? | | | |
| Which clients can use it? | | | |
| Where does the code run? | | | |
| When would you choose it? | | | |

### Step 6 — Claude Code, part 3: a hook that protects you

In step 06 you built `guarded()`, a deterministic check before every tool call. Claude Code has the same thing: a **`PreToolUse` hook**.

Create `.claude/settings.json` with a `PreToolUse` hook that:

- matches the tools that read, edit or run things (check the docs for the tool names to match), and
- runs a small script (e.g. `.claude/hooks/protect.sh` or a `.ts` file run with `npx tsx`) that reads the tool call from stdin and **blocks** it if it touches `.env` or runs `rm -rf`.

Use the Claude Code hooks docs (code.claude.com/docs) for the exact JSON shape of `settings.json`, what arrives on stdin, and how a hook signals "block" (an exit code or a JSON decision, plus a message Claude sees). Don't guess the schema; reading it is part of the exercise.

**Break it / prove it:** ask Claude Code to "show me what's in .env". Does the hook stop it? What message does Claude get back? Check that normal work still runs.

> Sample 2 in the exam guide asks about guardrails *or hooks*. You've now built both.

### Step 7 — Claude Code, part 4: headless mode

Claude Code can run without the interactive UI:

```bash
claude -p "Use /tutor-review on src/tools/hermes.ts and print the review"
```

Try it, then add an npm script, e.g. `"review": "claude -p \"...\""`. **Predict:** what's lost compared with an interactive session, and what's gained? (Think: scripts, CI, no follow-up questions.)

### Step 8 — Debugging drill

Introduce each bug (one at a time), run, and practise reading the stack trace to find it *without looking at your change*:

| Bug | Symptom you saw | How you found it |
|---|---|---|
| `tool_use_id` set to the tool name instead of the id | | |
| `await` removed before `runTool` | | |
| `.env` path wrong in the MCP server | | |
| A `console.log` in a tool file, run via MCP | | |

For each, write down: is this an **integration-layer** problem (your code, config, gateway) or a **model-output** problem? That split is exactly what D4 tests.

### Step 9 — CI (optional)

> **🏭 Production aside (skip on first pass):** if your repo is on GitHub, a tiny workflow runs your tests on every push. It's good SDLC practice (D2), but not required for learning. **No secrets and no real model calls in CI.**
>
> ```yaml
> # .github/workflows/ci.yml
> name: ci
> on: [push, pull_request]
> jobs:
>   test:
>     runs-on: ubuntu-latest
>     steps:
>       - uses: actions/checkout@v4
>       - uses: actions/setup-node@v4
>         with: { node-version: 24, cache: npm }
>       - run: npm ci
>       - run: npm run typecheck
>       - run: npm test
> ```

### Step 10 — Exam revision

Follow the revision plan at the bottom of [docs/exam-map.md](../docs/exam-map.md):

1. Re-answer every step's **Exam check** without your notes. Mark what you missed.
2. Go down `docs/exam-map.md` and untick anything you can't explain out loud.
3. Redo the three sample questions in [docs/Certified_Developer.md](../reference/Certified_Developer.md) §8. Compare your reasoning with your answers from before step 01.
4. Run `/exam-quiz D1` … `/exam-quiz D8`, heaviest domains first.
5. Take a full-length mock exam. Spend the remaining time on weak domains **in proportion to their weight**.

### Common TypeScript errors in this step

| You see | What it means |
|---|---|
| `Cannot find module '../src/agentLoop.js'` | Test imports need the `.js` extension too, just like `src/`. |
| `Module '"../src/tools/hermes.js"' has no exported member 'parseAgents'` | Add `export` to the function you want to test. |
| `TypeError: Cannot read properties of undefined (reading 'create')` | You passed `client.messages.create` without binding it. Wrap it: `(p) => client.messages.create(p)`. |
| Test passes but checks nothing | You forgot `await` on an async assertion, or the `expect` is inside a callback that never runs. |
| `No test files found` | Vitest looks for `*.test.ts`. Check the file name and that it's in `test/`. |

---

## Checkpoint

- [ ] 15+ unit tests and 4+ agent-loop tests, all passing (`npm test`)
- [ ] `npm run typecheck` is clean
- [ ] `CLAUDE.md` extended; a subdirectory `CLAUDE.md` exists and is followed
- [ ] One `/tutor-review` pass done, decisions recorded
- [ ] Your `hermes-triage` Skill works, and the custom-tool vs MCP vs Skill table is filled in
- [ ] A `PreToolUse` hook blocks `.env` access and `rm -rf`
- [ ] You've run Claude Code headless once
- [ ] Debugging drill table filled in
- [ ] Mock exam taken; weak domains identified

---

## Stretch

- Add a test for the PII harness's leak detection using fake `ReceivedReport` objects, with no model call.
- Make the hook log every blocked attempt to `reports/hook.jsonl`, like your step 06 audit log.
- Write a second Skill, `exam-flashcards`, that turns your `notes/` into flashcards.

---

## 🧪 Exam side quest (optional)

- **D1 Agent Architecture / D6 Context Engineering (subagents):** read about subagents in Claude Code. Create one (e.g. a "log-reader" that only reads and summarises) and notice how it keeps the long reading out of your main conversation. Write three lines on why that is *context isolation*.
- **D3 sessions and plugins:** try `/clear`, `/resume` and `/compact`. When would you use each? Look up what a Claude Code *plugin* bundles (skills, hooks, commands, MCP servers) and how that relates to what you built.
- **D2 Understanding Requirements and Systems Life Cycle:** write one page in `notes/08-requirements.md`: what hermes-ctl must do (functional), what it needs to run (infrastructure), and how you'd develop, operate and maintain it (lifecycle: who updates prices, who rotates tokens, what happens when a model is retired).

---

## Exam check

1. *(D4)* Why fake the model in unit tests? What do you lose, and how do evals make up for it?
2. *(D2)* What is dependency injection, and how did it make the agent loop testable?
3. *(D3)* Where can CLAUDE.md files live, and which applies where?
4. *(D8)* A team wants Claude to follow a 10-step incident procedure using tools they already have. Skill, MCP server or custom tool? Why?
5. *(D7, D3)* What does a `PreToolUse` hook let you enforce that a CLAUDE.md rule can't?
6. *(D3)* What is headless mode for? Give one use in this repo.
7. *(D4)* An agent works locally but fails with "tool_use ids were found without tool_result blocks". What's wrong?
8. *(D4)* Walk through how you'd debug "the agent gives a wrong answer about VM status", from top to bottom. Which checks are integration-layer and which are model-output?

Then run `/exam-quiz 08` in Claude Code for more.

---

## Write-up (`notes/08.md`): learning retrospective

Use [notes/TEMPLATE.md](../notes/TEMPLATE.md), plus:

- `/tutor-review` decisions (accept / reject / modify, and why)
- Debugging drill table
- **Learning retrospective:**
  - 🟦 What JS/TS can you now read and write that you couldn't at step 00?
  - 🟩 Which homelab feature do you actually use? Which surprised you most?
  - 🟧 Mock exam score per domain, and your plan for the time left before the real exam
  - What still feels shaky? List it honestly. That's your next study list.
- Looking back: what's the one thing you understand now that you didn't at step 00?
