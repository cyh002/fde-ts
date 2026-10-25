# Step 07 — Model selection, cost and caching

**Time:** 8–10 hours · **Builds on:** step 01 (usage and tokens), step 04 (real tool output to summarise), step 06 (safe to run lots of calls) · **Unlocks:** step 08 (tests for your cost maths)

## The three strands in this step

| Strand | In this step | How it connects |
|---|---|---|
| 🟦 **JS/TS** | Running async work with a concurrency limit, `performance.now()` timing, sorting and simple stats (p50/p95), `Record`, printing a table | You can't compare models fairly without running many calls, timing them, and summarising the numbers |
| 🟩 **Homelab** | `npm run bench`: your real Hermes jobs (log classification, extraction, status summaries) run across models through Bifrost, with cost, latency and accuracy side by side | You end up with *data* on which model each Hermes job needs, instead of guessing |
| 🟧 **Exam** | D5 Model Selection and Tradeoffs (2.7%) · D5 Cost and Token Management (2.8%) · D5 LLM Fundamentals (5.2%: effort, adaptive thinking, zero-shot vs few-shot) · D2 Claude API Mechanics (6.8%: caching, batch vs realtime) · D6 Prompt Engineering (4.6%) | D5 is the second-heaviest domain. This step turns its vocabulary into numbers you measured yourself. |

---

## Why this matters

"Which model should I use?" The honest answer is "it depends, so measure." Classifying a log line's severity is easy; diagnosing a multi-VM failure is hard. They probably shouldn't use the same model, and they definitely shouldn't cost the same.

In this step you build the thing that measures. When your Hermes agents run hundreds of small jobs a day, picking the right model per job is the difference between pennies and a bill you notice.

---

## 🟦 Warm-up drills (scratch.ts, 20–40 min)

Run with `npm run scratch:watch`.

**Drill 1: timing an await.**

```ts
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const t0 = performance.now();
await sleep(300);
console.log(Math.round(performance.now() - t0));
```

*Predict:* exactly 300? Run it five times. Why does it vary?

**Drill 2: all at once vs one at a time.**

```ts
const jobs = [300, 300, 300];
let t0 = performance.now();
for (const ms of jobs) await sleep(ms);
console.log("sequential", Math.round(performance.now() - t0));
t0 = performance.now();
await Promise.all(jobs.map((ms) => sleep(ms)));
console.log("parallel", Math.round(performance.now() - t0));
```

*Predict:* roughly what two numbers print?

**Drill 3: sorting numbers (the classic trap).**

```ts
console.log([100, 25, 3].sort());
console.log([100, 25, 3].sort((a, b) => a - b));
```

*Predict:* what does the first line print, and why? (Hint: by default `sort` compares as strings.)

**Drill 4: percentiles.**

```ts
function percentile(values: number[], p: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const i = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[i];
}
const lat = [120, 130, 125, 140, 900, 135, 128, 122, 131, 127];
console.log(percentile(lat, 50), percentile(lat, 95));
```

*Predict:* what's the average? How different are the average and the p50? Which one tells you about the 900ms outlier?

**Drill 5: grouping with `Record`.**

```ts
const runs = [{ model: "a", ms: 10 }, { model: "b", ms: 20 }, { model: "a", ms: 30 }];
const byModel: Record<string, number[]> = {};
for (const r of runs) (byModel[r.model] ??= []).push(r.ms);
console.log(byModel);
```

*Predict:* what does `??=` do here?

---

## Concepts

### 1. The triangle

```
               quality
                 ▲
                / \
               /   \        A bigger model usually moves you up,
              /     \       but costs more and responds slower.
             /       \      Pick the cheapest, fastest model that
            ▼─────────▼     clears your quality bar for THIS task.
         cost        speed
```

The current lineup you'll compare:

| Model ID | Role |
|---|---|
| `claude-haiku-4-5` | small, fast, cheapest: your default since step 00 |
| `claude-sonnet-5-5` | balanced everyday workhorse |
| `claude-opus-5-5` | most capable Opus, slower and pricier |
| `claude-fable-5-1` | Anthropic's most capable model, priced well above Opus. Optional: one comparison run at most. |

### 2. Where cost comes from

```
 cost = input_tokens  × input_price
      + output_tokens × output_price           ← output is several times pricier per token
      − savings from caching / batching
```

Levers you control:

| Lever | Effect |
|---|---|
| Smaller model | cheaper, faster, maybe less accurate |
| Shorter system prompt / less history | fewer input tokens |
| Lower `max_tokens` + "be concise" | fewer output tokens |
| Lower **effort** | less thinking, fewer tokens, faster (Sonnet/Opus) |
| **Prompt caching** | a repeated prefix (e.g. a long system prompt) costs much less on later calls |
| **Batch API** | about half price for jobs that can wait (not interactive) |
| Routing | send easy tasks to a small model, hard ones to a big one |

### 3. Thinking and effort

Newer models can reason before they answer. You control *how much*:

```
 claude-sonnet-5-5 / claude-opus-5-5:
   thinking:      { type: "adaptive" }       ← the model decides when and how much to think
   output_config: { effort: "low" | "medium" | "high" | "xhigh" | "max" }

 claude-haiku-4-5 (older generation):
   thinking: { type: "enabled", budget_tokens: 2048 }   ← fixed budget; no effort setting
```

Two facts the exam likes: on `claude-opus-5-5` thinking can't be turned off (effort is the only dial, and it defaults to `medium`), and the fixed-budget style (`budget_tokens`) is rejected on the newest models. **Same idea, different API per model generation.** That's the "breaking changes across model releases" objective in D5.

### 4. Prompt caching

```
 call 1:  [ long system prompt + tool defs ]  [ question A ]
            └── written to cache ──────────┘
 call 2:  [ long system prompt + tool defs ]  [ question B ]
            └── read from cache (cheap) ───┘
```

You mark where the cacheable prefix ends with `cache_control: { type: "ephemeral" }`. The response's `usage` then shows `cache_creation_input_tokens` (written) and `cache_read_input_tokens` (read).

Three gotchas:

- **There's a minimum prefix length**, and it depends on the model: **4096 tokens on `claude-haiku-4-5`**, 512 on `claude-sonnet-5-5` and `claude-opus-5-5`. Shorter prefixes silently don't cache. You get no error, just zeros.
- **It's a prefix match.** Change one byte early on (a timestamp in the system prompt, say) and nothing after it is cached.
- **Caches are per model.** Switching model means starting a new cache.

### 5. Zero-shot vs few-shot

```
 zero-shot:  "Classify the severity. Reply with one word."              + the log line
 few-shot:   "Classify the severity. Reply with one word.
              Examples:  '... disk 91% full'        → warn
                         '... backup completed'      → info
                         '... kernel panic on pve'   → critical"        + the log line
```

Examples cost input tokens on every call. Do they buy accuracy? You'll measure it.

### 6. Measuring quality without fooling yourself

- Use tasks with a **known right answer** where you can (classification, extraction). Check with code.
- For open-ended tasks, write a short **rubric** and score a sample by hand.
- Run each case more than once. Report the spread, not just one number.

---

## Read first (1.5 hours)

- Claude docs (platform.claude.com/docs): *Models overview* (current models, context windows, pricing)
- Claude docs: *Extended thinking* (adaptive thinking) and *Effort*
- Claude docs: *Prompt caching* (find the minimum-length table)
- Claude docs: *Message Batches* and *Token counting*
- Bifrost docs: routing and fallbacks

---

## Build

### Step 1 — Define realistic tasks: `src/bench/tasks.ts`

Use jobs your Hermes agents actually do (or should do).

```ts
// src/bench/tasks.ts
export type BenchTask = {
  id: string;
  kind: "classify" | "extract" | "summarise";
  system: string;
  input: string;
  expected?: string;        // for classify/extract: the right answer
};

export const TASKS: BenchTask[] = [
  {
    id: "sev-1",
    kind: "classify",
    system: "Classify the log line's severity. Reply with exactly one word: info, warn, error or critical.",
    input: "2026-10-25 03:12:44 ERROR backup job vm-104 failed: datastore pbs-01 unreachable",
    expected: "error",
  },
  // TODO 1: add 10+ classify cases (real-looking log lines from your own services)
  // TODO 2: add 5+ extract cases, e.g. "extract the VM ID", expected = "104"
  // TODO 3: add 3+ summarise cases using real JSON from check_hermes_agents / get_vm_status
  //         (no expected answer: you'll score these by hand with a rubric)
];
```

### Step 2 — Pricing table you fill in: `src/bench/pricing.ts`

Don't trust any price you remember (including one in a course file). Look up current per-million-token prices on the Claude docs pricing page and fill them in, with the date you checked. Prices change; your table should say when it was true.

```ts
// src/bench/pricing.ts
// Prices checked on: TODO (date) from TODO (link)
export const PRICES_PER_MTOK: Record<string, { input: number; output: number }> = {
  // "claude-haiku-4-5":  { input: TODO, output: TODO },
  // "claude-sonnet-5-5": { input: TODO, output: TODO },
  // "claude-opus-5-5":   { input: TODO, output: TODO },
};

export function costUSD(model: string, inTok: number, outTok: number): number {
  // TODO 4: (inTok * input + outTok * output) / 1_000_000; 0 if model unknown
}
```

### Step 3 — Run one task on one model

```ts
// src/bench/bench.ts
import { client } from "../client.js";
import { TASKS, type BenchTask } from "./tasks.js";
import { costUSD } from "./pricing.js";

type Run = {
  model: string; taskId: string; kind: string;
  ms: number; inTok: number; outTok: number; usd: number;
  output: string; correct?: boolean;
};

async function runOnce(model: string, task: BenchTask): Promise<Run> {
  const t0 = performance.now();
  const res = await client.messages.create({
    model,
    max_tokens: 300,
    system: task.system,
    messages: [{ role: "user", content: task.input }],
  });
  const ms = Math.round(performance.now() - t0);

  // TODO 5: join text blocks into `output` (the narrowing loop from step 01)
  // TODO 6: if task.expected, correct = output.trim().toLowerCase() === expected
  // TODO 7: fill in tokens and usd from res.usage
}
```

### Step 4 — Run everything, a few at a time

Firing 100 requests at once will hit rate limits. Write a small concurrency limiter:

```ts
// Run `fn` over `items` with at most `limit` in flight at once.
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  }
  // TODO 8: start `limit` workers with Promise.all and wait for them
  return results;
}
```

**Predict:** why is `next++` safe here even though several workers share it? (Hint: JavaScript runs one piece of code at a time; workers only switch at `await`.)

Then: for each model (`claude-haiku-4-5`, `claude-sonnet-5-5`, `claude-opus-5-5`), for each task, run 3 times.

### Step 5 — Report

Print a table and save the raw runs to `reports/bench-<timestamp>.json`.

```
 model              accuracy   p50 ms   p95 ms   $ / 1000 calls   output tok (avg)
 ─────────────────  ────────   ──────   ──────   ──────────────   ────────────────
 claude-haiku-4-5   ...
 claude-sonnet-5-5  ...
 claude-opus-5-5    ...
```

- **accuracy:** over classify + extract runs
- **p50 / p95:** your `percentile` function from Drill 4
- **$ / 1000 calls:** average cost × 1000

For summarise tasks, print outputs side by side and score them yourself (1–5) with a written rubric: *correct facts? mentions the unhealthy agent? under 60 words?*

### Step 6 — Zero-shot vs few-shot

Make a second version of your classify system prompt with 3–4 examples in it (Concepts §5). Run both versions on `claude-haiku-4-5`.

**Predict first:** will few-shot raise Haiku's accuracy? By how much will input tokens per call go up?

| Prompt | Accuracy | Avg input tok | $ / 1000 calls |
|---|---|---|---|
| zero-shot | | | |
| few-shot | | | |

Is the cheap model plus good examples as good as the bigger model with no examples? That's a real routing option.

### Step 7 — Effort and adaptive thinking

Pick your hardest task (a summarise case, or a short "here's the status JSON, what's the likely cause?" triage question). Run it on `claude-sonnet-5-5` at two effort levels:

```ts
const res = await client.messages.create({
  model: "claude-sonnet-5-5",
  max_tokens: 4000,
  thinking: { type: "adaptive" },
  output_config: { effort: "low" },   // then try "high"
  system: task.system,
  messages: [{ role: "user", content: task.input }],
});
```

**Predict:** which setting uses more output tokens? Which is slower? Will you be able to tell the answers apart?

| Effort | Output tok | ms | Your quality score (1–5) |
|---|---|---|---|
| low | | | |
| high | | | |

Look at `res.content`: you may see `thinking` blocks before the `text` block. Your narrowing loop from step 01 skips them. Good: that's why you narrowed on `block.type`.

> If Bifrost returns a 400 mentioning `output_config` or `thinking`, your gateway may not pass the field through. That's a gateway finding worth writing down. Check Bifrost's docs and version.

**Break it (optional):** send `thinking: { type: "enabled", budget_tokens: 2048 }` to `claude-sonnet-5-5`. What happens? Now send it to `claude-haiku-4-5`. Same parameter, different models, different results.

### Step 8 — Add prompt caching and measure it

Pick your longest system prompt (the agent's, with tool definitions). Mark it cacheable and call it 5 times with different questions:

```ts
system: [
  { type: "text", text: LONG_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
],
```

Print `usage.cache_creation_input_tokens` and `usage.cache_read_input_tokens` for each call.

**Predict first:** run it on `claude-haiku-4-5`. Use `client.messages.countTokens` to measure your prompt. Is it over 4096 tokens? What numbers do you expect?

Then run the same thing on `claude-sonnet-5-5` (512-token minimum).

| Model | Prefix tokens | Call 1 created | Calls 2–5 read |
|---|---|---|---|
| claude-haiku-4-5 | | | |
| claude-sonnet-5-5 | | | |

If reads are zero on Sonnet too, check: did anything in the prefix change between calls? Does Bifrost pass `cache_control` through?

### Step 9 — Decide

Write a routing decision for your Hermes jobs:

| Hermes job | Model | Effort / prompt | Why (cite your numbers) |
|---|---|---|---|
| Log severity classification | | | |
| Status summary for you | | | |
| Multi-step incident triage (agent) | | | |

### Common TypeScript errors in this step

| You see | What it means |
|---|---|
| `Type 'undefined' is not assignable to type 'number'` in `costUSD` | `PRICES_PER_MTOK[model]` might be missing. Check it before using `.input`. |
| `Object literal may only specify known properties, and 'output_config' does not exist` | Your SDK is old, or there's a typo. Check `package.json` and the spelling. |
| `Property 'text' does not exist on type 'ContentBlock'` | You indexed `content[0].text` without narrowing. Thinking blocks can now come first. |
| `Element implicitly has an 'any' type because expression of type 'string' can't be used to index` | Type your lookup object as `Record<string, …>`. |
| Your function returns `Promise<Run>` but TS says not all paths return | `runOnce` needs a `return { ... }` at the end. |

---

## Checkpoint

- [ ] 20+ tasks, 3 models, 3 runs each
- [ ] Table with accuracy, p50/p95 latency and cost per 1000 calls
- [ ] Prices filled in from the docs, with the date checked
- [ ] Zero-shot vs few-shot measured
- [ ] Effort low vs high measured on `claude-sonnet-5-5`
- [ ] Caching measured: you can show cache-read tokens, or explain why they're zero
- [ ] Routing decision table filled in with reasons

---

## Stretch

- Configure Bifrost to route a job type to a specific model, so routing lives in the gateway instead of your code. Which is better, and when?
- If Bifrost can reach a local model (e.g. via Ollama), add it to the bench. Cost ≈ 0, but what about accuracy and latency?
- Test Bifrost fallback: point the primary at a non-existent model and confirm requests fall through to the backup.
- Run one comparison on `claude-fable-5-1`. Is the quality difference visible on *your* tasks? Was it worth the price?

---

## 🧪 Exam side quest (optional)

- **D2 batch vs realtime (guide Sample 1):** run your classify set through the Message Batches API: `client.messages.batches.create({ requests: [{ custom_id, params }, ...] })`, poll `client.messages.batches.retrieve(id)` until `processing_status` is `"ended"`, then read `client.messages.batches.results(id)`. Results come back in **any order**, so match them by `custom_id`, never by position. Batches cost about half as much and can take up to 24 hours. Compare cost and turnaround, then reread Sample 1 in [docs/Certified_Developer.md](../reference/Certified_Developer.md) §8.
- **D2 Configuration Management (prompt versioning):** move your system prompts into `src/bench/prompts/` files with a version string at the top (`// v3: added few-shot examples`). Record the prompt version in every bench run's JSON. Now you can answer "which prompt produced that number?"
- **D5 LLM Fundamentals (fast mode):** read about fast mode in the Claude docs (a research preview on Opus: faster output at a premium price). Write two lines on when you'd pay for it in a homelab. (Probably never, and that's a fine answer.)

---

## Exam check

1. *(D5)* Give a task where a small, fast model is the right choice, and one where it isn't.
2. *(D5)* Which usually costs more per token: input or output? Name two ways to cut output tokens.
3. *(D5)* How does prompt caching reduce cost? What has to stay the same between calls for it to work? Why might a 3,000-token prompt cache on one model but not another?
4. *(D2)* When is the Batch API appropriate? When isn't it?
5. *(D5)* What does `effort` control? What happens to tokens and latency when you raise it?
6. *(D5, D6)* What's the difference between zero-shot and few-shot prompting, and what does few-shot cost you?
7. *(D5)* Why report p95 latency, not just the average?
8. *(D5)* Your costs doubled after adding conversation history to a chat app. Explain why and suggest two fixes.
9. *(D5)* Why run each test case more than once?

Then run `/exam-quiz 07` in Claude Code for more.

---

## Write-up (`notes/07.md`)

Use [notes/TEMPLATE.md](../notes/TEMPLATE.md). Include:

- Your results table, zero-shot vs few-shot table, and effort table
- Caching: before/after numbers on both models
- Your routing decision table
- Three sentences you'd say to a friend who asks "which Claude model should I use for my homelab bot?"
