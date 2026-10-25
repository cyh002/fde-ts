# Step 05 — Turn your tools into an MCP server

> **Time:** 8–10 hours · **Builds on:** step 04 (your tools and registry) and `playground/mcp-hello` (your first MCP experiment) · **Unlocks:** step 06 (securing the server, HTTP transport)

## The three strands in this step

| Strand | In this step | How it connects |
|---|---|---|
| 🟦 **JS/TS** | ES modules and refactoring (`import`/`export` across files), `import.meta.url` and file paths, stdin/stdout vs stderr, Zod *shapes* | Good module boundaries are what let one tool implementation serve your CLI agent *and* every MCP client |
| 🟩 **Homelab** | `npm run mcp`: your Proxmox and Hermes tools, plus an inventory resource and a triage prompt, available in Claude Code, Claude Desktop and (if they support it) your Hermes agents | Every AI client you run gets your homelab tools without new code |
| 🟧 **Exam** | D8 MCP Server Development (2.1%) · D8 Agentic Customization (4.1%) · D2 Software Engineering Foundations (refactoring) · D2 Claude Application Design (same server, many interfaces) · D3 Claude Code Operation (`claude mcp add`) | MCP primitives and transports, *and* knowing when MCP is the right choice versus a custom tool, a Skill or a built-in tool |

---

## Why this matters

In step 04, your tools only work inside your own agent. With MCP, *any* MCP client (Claude Code, Claude Desktop, your Hermes agents if they support MCP, even gateways that proxy MCP) can use the same tools without new code. You write the Proxmox check once, and every assistant you use can answer "is hermes-b up?".

MCP is also not always the answer. Agentic Customization is worth 4.1% of the exam on its own: choosing between built-in tools, custom tools, Skills and MCP. This step makes you choose, for your own homelab.

---

## 🟦 Warm-up drills (scratch.ts, 20–40 min)

**Drill 1 — Re-read your first MCP server.** Open `playground/mcp-hello/server.ts` and `test-client.ts`. You built these before the course started. Run `npm run hello:mcp`.

*Predict:* before running, write down (a) what `listTools` will show for the `greet` tool's `language` field, (b) what the "BAD CALL" with `language: "fr"` returns. Is it a thrown error or a normal result with `isError: true`?

**Drill 2 — A Zod *shape* vs a Zod *object*.**

```ts
import { z } from "zod";
const shape = { name: z.string(), language: z.enum(["en", "ms"]).default("en") };
const schema = z.object(shape);
console.log(schema.parse({ name: "Hermes" }));
```

*Predict:* what prints? Note that `registerTool` in mcp-hello takes the *shape* (the plain object), not `z.object(...)`.

**Drill 3 — stdout vs stderr.**

```ts
console.log("to stdout");
console.error("to stderr");
```

Run `npx tsx scratch.ts > out.txt`, then `cat out.txt`. *Predict:* which line appears in the terminal, and which in the file? (This is the single most important fact for stdio MCP servers.)

**Drill 4 — Where am I?**

```ts
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
console.log("cwd:  ", process.cwd());
console.log("file: ", dirname(fileURLToPath(import.meta.url)));
```

Run it from the repo root, then `cd /tmp && npx tsx ~/projects/fde-ts/scratch.ts` (adjust the path). *Predict:* which line changes and which stays the same?

---

## Concepts

### 1. Before and after MCP

```
 BEFORE (04)                                   AFTER (05)
 ───────────                                   ──────────
 agent.ts ──► registry.ts ──► Proxmox          Claude Desktop ─┐
                                               Claude Code ────┼─► MCP server ──► proxmox.ts / hermes.ts
 (only your agent can use the tools)           Hermes agent ───┤        (one implementation)
                                               your agent.ts ──┘
```

### 2. The three things a server can offer

| Primitive | Who decides to use it | Example in hermes-ctl |
|---|---|---|
| **Tool** | the model | `get_vm_status`, `check_hermes_agents` |
| **Resource** | the app/user (attached as context) | `hermes://inventory`: a list of your VMs and what runs on each |
| **Prompt** | the user (a reusable template) | `triage_incident`: "investigate VM X step by step" |

The exam likes this distinction. Tools are model-controlled; resources are application-controlled; prompts are user-controlled.

### 3. Transports

```
 stdio                                         Streamable HTTP
 ─────                                         ───────────────
 client starts your server as a child          your server runs on its own (e.g. on a VM)
 process and talks over stdin/stdout           and clients connect over the network
 local, simple, no network, no auth needed     remote, shared, NEEDS auth (step 06)
```

**The #1 stdio bug:** stdout is the protocol channel. A stray `console.log` writes junk into it and breaks the connection. In an MCP stdio server, log with `console.error` only (it goes to stderr). You proved this in Drill 3.

### 4. What happens on connect

```
 client                                server
   │── initialize ───────────────────────►│
   │◄────────────── capabilities ─────────│   "I have tools, resources, prompts"
   │── tools/list ───────────────────────►│
   │◄────────────── [get_vm_status, ...] ─│
   │── tools/call get_vm_status {} ──────►│
   │◄────────────── { content: [...] } ───│
```

It's JSON-RPC. You'll watch these messages in the MCP Inspector.

### 5. Which mechanism? Built-in tools vs custom tools vs Skills vs MCP

MCP is one of four ways to give Claude a new capability. Picking the right one is the D8 *Agentic Customization* objective.

| Mechanism | What it is | Reach for it when… | Homelab example |
|---|---|---|---|
| **Built-in tool** | A tool the client already ships (Claude Code's file read/edit, bash, web search) | The capability already exists. Don't rebuild it. | Reading `inventory.md` or your Bifrost config from inside Claude Code |
| **Custom tool** | A function you define in *one* app's agent loop (step 04's registry) | Only one app needs it, and it's tightly tied to that app | A tool only your benchmark script uses, e.g. "score this summary against my rubric" |
| **Skill** | A folder of instructions (and optional scripts) that Claude loads when relevant. Know-how, not a live connection. | You want Claude to follow a *procedure* or *conventions* repeatedly | "How I triage a Hermes incident": the steps, what to check first, how to write it up |
| **MCP server** | A separate process exposing tools/resources/prompts over a standard protocol | Several clients need the same live access to a system, maintained independently of any one app | Proxmox VM status and Hermes health, used by Claude Code, Claude Desktop and Hermes |

Notice that **Skill and MCP combine well**: the Skill holds the *procedure* ("check VM status, then the agent, then compare with the inventory"), and the MCP server provides the *live data* the procedure needs.

This repo already contains two Skills: `.claude/skills/tutor-review/` and `.claude/skills/exam-quiz/`. Open one and read its `SKILL.md`. It's just instructions with a name and a description, and Claude Code loads it when the description matches what you ask. In step 08 you'll write your own.

**Exercise (write the answers in your notes):** for each need, pick a mechanism and give one sentence of reasoning.

1. Claude Code should be able to grep your Proxmox backup logs on this machine.
2. Your phone's Claude Desktop and Claude Code should both be able to check whether Bifrost is responding.
3. Every time you ask for a "weekly homelab report", Claude should follow the same structure and tone.
4. Your PII harness needs a function that normalises phone numbers before comparison.
5. Your Hermes agents should be able to ask for each other's health status.

---

## Read first (1.5 hours)

- MCP docs (modelcontextprotocol.io) → *Architecture* and *Server concepts* (tools, resources, prompts)
- MCP TypeScript SDK README → the `McpServer`, `registerTool`, `registerResource`, `registerPrompt` examples and the stdio transport
- Claude Code docs (code.claude.com/docs) → *MCP* and *Skills* pages, just enough to compare them
- Anthropic Academy → *Introduction to MCP* (it uses Python; learn the concepts, then build in TypeScript here)

---

## Build

### Step 1 — Refactor first

Your tool *implementations* (`proxmox.ts`, `hermes.ts`) stay as they are. The MCP server and the agent will both import them. Make sure neither file uses `console.log`; switch any logging to `console.error`.

Also check `config.ts`: `import "dotenv/config"` loads `.env` from the **current working directory**. When Claude Desktop launches your server, the working directory may not be your repo. Change it to load `.env` relative to the file:

```ts
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../.env") });
```

**Predict:** why does `.env` loading work fine from your terminal but fail when Claude Desktop starts the server? (Drill 4 is the clue.)

After refactoring, run `npm run agent "Are my Hermes agents healthy?"` again. A refactor changes structure, not behaviour, so it should still work exactly as before.

### Step 2 — The server: `src/mcp/server.ts`

Compare this with `playground/mcp-hello/server.ts`. It's the same structure with more primitives.

```ts
// src/mcp/server.ts
import { readFile } from "node:fs/promises";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getVmStatus } from "../tools/proxmox.js";
import { checkHermesAgents } from "../tools/hermes.js";

const server = new McpServer({ name: "hermes-ctl", version: "0.1.0" });

// ── Tool 1 ──────────────────────────────────────────────────────────────
server.registerTool(
  "get_vm_status",
  {
    title: "Get VM status",
    description: "TODO 1: reuse your good description from step 04",
    // As in mcp-hello: inputSchema is a Zod *shape* (an object of Zod types),
    // and the SDK turns it into JSON Schema for you.
    inputSchema: {
      name_filter: z.string().optional().describe("Substring to match VM names, e.g. 'hermes'"),
    },
  },
  async ({ name_filter }) => {
    try {
      const vms = await getVmStatus(name_filter);
      return { content: [{ type: "text", text: JSON.stringify(vms, null, 2) }] };
    } catch (err) {
      // TODO 2: return the error as content with isError: true
      //   (so the model sees it, instead of the call crashing)
    }
  },
);

// ── Tool 2 ──────────────────────────────────────────────────────────────
// TODO 3: register check_hermes_agents (no inputs)

// ── Resource ────────────────────────────────────────────────────────────
// A static description of your homelab: which VM runs what.
// Fill in inventory.md in the repo root with your real VMs.
server.registerResource(
  "inventory",
  "hermes://inventory",
  {
    title: "Homelab inventory",
    description: "Which VMs exist and which services run on each",
    mimeType: "text/markdown",
  },
  async (uri) => {
    // TODO 4: read inventory.md (resolve its path relative to this file, like .env in Step 1)
    //         and return { contents: [{ uri: uri.href, text }] }
  },
);

// ── Prompt ──────────────────────────────────────────────────────────────
server.registerPrompt(
  "triage_incident",
  {
    title: "Triage an incident",
    description: "Step-by-step investigation of a problem on one VM",
    argsSchema: { vm: z.string().describe("VM name, e.g. hermes-b") },
  },
  ({ vm }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          // TODO 5: write a good triage prompt. It should tell the model to:
          //   check the VM's status, check its Hermes agent, compare with the
          //   inventory, and report findings + likely cause + next step.
          text: `...${vm}...`,
        },
      },
    ],
  }),
);

// ── Start ───────────────────────────────────────────────────────────────
await server.connect(new StdioServerTransport());
console.error("hermes-ctl MCP server running on stdio");   // stderr, not stdout!
```

### Step 3 — Test with the MCP Inspector

```bash
npm run inspector
# (runs: npx @modelcontextprotocol/inspector npx tsx src/mcp/server.ts)
```

It opens in your browser. Connect, then:

1. **Tools** tab → list tools → call `get_vm_status` with and without a filter
2. **Resources** tab → read `hermes://inventory`
3. **Prompts** tab → get `triage_incident` with `vm = hermes-b`
4. Find the raw JSON-RPC messages. Match them to the diagram in Concepts §4.

**Break it:** add `console.log("hi")` at the top of `server.ts`. *Predict* what the Inspector shows, then try it. Remove it.

### Step 4 — Connect real clients

**Claude Code:**

```bash
claude mcp add hermes-ctl -- npx tsx /absolute/path/to/hermes-ctl/src/mcp/server.ts
```

Then in Claude Code: "Use hermes-ctl to tell me which VMs are running." Also try `/mcp` inside Claude Code to see the server's status.

**Claude Desktop:** add an entry to `claude_desktop_config.json` under `mcpServers`, with `command` and `args` pointing at the same thing (absolute paths). Restart Claude Desktop.

```json
{
  "mcpServers": {
    "hermes-ctl": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/hermes-ctl/src/mcp/server.ts"]
    }
  }
}
```

Ask both clients the same question. Do they phrase their answers differently, or call the tools differently? Same server, different interfaces: that's the D2 *Claude Application Design* objective in action.

**Hermes agents:** if your Hermes setup can load MCP servers, register `hermes-ctl` there too. Now your agents can check on each other.

**Bifrost (optional):** Bifrost has MCP support. Read its docs and decide whether routing this server through Bifrost would help you (central logging, one place to manage tools) or just add a hop.

### Step 5 — Build both sides: point your own agent at the server (optional but worth it)

Rewrite `agent.ts` (or a copy, `agent-mcp.ts`) so it gets its tools from the MCP server instead of importing `registry.ts`. Use the SDK's `Client` and `StdioClientTransport` exactly as `playground/mcp-hello/test-client.ts` does:

```ts
// TODO 6: connect a Client to `npx tsx src/mcp/server.ts`
// TODO 7: const { tools } = await client.listTools()
//         map each MCP tool to an Anthropic.Tool: { name, description, input_schema: tool.inputSchema }
// TODO 8: in your loop, replace runTool(...) with client.callTool({ name, arguments: input })
//         and turn its content into your tool_result
```

Now you've built both sides of the protocol.

### Common TypeScript errors in this step

| You see | What it means |
|---|---|
| `Cannot find module '../tools/proxmox'` | ES modules need the extension: `'../tools/proxmox.js'` (yes, `.js`, even though the file is `.ts`). |
| `ReferenceError: __dirname is not defined` | ES modules don't have `__dirname`. Use `dirname(fileURLToPath(import.meta.url))`. |
| `Type '...' is not assignable to type 'CallToolResult'` | Your handler's return value has the wrong shape. Each content item needs `type: "text"` and `text`. |
| `Function lacks ending return statement` in a handler | A `catch` branch doesn't return yet (TODO 2). |
| Inspector: "Connection closed" / JSON parse error | Something wrote to stdout. Search for `console.log`. |

---

## Checkpoint

- [ ] The agent still works after the refactor
- [ ] Inspector lists 2+ tools, 1 resource, 1 prompt, and all work
- [ ] A tool failure comes back as `isError: true`, not a crash
- [ ] Works in Claude Code **or** Claude Desktop (ideally both)
- [ ] No `console.log` anywhere in the server's code path
- [ ] `.env` and `inventory.md` load correctly no matter which directory the server starts from
- [ ] The five-needs mechanism exercise is answered in your notes

---

## Stretch

- Add a resource *template*: `hermes://vm/{name}/config` that returns notes for one VM.
- Add `outputSchema` to a tool and return `structuredContent` alongside the text.
- Clone a popular open-source TypeScript MCP server and find: where tools are registered, how errors are returned, which transport it uses. Write five lines on what they did differently.

---

## 🧪 Exam side quest (optional)

- **Skill + MCP together (D8 Agentic Customization).** Write a tiny Skill, `.claude/skills/hermes-triage/SKILL.md`, describing *how* you triage a Hermes incident. Tell it to use the `hermes-ctl` MCP tools for the live checks. Ask Claude Code "hermes-b seems down, can you triage it?" and watch it use both. Compare with your `triage_incident` MCP prompt: which would you keep, and why?
- **Where MCP lives in Claude Code config (D2 Configuration Management, D3).** Find where `claude mcp add` stored your server (look up MCP *scopes* in the Claude Code docs: local, project, user). What would you commit to git so the whole repo shares the server, and what must stay out of git?

> **🏭 Production aside (skip on first pass):** a shared MCP server would be versioned and released, run as a service with health checks, and its tool list kept small and well-described so models pick correctly. Step 06 covers the part that matters most at home: authentication when it's on the network.

---

## Exam check

1. *(D8)* What's the difference between an MCP tool, resource and prompt? Who controls each?
2. *(D8)* When would you use stdio vs Streamable HTTP?
3. *(D8)* An MCP server works in the Inspector but Claude Desktop shows it as failed. List three likely causes.
4. *(D8)* Why must a stdio MCP server never write logs to stdout?
5. *(D8)* Why return tool errors as content with `isError: true` instead of throwing?
6. *(D8)* Several apps need live access to the same internal REST API, maintained independently of any one app. Built-in tool, custom tool, Skill or MCP server? Why?
7. *(D8)* You want Claude to follow the same multi-step procedure every time you ask for a weekly report. Which mechanism fits, and why not an MCP server?
8. *(D2)* Your MCP server has 40 tools and the model picks the wrong one. What would you change?

Then run `/exam-quiz 05` in Claude Code for more.

---

## Write-up (`notes/05.md`)

Copy [notes/TEMPLATE.md](../notes/TEMPLATE.md) and fill it in. Include:

- One raw JSON-RPC exchange from the Inspector, annotated
- The causes of "server failed to start" you actually hit (or could imagine)
- Your answers to the five-needs mechanism exercise
- When you'd use your CLI agent vs the MCP server
