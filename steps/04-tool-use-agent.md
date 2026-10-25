# Step 04 — Tool use and the agent loop

> **Time:** 10–12 hours · **Builds on:** step 02 (conversation history) and step 03 (Zod, JSON Schema tool definitions) · **Unlocks:** step 05 (the same tools as an MCP server)

## The three strands in this step

| Strand | In this step | How it connects |
|---|---|---|
| 🟦 **JS/TS** | `fetch` with headers and timeouts, `Record<string, X>`, `Promise.all`, `.map()` on arrays, parsing config strings with `.split()` | `fetch` is how your tools reach Proxmox and Hermes. `Promise.all` makes them fast. `Record` makes the tool dispatcher a simple lookup. |
| 🟩 **Homelab** | `npm run agent "Is any Hermes VM down?"`: Claude picks which of *your* functions to call, your code runs them against your real Proxmox and Hermes agents, Claude explains the results | Your first agent, working on live data from your own VMs |
| 🟧 **Exam** | D1 Agent Architecture (4.5%) · D1 Agent Construction with Claude (5.3%) · D1 Agent Patterns and Frameworks (4.9%) · D8 Tool Implementation (4.4%) · D7 Guardrails and Safe Deployment (least privilege) | The tool-use loop *is* the core of every agent framework the exam mentions. Writing it by hand once means you can reason about all of them. |

---

## Why this matters

This is where it stops being a chatbot. Claude decides *which* of your functions to call, your code runs them against real systems, and Claude reasons over the results. Every agent framework, from the SDK's own tool runner to LangGraph, is a wrapper around the loop you'll write by hand here. Once you've written it, you can debug any of them.

And you get a tool you'll actually use: next time a Hermes agent goes quiet, you ask in plain English instead of clicking through the Proxmox UI.

---

## 🟦 Warm-up drills (scratch.ts, 20–40 min)

Run with `npm run scratch:watch`.

**Drill 1 — `fetch` and status codes.**

```ts
const res = await fetch("https://httpbin.org/status/404");
console.log(res.ok, res.status);
```

*Predict:* does this throw an error? What do `res.ok` and `res.status` print? (You met this in step 00. Check you still remember.)

**Drill 2 — A timeout with `AbortSignal`.**

```ts
try {
  await fetch("https://httpbin.org/delay/5", { signal: AbortSignal.timeout(1000) });
  console.log("finished");
} catch (err) {
  console.log("caught:", (err as Error).name);
}
```

*Predict:* which line prints, and after roughly how long?

**Drill 3 — `.split()` to parse a config string.**

```ts
const raw = "vm-a=http://10.0.0.11:8000/health, vm-b=http://10.0.0.12:8000/health,";
const parts = raw.split(",").map((p) => p.trim()).filter((p) => p.length > 0);
console.log(parts.map((p) => p.split("=")));
```

*Predict:* how many items does `parts` have? What would happen without the `.filter()`?

**Drill 4 — `Record` as a lookup table.**

```ts
const handlers: Record<string, () => string> = {
  ping: () => "pong",
  hello: () => "hi",
};
console.log(handlers["ping"]?.());
console.log(handlers["nope"]?.());
```

*Predict:* what do the two lines print? What does the `?.` before `()` protect you from?

**Drill 5 — `Promise.all` vs a `for` loop.**

```ts
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
let t0 = Date.now();
await Promise.all([sleep(1000), sleep(1000), sleep(1000)]);
console.log("all:", Date.now() - t0);
t0 = Date.now();
for (const ms of [1000, 1000, 1000]) await sleep(ms);
console.log("loop:", Date.now() - t0);
```

*Predict:* roughly what two numbers print?

---

## Concepts

### 1. Tool use is a conversation, not magic

Claude never runs your code. It *asks* you to, and you send back the result.

```
 you ─────► [user: "Is any Hermes VM down?"]  + tool definitions
                                                     │
 Claude ◄───────────────────────────────────────────┘
   │
   └──► [assistant: tool_use { id:"tu_1", name:"get_vm_status", input:{} }]
        stop_reason: "tool_use"                    ← "please run this"
   │
 you run get_vm_status() against Proxmox → [{name:"hermes-b", status:"stopped"}, ...]
   │
 you ─────► [user: tool_result { tool_use_id:"tu_1", content:"[...]" }]
   │
 Claude ──► [assistant: "hermes-b is stopped. The other three are running."]
            stop_reason: "end_turn"                ← done
```

Note: the `tool_result` goes in a **user** message, and must reference the `tool_use_id` it answers.

These are **client-side tools**: they run in *your* code. There are also **server-side tools** (like web search) that Anthropic runs for you; the side quest compares them.

### 2. The loop

```
 ┌─► call Claude with history + tools
 │        │
 │        ├── stop_reason "end_turn"   ──► print, STOP
 │        ├── stop_reason "max_tokens" ──► warn (the answer or tool call was cut off), STOP
 │        ├── stop_reason "refusal"    ──► say Claude declined, STOP
 │        └── stop_reason "tool_use"
 │                 │
 │         for EACH tool_use block (there may be several!):
 │             run it → make a tool_result (is_error: true if it failed)
 │                 │
 │         append assistant message, then ONE user message with ALL tool_results
 │                 │
 └──── round < MAX_ROUNDS? ──── no ──► STOP with "gave up after N rounds"
```

Three rules hide in that picture:

- **Check `stop_reason` before running anything.** Only `"tool_use"` means "run these". A tool call cut off by `max_tokens` has incomplete input, so don't run it.
- **All results go back in ONE user message.** Claude can ask for several tools at once (parallel tool use). If you split the results across several user messages, Claude learns to stop making parallel calls.
- **`MAX_ROUNDS` always.** Without it, a confused model can loop forever and burn tokens.

### 3. A good tool definition is a prompt

```
 BAD                                 GOOD
 ───                                 ────
 name: "vm"                          name: "get_vm_status"
 description: "gets vms"             description: "List all VMs on the Proxmox node with
                                       their status (running/stopped), CPU %, memory use
                                       and uptime. Use this to answer questions about
                                       whether VMs are up or how loaded they are.
                                       Read-only."
 input_schema: { node: string }      input_schema: { name_filter?: string — optional
                                       substring to match VM names, e.g. "hermes" }
```

Claude decides when to call a tool based almost entirely on its **name and description**.

### 4. Keep tool results small

Every tool result goes into the conversation and is re-sent on every later round. Proxmox returns dozens of fields per VM; you only need five. Returning the trimmed `VmSummary` instead of the raw JSON keeps the context small, cheap and focused. That's **tool output pruning**, a context-engineering idea the exam names (D6).

### 5. When NOT to use an agent

If the steps are always the same (check all VMs, then summarise), you don't need a model choosing tools: just call the functions in order and send the results to Claude once. That's a **workflow**. Use an agent when the path depends on what you find. The exam tests this distinction.

```
 WORKFLOW (your code decides the path)        AGENT (Claude decides the path)
 ─────────────────────────────────────        ───────────────────────────────
 vms    = getVmStatus()                        loop: Claude picks a tool → you run it
 agents = checkHermesAgents()                        → Claude picks the next one...
 Claude: "summarise these"                     until Claude says it's done
 predictable, cheap, easy to test              flexible, handles surprises, costs more
```

---

## Read first (1.5 hours)

- javascript.info → *Fetch* (headers, response body, status)
- Claude docs (platform.claude.com/docs) → *Tool use*: implementing tool use, handling `tool_use` and `tool_result`, parallel tool use, errors with `is_error`
- Anthropic engineering post *Building effective agents* (workflows vs agents)
- Proxmox VE API docs → `GET /nodes/{node}/qemu` and API token authentication

---

## Build

### Step 0 — Create a read-only Proxmox token

In Proxmox: Datacenter → Permissions → API Tokens. Create a token for a dedicated user with the **PVEAuditor** role (read-only). Put the token ID and secret in `.env`.

This is **least privilege**: even if the agent gets confused, or tricked by text it reads, this token physically can't stop, delete or reconfigure anything.

Proxmox uses a self-signed certificate. Export its CA certificate and set `NODE_EXTRA_CA_CERTS` to its path. **Don't** set `NODE_TLS_REJECT_UNAUTHORIZED=0`; that turns off certificate checks for every request your program makes.

### Step 1 — Proxmox tool: `src/tools/proxmox.ts`

```ts
// src/tools/proxmox.ts
import { z } from "zod";
import { config } from "../config.js";

// Validate the part of Proxmox's response we use. Ignore the rest.
const QemuVm = z.object({
  vmid: z.number(),
  name: z.string().optional(),
  status: z.string(),          // "running" | "stopped" | ...
  cpu: z.number().optional(),  // 0..1 fraction
  mem: z.number().optional(),
  maxmem: z.number().optional(),
  uptime: z.number().optional(),
});
const QemuList = z.object({ data: z.array(QemuVm) });

export type VmSummary = {
  vmid: number;
  name: string;
  status: string;
  cpuPercent: number;
  memPercent: number;
  uptimeHours: number;
};

export async function getVmStatus(nameFilter?: string): Promise<VmSummary[]> {
  const { PROXMOX_URL, PROXMOX_TOKEN_ID, PROXMOX_TOKEN_SECRET, PROXMOX_NODE } = config;
  if (!PROXMOX_URL || !PROXMOX_TOKEN_ID || !PROXMOX_TOKEN_SECRET || !PROXMOX_NODE) {
    throw new Error("Proxmox is not configured in .env");
  }

  const url = `${PROXMOX_URL}/api2/json/nodes/${PROXMOX_NODE}/qemu`;
  const res = await fetch(url, {
    headers: {
      Authorization: `PVEAPIToken=${PROXMOX_TOKEN_ID}=${PROXMOX_TOKEN_SECRET}`,
    },
    signal: AbortSignal.timeout(5000),   // give up after 5s
  });

  // TODO 1: if !res.ok, throw an Error including res.status

  // TODO 2: parse with QemuList.parse(await res.json())

  // TODO 3: map each VM to a VmSummary
  //   cpuPercent = Math.round((vm.cpu ?? 0) * 100)
  //   memPercent = maxmem ? Math.round(mem / maxmem * 100) : 0
  //   uptimeHours = Math.round((vm.uptime ?? 0) / 3600)
  //   name = vm.name ?? `vm-${vm.vmid}`

  // TODO 4: if nameFilter is given, keep only VMs whose name includes it (case-insensitive)
}
```

Test it on its own before involving Claude:

```bash
npx tsx -e 'import("./src/tools/proxmox.ts").then(m => m.getVmStatus()).then(console.log)'
```

### Step 2 — Hermes health tool: `src/tools/hermes.ts`

`HERMES_AGENTS` in `.env` looks like `vm-a=http://10.0.0.11:8000/health,vm-b=http://10.0.0.12:8000/health`. Use the names and URLs of *your* Hermes VMs.

```ts
// src/tools/hermes.ts
import { config } from "../config.js";

export type AgentHealth = {
  name: string;
  url: string;
  ok: boolean;
  status?: number;
  latencyMs?: number;
  error?: string;
};

export function parseAgents(raw: string | undefined): { name: string; url: string }[] {
  // TODO 5: split on ",", then each piece on "=" → { name, url }
  //   skip empty pieces; trim whitespace (your warm-up Drill 3)
}

async function checkOne(name: string, url: string): Promise<AgentHealth> {
  const t0 = Date.now();
  try {
    // TODO 6: fetch url with a 3s timeout; return ok, status, latencyMs
  } catch (err) {
    // TODO 7: return ok: false with error message (timeout, refused, ...)
  }
}

export async function checkHermesAgents(): Promise<AgentHealth[]> {
  const agents = parseAgents(config.HERMES_AGENTS);
  // Promise.all runs all checks AT THE SAME TIME instead of one after another.
  return Promise.all(agents.map((a) => checkOne(a.name, a.url)));
}
```

**Predict, then run:** with 4 agents where one times out after 3s, how long does `checkHermesAgents()` take with `Promise.all`? How long would a `for` loop with `await` take? Time both.

> If your Hermes agents don't expose a health endpoint, use whatever endpoint they do have (or check that the port is open). Write down what "healthy" means for a Hermes agent. That definition matters more than the code; it's a *requirement*, and turning a vague need into a precise requirement is an exam objective (D2 Understanding Requirements).

### Step 3 — Registry: `src/tools/registry.ts`

One place that holds every tool's definition (for Claude) and implementation (for you).

```ts
// src/tools/registry.ts
import type Anthropic from "@anthropic-ai/sdk";
import { getVmStatus } from "./proxmox.js";
import { checkHermesAgents } from "./hermes.js";

export const TOOL_DEFINITIONS: Anthropic.Tool[] = [
  {
    name: "get_vm_status",
    description: "TODO 8: write a GOOD description (see Concepts §3)",
    input_schema: {
      type: "object",
      properties: {
        name_filter: { type: "string", description: "TODO" },
      },
    },
  },
  {
    name: "check_hermes_agents",
    description: "TODO 9",
    input_schema: { type: "object", properties: {} },
  },
];

// Record<string, X> = an object whose keys are strings and values are X
type Handler = (input: any) => Promise<unknown>;
const HANDLERS: Record<string, Handler> = {
  get_vm_status: (input) => getVmStatus(input?.name_filter),
  check_hermes_agents: () => checkHermesAgents(),
};

export async function runTool(name: string, input: unknown): Promise<{ content: string; isError: boolean }> {
  const handler = HANDLERS[name];
  if (!handler) return { content: `Unknown tool: ${name}`, isError: true };
  try {
    const result = await handler(input);
    return { content: JSON.stringify(result), isError: false };
  } catch (err) {
    // Tell Claude what went wrong so it can explain or try something else.
    return { content: `Tool failed: ${(err as Error).message}`, isError: true };
  }
}
```

(Using `any` for `input` is a deliberate learning shortcut. In the stretch, replace it with a Zod schema per tool.)

### Step 4 — The loop: `src/agent.ts`

```ts
// src/agent.ts
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "./client.js";
import { config } from "./config.js";
import { TOOL_DEFINITIONS, runTool } from "./tools/registry.js";

const MAX_ROUNDS = 6;
const SYSTEM = `You are an operations assistant for a homelab.
Use the tools to check real state before answering. Never guess VM or agent status.
If a tool fails, say so plainly. Keep answers short and specific.`;

async function main() {
  const question = process.argv.slice(2).join(" ");
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: question }];

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const res = await client.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      tools: TOOL_DEFINITIONS,
      messages,
    });

    // TODO 10: append the assistant message: { role: "assistant", content: res.content }

    // TODO 11: if res.stop_reason !== "tool_use":
    //   if it's "max_tokens" or "refusal", print a warning saying so;
    //   print the text blocks and return

    // TODO 12: collect every block with type "tool_use"
    //   for each: log `→ tool name(input)` to stderr,
    //   await runTool(block.name, block.input),
    //   build { type: "tool_result", tool_use_id: block.id,
    //           content: result.content, is_error: result.isError }
    //   (stretch: run them all at once with Promise.all)

    // TODO 13: append ONE user message whose content is the array of tool_results
  }

  console.error(`Stopped after ${MAX_ROUNDS} rounds without a final answer.`);
}

main();
```

### Step 5 — Try real questions

```bash
npm run agent "Are all my Hermes agents healthy?"
npm run agent "Which VM is using the most memory?"
npm run agent "Is hermes-b running, and is its agent responding?"
npm run agent "What's the weather in Singapore?"     # no tool fits: what does it do?
```

For each, write down: which tools were called, in what order, and how many rounds it took.

### Step 6 — Break it

| Experiment | What happens? |
|---|---|
| Stop one Hermes agent | |
| Wrong Proxmox token secret | |
| Change a tool description to just `"gets data"` | |
| Set `MAX_ROUNDS = 1` and ask a two-tool question | |
| Forget TODO 10 (don't append the assistant message) | |
| Send each tool_result in its *own* user message | |

### Step 7 — Now see what the helper hides

You wrote the loop by hand so you understand it. In real code you'd often let the SDK run it for you with the **tool runner**. Build a second version, `src/agent-runner.ts`, and compare.

```ts
// src/agent-runner.ts
import { z } from "zod";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import { client } from "./client.js";
import { config } from "./config.js";
import { getVmStatus } from "./tools/proxmox.js";

const vmStatusTool = betaZodTool({
  name: "get_vm_status",
  description: "TODO 14: reuse your good description",
  inputSchema: z.object({
    name_filter: z.string().optional().describe("Substring to match VM names, e.g. 'hermes'"),
  }),
  // input is typed AND validated by Zod before run() is called: no `any` here
  run: async (input) => JSON.stringify(await getVmStatus(input.name_filter)),
});

// TODO 15: make a second tool for checkHermesAgents (inputSchema: z.object({}))

const question = process.argv.slice(2).join(" ");
const runner = client.beta.messages.toolRunner({
  model: config.CLAUDE_MODEL,
  max_tokens: 1024,
  messages: [{ role: "user", content: question }],
  tools: [vmStatusTool /* , TODO 15 */],
});

const final = await runner;   // runs the whole loop until Claude stops asking for tools
// TODO 16: print the text blocks of `final`
```

Run both versions on the same question. Then answer in your notes: what did the runner do that your loop did by hand? What can you no longer see or control? When would you still write the loop yourself?

### Common TypeScript errors in this step

| You see | What it means |
|---|---|
| `Function lacks ending return statement and return type does not include 'undefined'` | A TODO function promises to return something but not every path returns yet. Finish the TODO. |
| `Property 'id' does not exist on type 'ContentBlock'` | Narrow first: `if (block.type === "tool_use")` (or `.filter()` with a type guard). |
| `Type '{ type: "tool_result"; ... }[]' is not assignable to …` | The tool result object has a typo or wrong field name. Compare with `Anthropic.ToolResultBlockParam`. |
| `TypeError: fetch failed` with `cause: … self-signed certificate` | Node doesn't trust Proxmox's cert yet. Set `NODE_EXTRA_CA_CERTS`, don't disable TLS. |
| `ZodError: … expected number, received undefined` | Proxmox returned a field shape you didn't expect. Print the raw JSON and adjust the schema. |

---

## Checkpoint

- [ ] Both tools work on their own
- [ ] The agent answers real questions with real data from your homelab
- [ ] Multiple tool calls in one response are handled (all results in one user message)
- [ ] Tool failures go back to Claude with `is_error: true`, and Claude explains them
- [ ] `max_tokens` and `refusal` stop reasons are handled, not treated as tool calls
- [ ] The loop stops at `MAX_ROUNDS`
- [ ] The tool-runner version works and you've compared it with your loop
- [ ] Your "break it" table is filled in

---

## Stretch

- Add a third tool, `check_service`, that takes a URL from an **allow-list** in config and returns status and latency. Why an allow-list rather than any URL? (You'll come back to this in step 06.)
- Replace `input: any` in the registry with a Zod schema per tool and validate before running.
- Write the **workflow** version: call both tools in code, then send all results to Claude once. Compare tokens and latency with the agent version. When would you pick each?
- Run the tool calls in TODO 12 at the same time with `Promise.all`.

---

## 🧪 Exam side quest (optional)

- **Four ways to build an agent (D1 Agent Construction).** Fill in this table from the docs (Claude docs and code.claude.com/docs → Agent SDK):

  | Approach | Who writes the loop? | Who hosts it? | Which tools? |
  |---|---|---|---|
  | Your manual loop (Step 4) | | | |
  | SDK tool runner (Step 7) | | | |
  | Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`) | | | |
  | Managed Agents | | | |

  Then try the Agent SDK: `npm install @anthropic-ai/claude-agent-sdk`, follow its TypeScript quickstart to run one `query({ prompt, options })`, and note what it gives you that the tool runner doesn't (built-in file, shell and web tools; it's Claude Code's harness as a library). Check the docs for the options rather than guessing. Managed Agents is the one where Anthropic runs the loop *and* hosts the sandbox the tools run in.
- **Client-side vs server-side tools (D8 Tool Implementation).** Read the Claude docs on the web search tool. Add it to a one-off request alongside your tools and ask "Is there a newer Proxmox release than the one my node runs?". Who executes each tool? Where does each result come from? What does your loop need to do differently, if anything?
- **Frameworks (D1 Agent Patterns and Frameworks).** Pick one of Strands, LangGraph or PydanticAI. Read its "agent" quickstart and find the loop. Map its names to yours: where is `MAX_ROUNDS`? Where do tool results go? Write five lines.

> **🏭 Production aside (skip on first pass):** a production agent would add per-tool timeouts and rate limits, structured logs of every round, and tracing so you can replay a bad run. Step 06 adds the audit log; the rest is out of scope here.

---

## Exam check

1. *(D8)* What `stop_reason` means "run a tool"? In which role's message does a `tool_result` go?
2. *(D8)* Claude returns two `tool_use` blocks in one response. How do you send the results back, and what goes wrong if you don't?
3. *(D8)* A tool throws an exception. What should you send to Claude, and why not just crash?
4. *(D1)* Why does an agent loop need a maximum number of rounds?
5. *(D8)* Claude keeps calling the wrong tool. What's the first thing you change?
6. *(D1)* Give an example from this homelab where a fixed workflow is better than an agent, and one where an agent is better.
7. *(D1)* What's the difference between the SDK tool runner, the Claude Agent SDK and Managed Agents?
8. *(D6)* Why return a trimmed summary from a tool instead of the raw API response?
9. *(D7)* Why should the Proxmox token have only the PVEAuditor role?

Then run `/exam-quiz 04` in Claude Code for more.

---

## Write-up (`notes/04.md`)

Copy [notes/TEMPLATE.md](../notes/TEMPLATE.md) and fill it in. Include:

- Your tool-call log for the four questions in Step 5
- Your "break it" table
- Your definition of "healthy" for a Hermes agent
- Manual loop vs tool runner: what the helper hides
- Draw the agent loop from memory
