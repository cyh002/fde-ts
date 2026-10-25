# hermes-ctl

> Learn **JavaScript and TypeScript** by building **real tools for your own homelab** (Bifrost, a PII redactor, Hermes agents), one step at a time, while working through the **Claude Certified Developer – Foundations (CCDV-F)** blueprint.

This is a **learning repo, not a production project.** Every choice here favours *understanding* over polish: you type the code, you predict before you run, you break things on purpose, and you write down what you learned. The tool you end up with is genuinely useful in your homelab, but it is a side effect. The skills are the point.

---

## Contents

1. [The idea: three strands, one staircase](#1-the-idea-three-strands-one-staircase)
2. [The staircase](#2-the-staircase)
3. [How each step works](#3-how-each-step-works)
4. [Learning, not production](#4-learning-not-production)
5. [Setup](#5-setup)
6. [Repo layout](#6-repo-layout)
7. [Your homelab, as this course sees it](#7-your-homelab-as-this-course-sees-it)
8. [The exam](#8-the-exam)
9. [Rules of the course](#9-rules-of-the-course)
10. [Progress tracker](#10-progress-tracker)
11. [Reference material](#11-reference-material)
12. [Glossary](#12-glossary)

---

## 1. The idea: three strands, one staircase

Learning a language, a platform and an exam separately means three courses, three toy projects, and nothing that sticks. Here they are braided together. Every step has the same three strands, and each strand gives the others a reason to exist:

```
   🟦 JS/TS                     🟩 HOMELAB                    🟧 EXAM (CCDV-F)
   the language skill   ──►     a real thing you build  ──►   the concept it proves
   (async/await)                (ask Claude via Bifrost)      (Messages API mechanics)
        ▲                                                            │
        └──────────── the exam question tells you WHY the ───────────┘
                      language feature mattered
```

- **🟦 JS/TS**: you learn only the language features the homelab task needs *right now*, then use them straight away.
- **🟩 Homelab**: every step ends with something that runs against **your** Bifrost, **your** redactor, **your** Proxmox VMs. Real systems give real errors, and real errors teach.
- **🟧 Exam**: each step maps to named blueprint domains. The *Exam check* questions at the end make you explain what you built in the exam's vocabulary.

You never learn a language feature in a vacuum, never build something without knowing which exam objective it covers, and never study an exam objective without having touched it.

---

## 2. The staircase

Each step stands on the one before it. Don't skip steps; the JS/TS strand assumes the previous step's skills.

| Step | 🟦 JS/TS you learn | 🟩 Homelab you build | 🟧 Exam domains it covers |
|---|---|---|---|
| [00 Setup](steps/00-setup.md) | Node, npm, `tsx`, modules, `process.env`, first Zod schema | `config.ts` + `check.ts`: proof that code can reach Bifrost | D2 Configuration management · D7 Secrets |
| [01 First call](steps/01-first-call.md) | values, objects, functions, Promises, `async`/`await`, `try`/`catch`, type narrowing | `npm run ask`: one question to Claude **through Bifrost** | D2 Claude API mechanics · D5 Tokens & LLM fundamentals · D4 Error types |
| [02 Chat loop](steps/02-chat-loop.md) | arrays, loops, `readline`, events, generics, higher-order functions | `npm run chat`: streaming terminal chat with retries | D2 Application design · D6 Context engineering |
| [03 PII harness](steps/03-pii-harness.md) | types, union types, Zod in depth, JSON, file I/O | `npm run pii-test`: **prove** whether your redactor works | D6 Output handling · D7 PII & data leakage · D4 Evals |
| [04 Agent](steps/04-tool-use-agent.md) | `fetch`, headers, timeouts, `Record`, `Promise.all` | `npm run agent`: "which Hermes VM is down?" answered from live Proxmox data | D1 Agents & workflows · D8 Tool implementation |
| [05 MCP server](steps/05-mcp-server.md) | refactoring into modules, stdio, client vs server | `npm run mcp`: the same tools in Claude Code, Claude Desktop and Hermes | D8 MCP server development · D8 Agentic customization (tools vs Skills vs MCP) |
| [06 Security](steps/06-security.md) | closures, wrapper functions, `Set`, `crypto` | guard + audit log + auth: safe enough to leave running | D7 Security, guardrails, hooks, secrets |
| [07 Model bench](steps/07-model-bench.md) | concurrency limits, timing, simple stats | `npm run bench`: which model each Hermes job really needs | D5 Model selection, cost & caching · D2 Batch API |
| [08 Capstone](steps/08-capstone.md) | Vitest, mocking, dependency injection | tests, Claude Code setup (CLAUDE.md, skills, hooks), exam revision | D3 Claude Code · D8 Agentic customization · D4 Debugging · D2 Software engineering |

The full objective-by-objective map, including topics the build doesn't reach and the side quests that cover them, is in [docs/exam-map.md](docs/exam-map.md).

**Pace:** one step per weekend, 6–10 hours each, so about 9–10 weeks. Going slower is fine. Going faster usually means skipping the *Predict* and *Write-up* parts, which is where most of the learning happens.

---

## 3. How each step works

Every step file has the same shape, so you always know where you are:

| Section | Strand | What you do |
|---|---|---|
| **Three strands** box | all | See what you'll learn, build and prove, and how they connect |
| **Warm-up drills** | 🟦 | 20–40 min of tiny JS/TS exercises in `scratch.ts`. Only the features this step needs. |
| **Concepts** | 🟩🟧 | A picture first, then the words |
| **Read first** | all | Short, specific reading (a chapter, not a course) |
| **Build** | 🟦🟩 | The homelab feature, as skeleton code with `TODO`s for you to fill in |
| **Predict, then run** | 🟦 | Inside Build: guess the output, *then* run it |
| **Break it** | 🟩🟧 | Inside Build: break the setup on purpose and record what happens |
| **Checkpoint** | 🟩 | How you know you're done |
| **Stretch** | 🟦🟩 | Optional extras if you're enjoying it |
| **🧪 Exam side quest** | 🟧 | Optional. Blueprint topics the build doesn't reach naturally. |
| **🏭 Production aside** | — | Optional. What a real deployment would add. **Skip on your first pass.** |
| **Exam check** | 🟧 | Exam-style questions. Answer them in your notes, in your own words. |
| **Write-up** | all | A few lines in `notes/NN.md` (template in [notes/TEMPLATE.md](notes/TEMPLATE.md)) |

### The loop

```
 warm-up drills ──► concepts ──► build (predict → run → break it) ──► checkpoint
       ▲                                                                   │
       │                                                                   ▼
  next step  ◄──  write notes/NN.md  ◄──  answer the exam check  ◄─────────┘
```

### Scratch file

`scratch.ts` is git-ignored and is your playground for the warm-up drills:

```bash
npm run scratch          # run scratch.ts once
npm run scratch:watch    # re-run it every time you save (great for drills)
```

### Branch per step (optional but nice)

```bash
git checkout -b step-01
# ...work, small commits...
git checkout main && git merge step-01
```

Your git history then becomes a record of your progress.

---

## 4. Learning, not production

This repo deliberately makes "wrong for production, right for learning" choices. Knowing which ones they are is itself a lesson.

| We do this | Production would… | Why we do it anyway |
|---|---|---|
| Run `.ts` files directly with `tsx`, no build step | compile to JS, bundle, ship artifacts | One less thing between you and your code |
| Hand-write the agent loop, retry logic and JSON Schema | use SDK helpers (tool runner, built-in retries) | You can't debug a helper you've never written yourself. Each step then shows you the helper. |
| Use `any` at first, then tighten | ban `any` | Get it working, then make it type-safe. You'll feel why types help. |
| One process, one machine, `console.error` logging | containers, log pipelines, metrics | Infra is a separate course |
| Keep secrets in `.env` | a secrets manager / vault | The *habit* (never in code) is what matters now |
| Default to the cheapest model (`claude-haiku-4-5`) | pick per task, with data | Cheap experiments mean more experiments. Step 07 teaches the data-driven choice. |
| Read-only tools, writes only behind an approval gate in step 06 | the same, honestly | Your homelab is real. Don't let a learning project reboot it. |

**Out of scope on purpose:** Docker, deployment, web frameworks beyond the minimum for step 06, databases, frontends, monorepos, performance tuning. When a step mentions one of these, it's in a **🏭 Production aside** you can skip.

---

## 5. Setup

### You need

- **Node.js 20+** (`node --version`). This repo has been tested on Node 24.
- **Git** and **VS Code** (or any editor with TypeScript support; hovering over things in VS Code is a big part of learning TS)
- **Bifrost** reachable from your machine, with an Anthropic provider configured and a virtual key
- From step 04: a **read-only Proxmox API token**
- From step 05: **Claude Code** and/or **Claude Desktop**

You do **not** need prior JavaScript experience. Step 00 starts from zero.

### Quick start

```bash
npm install
cp .env.example .env      # fill in BIFROST_BASE_URL, BIFROST_API_KEY, CLAUDE_MODEL
npm run hello:mcp         # sanity check: the toolchain works (no network or model needed)
```

Then open [steps/00-setup.md](steps/00-setup.md).

### Environment variables

| Variable | Example | From step | Purpose |
|---|---|---|---|
| `BIFROST_BASE_URL` | `http://bifrost.lan:8080/anthropic` | 00 | Bifrost's Anthropic-compatible endpoint. Note the `/anthropic` suffix. |
| `BIFROST_API_KEY` | `bf-vk-...` | 00 | Your Bifrost virtual key |
| `CLAUDE_MODEL` | `claude-haiku-4-5` | 00 | Default model. Check how your Bifrost config names models. |
| `PROXMOX_URL` | `https://pve.lan:8006` | 04 | Proxmox host |
| `PROXMOX_TOKEN_ID` | `hermes@pve!readonly` | 04 | API token ID |
| `PROXMOX_TOKEN_SECRET` | `xxxxxxxx-...` | 04 | API token secret |
| `PROXMOX_NODE` | `pve` | 04 | Node name |
| `HERMES_AGENTS` | `vm-a=http://10.0.0.11:8000/health,...` | 04 | Health URLs for your Hermes agents |
| `NODE_EXTRA_CA_CERTS` | `./certs/pve-ca.pem` | 04 | Trust Proxmox's self-signed CA (do **not** disable TLS checks) |
| `MCP_AUTH_TOKEN` | random hex | 06 | Shared secret for the HTTP MCP server |
| `HERMES_WRITE_ENABLED` / `DRY_RUN` | `false` / `true` | 06 | Safety switches for the one write tool |

`.env` is git-ignored. Never commit it.

---

## 6. Repo layout

What's here now, and what you'll add (marked with the step that creates it):

```
hermes-ctl/
├── README.md                 ← you are here
├── CLAUDE.md                 ← tells Claude Code to act as your tutor, not your ghostwriter
├── .claude/skills/           ← /tutor-review and /exam-quiz helpers for Claude Code
├── package.json  tsconfig.json  .env.example  .gitignore
├── inventory.md              ← your VMs; served as an MCP resource in step 05
│
├── steps/                    ← the course: 00-setup.md … 08-capstone.md
├── docs/exam-map.md          ← every CCDV-F objective → where you practise it
├── notes/                    ← your write-ups (TEMPLATE.md to start)
├── playground/mcp-hello/     ← your first MCP experiment, kept as a reference
├── reference/                ← exam guide (PDF + OCR text), git-ignored, local only
│
├── scratch.ts                ← (you) warm-up drills, git-ignored
└── src/
    ├── config.ts             ← (00) loads and validates .env
    ├── check.ts              ← (00) raw-HTTP connectivity check
    ├── client.ts             ← (01) the Anthropic client, pointed at Bifrost
    ├── ask.ts                ← (01) one question, one answer
    ├── chat.ts  retry.ts     ← (02) interactive chat + your retry wrapper
    ├── pii/                  ← (03) cases.ts, schema.ts, harness.ts
    ├── tools/                ← (04) proxmox.ts, hermes.ts, registry.ts
    ├── agent.ts              ← (04) the agent loop
    ├── mcp/                  ← (05) server.ts, (06) http.ts
    ├── security/             ← (06) policy.ts, audit.ts, guard.ts
    └── bench/                ← (07) tasks.ts, pricing.ts, bench.ts
    test/                     ← (08) Vitest tests
```

---

## 7. Your homelab, as this course sees it

### What you end up with

```
                        ┌────────────────────────────────────────────┐
  You ──► hermes-ctl ──►│ Bifrost (/anthropic) ──► PII redactor ──►  │──► Claude
           (CLI/agent)  └────────────────────────────────────────────┘
               │
               │ tool calls (read-only by default, audited)
               ▼
     ┌───────────────────┬───────────────────┬───────────────────┐
     │  Proxmox API      │  Hermes agents    │  Service health   │
     │  (VM status)      │  (health/status)  │  endpoints        │
     └───────────────────┴───────────────────┴───────────────────┘

  Claude Code / Claude Desktop / Hermes ──► hermes-ctl MCP server ──► same tools
```

### Request path (steps 01–03)

```
 hermes-ctl                 Bifrost                  PII redactor        Anthropic
 ──────────                 ───────                  ────────────        ─────────
 messages.create() ──POST /anthropic/v1/messages──►  routes, logs  ──►  scrubs PII ──►  Claude
                   ◄──────────── response (same Anthropic shape) ◄──────────────────◄
```

The Anthropic SDK doesn't know Bifrost exists. You change one setting, `baseURL`, and every request goes through your gateway. That one fact explains a lot of the exam's "invoking Claude through third-party vendors" objective.

### The agent loop (step 04)

```
         ┌──────────────────────────────────────────────┐
         ▼                                              │
  send messages + tool definitions to Claude            │
         │                                              │
         ▼                                              │
  stop_reason == "tool_use"? ──no──► print answer, stop │
         │ yes                                          │
         ▼                                              │
  run each requested tool (read-only, audited)          │
         │                                              │
         ▼                                              │
  append tool_result blocks to messages ────────────────┘
         (and stop after N rounds no matter what)
```

### MCP (step 05)

```
  MCP client                          MCP server (hermes-ctl)
  (Claude Code, Claude Desktop,       ───────────────────────
   Hermes)                            tools:     get_vm_status, check_hermes_agents
        │  JSON-RPC over stdio or HTTP resources: hermes://inventory
        └────────────────────────────►prompts:   triage_incident
```

---

## 8. The exam

**Claude Certified Developer – Foundations (CCDV-F)**: 53 multiple-choice/multiple-response items, 120 minutes, pass mark 720 on a 100–1,000 scale, proctored. (From the exam guide v1.0, effective July 2026. Check the current guide before booking.)

| # | Domain | Weight | Main steps |
|---|---|---|---|
| D1 | Agents and Workflows | 14.7% | 04, 05, 08 |
| D2 | Applications and Integration | **33.1%** | 00, 01, 02, 05, 07, 08 |
| D3 | Claude Code | 3.1% | 05, 06, 08 |
| D4 | Eval, Testing, and Debugging | 2.6% | 01, 03, 08 |
| D5 | Model Selection and Optimization | **16.8%** | 01, 07 |
| D6 | Prompt and Context Engineering | 11.0% | 02, 03, 04 |
| D7 | Security and Safety | 8.1% | 00, 03, 06 |
| D8 | Tools and MCPs | 10.6% | 04, 05, 08 |

D2 + D5 + D1 make up about two-thirds of the marks. If time is short, never skip 01, 02, 04 or 07.

**Heads-up:** the exam assumes "one to five years of software engineering". This course is how you close that gap from zero, so expect the early steps to feel slow. That's normal.

---

## 9. Rules of the course

1. **Type it yourself.** Claude is your tutor and reviewer, not the author. The repo's `CLAUDE.md` tells Claude Code exactly that. Write the code, then run `/tutor-review` in Claude Code.
2. **Predict before you run.** Write your guess down first. Being wrong is where the learning is.
3. **Break it on purpose.** Every *Break it* table is worth more than another hour of reading.
4. **Read-only first.** Nothing in this repo changes your infrastructure until step 06's approval gate exists, and even then the default is read-only.
5. **Secrets live in `.env`.** Not in code, commits, prompts or logs.
6. **Fake PII only.** Step 03 uses made-up data. Never test with real names, NRICs or phone numbers.
7. **Small commits.** One working step, one commit.
8. **Stuck for 30 minutes? Ask.** Paste the exact error and the code, and say what you expected versus what happened. Ask for a *hint*, not the answer.

---

## 10. Progress tracker

Tick all three strands before moving on.

| Step | 🟦 JS/TS: I can explain… | 🟩 Homelab: it works when… | 🟧 Exam: notes written |
|---|---|---|---|
| 00 | [ ] `import`/`export`, `process.env`, why validate config | [ ] `npm run check` returns 200 through Bifrost | [ ] `notes/00.md` |
| 01 | [ ] Promises, `async`/`await`, type narrowing | [ ] `npm run ask` answers and prints tokens | [ ] `notes/01.md` |
| 02 | [ ] arrays, generics, higher-order functions | [ ] multi-turn streaming chat with retries | [ ] `notes/02.md` |
| 03 | [ ] union types, Zod vs TS types | [ ] PII report per kind, harness proven to catch leaks | [ ] `notes/03.md` |
| 04 | [ ] `fetch`, `Record`, `Promise.all` | [ ] agent answers a real VM question with 2+ tools | [ ] `notes/04.md` |
| 05 | [ ] modules, stdio vs stdout | [ ] tools work in Inspector and Claude Code/Desktop | [ ] `notes/05.md` |
| 06 | [ ] closures and wrapper functions | [ ] guard, audit log, HTTP auth, injection test stopped | [ ] `notes/06.md` |
| 07 | [ ] concurrency limiting, p50/p95 | [ ] 3-model table + routing decision | [ ] `notes/07.md` |
| 08 | [ ] mocking, dependency injection | [ ] tests pass; CLAUDE.md, skill and hook in place | [ ] `notes/08.md` |
| **Exam** | | | [ ] mock exam ≥ 800, then book CCDV-F |

---

## 11. Reference material

### JavaScript and TypeScript (🟦)

- [javascript.info](https://javascript.info): *The JavaScript language* part only. Skip the browser parts.
- [Total TypeScript – Beginner's TypeScript](https://www.totaltypescript.com/tutorials/beginners-typescript): free, exercise-based
- [Total TypeScript – Zod tutorial](https://www.totaltypescript.com/tutorials/zod): free. Zod is how tools and outputs get validated.
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html): a reference, not a course

### Claude (🟧)

- [Claude API docs](https://platform.claude.com/docs): Messages API, streaming, tool use, structured outputs, errors, token counting, prompt caching, batches
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript): `@anthropic-ai/sdk`
- [Claude Code docs](https://code.claude.com/docs): CLAUDE.md, skills, hooks, settings, the Agent SDK
- Anthropic Academy (anthropic.skilljar.com): free courses on the API and MCP
- The exam guide: `reference/Certified_Developer.md` (full text incl. sample questions; local only, git-ignored) and [docs/exam-map.md](docs/exam-map.md) (objective → step)

### MCP and Bifrost (🟩)

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk) and [MCP specification](https://modelcontextprotocol.io)
- MCP Inspector: `npm run inspector`
- [Bifrost docs](https://docs.getbifrost.ai): the Anthropic SDK integration page shows the `/anthropic` base URL

---

## 12. Glossary

| Term | Plain meaning |
|---|---|
| **Node.js** | The program that runs JavaScript outside a browser |
| **npm** | Installs packages and runs the scripts in `package.json` |
| **TypeScript** | JavaScript with types. Types are checked before running, then removed. |
| **`tsx`** | Runs a `.ts` file directly, with no build step |
| **Promise** | A value that will arrive later (like a network response) |
| **`async` / `await`** | Lets you write "wait for this promise" code top to bottom |
| **Type narrowing** | Checking a value (`if (block.type === "text")`) so TypeScript knows its exact type |
| **Generic (`<T>`)** | A type placeholder: "whatever type goes in, the same type comes out" |
| **Zod** | Checks at runtime that data has the shape you expect |
| **Messages API** | The Claude endpoint: send a list of messages, get one back |
| **Content block** | One piece of a message: `text`, `tool_use`, `tool_result`, `thinking`, … |
| **`stop_reason`** | Why Claude stopped: `end_turn`, `max_tokens`, `tool_use`, `refusal`, … |
| **Token** | The unit models read and write, and how usage is billed |
| **Structured outputs** | Asking the API to return JSON matching your schema (`output_config.format`) |
| **Tool use** | Claude asks *your code* to run a function and send back the result |
| **Agent loop** | Repeat: call Claude → run requested tools → send results, until done |
| **Workflow** | Fixed steps in code with Claude called at set points: no model choosing the path |
| **MCP** | A standard protocol so any AI client can use any tool server |
| **Transport** | How MCP messages travel: stdio (local process) or HTTP |
| **Gateway** | A proxy in front of model providers (Bifrost): routing, keys, logs, fallbacks |
| **Prompt caching** | Re-using an unchanged prompt prefix across calls at a fraction of the cost |
| **Effort / adaptive thinking** | Settings that control how much the model reasons before answering |
| **Hook** | A script Claude Code runs automatically before or after an action; it can block it |
| **Least privilege** | Give each component only the permissions it needs |
| **Prompt injection** | Text in data (a log, a web page) that tries to give the model orders |

---

*Built by Christopher Hoo as a personal learning project. Not affiliated with or endorsed by Anthropic.*
