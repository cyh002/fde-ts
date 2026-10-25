# Step 00 — Setup

> **Time:** 1–2 hours · **Builds on:** nothing, you start here · **Unlocks:** Step 01

| Strand | In this step | How it connects |
|---|---|---|
| 🟦 JS/TS | Node, npm, `tsx`, `import`/`export`, `process.env`, your first Zod schema, `fetch` | `process.env` is how your code *reads* homelab settings; Zod is how it *refuses* bad ones. Both come back in every later step and in the exam's config questions. |
| 🟩 Homelab | `src/config.ts` (validated settings) and `src/check.ts` (a raw HTTP call to Bifrost) | Proves your laptop can reach Bifrost before any SDK or model is involved. When step 01 fails, you'll know it isn't the network. |
| 🟧 Exam | D2 Configuration Management (4.1%) · D7 Identity, Secrets, and Key Management (1.6%) · D5 Technical Fundamentals (6.1%) | `.env` + validation is the exam's "secrets and config" story. Today's raw `fetch` call is the *same request* the SDK sends in step 01, which is exactly the "SDKs that wrap REST APIs" objective. |

### How the whole course works (read once)

Every step has these three strands. You learn a little JavaScript/TypeScript (🟦), use it straight away to build something real for your homelab (🟩), and then explain it in the exam's vocabulary (🟧). If a strand ever feels pointless, look at the "How it connects" column. Each one should give the other two a reason to exist.

---

## Why this matters

Most "the AI is broken" moments in a homelab are really "the config is wrong": a missing env var, a wrong base URL, a key that doesn't match. In this step you set things up so a bad config fails **loudly and early**, with a message that tells you exactly what's wrong. Future you, debugging at 2am, will be grateful.

---

## 🟦 Warm-up drills (scratch.ts, 20–40 min)

Create `scratch.ts` in the repo root (it's git-ignored). Run `npm run scratch:watch` in a terminal. It re-runs the file every time you save. For each drill, type the code, write your prediction in a comment, *then* save.

**1. Values and `console.log`**

```ts
const host = "bifrost.lan";
const port = 8080;
console.log(host, port, typeof port);
```

Predict: what does `typeof port` print?

**2. Template strings**

```ts
const url = `http://${host}:${port}/anthropic`;
console.log(url);
```

Predict: the exact printed URL. What happens if you use normal quotes `"..."` instead of backticks?

**3. `process.env` and `undefined`**

```ts
console.log(process.env.HOME);
console.log(process.env.BIFROST_API_KEY);   // not loaded yet
```

Predict: what does the second line print? (This is the trap that the rest of this step defends against.)

**4. Objects and optional values**

```ts
const settings = { model: "claude-haiku-4-5", maxTokens: 20 };
console.log(settings.model, settings.temperature);
```

Predict: does reading a field that doesn't exist crash, or print something? What does TypeScript say in your editor?

**5. Your first Zod schema**

```ts
import { z } from "zod";
const Port = z.number().int().min(1).max(65535);
console.log(Port.safeParse(8080));
console.log(Port.safeParse(99999));
```

Predict: what's the shape of each result? Which field tells you if it passed?

Delete the drills when you're done, or keep them commented out as notes.

---

## Concepts

### What runs what

```
  your .ts file
       │
       ▼
     tsx  ──── strips the types, hands plain JavaScript to ──►  Node.js  ──► runs it
```

- **Node.js** runs JavaScript on your machine (not in a browser).
- **TypeScript** adds types on top of JavaScript. Your editor and `tsc` check the types, then they're thrown away. They never exist at runtime.
- **`tsx`** lets you run a `.ts` file directly: `npx tsx src/check.ts`.

### package.json is the project's control panel

```
package.json
├── "dependencies"     → libraries your code uses (Anthropic SDK, Zod, MCP SDK)
├── "devDependencies"  → tools for development only (TypeScript, tsx, Vitest)
├── "scripts"          → shortcuts: `npm run check` runs whatever "check" says
└── "type": "module"   → use modern `import`/`export` syntax
```

Look at the versions in `package.json`: they're **pinned** (`^1.3.0`, not `latest`). That means everyone who runs `npm install` gets a compatible version and your code doesn't silently change under you. Pinning versions, and later pinning *model* versions, is an exam topic (D2 Configuration Management).

### Environment variables

A config value that lives *outside* your code. Your code reads it from `process.env`.

```
.env file                       your code
──────────                      ─────────
BIFROST_API_KEY=bf-vk-123  ──►  process.env.BIFROST_API_KEY   // "bf-vk-123"
                                process.env.SOMETHING_ELSE    // undefined  ← the trap
```

Anything you didn't set comes back as `undefined`, silently. That's why you validate.

---

## Read first (30 min)

- javascript.info → *Modules, introduction* (just the `import`/`export` part)
- Skim `package.json` and `tsconfig.json` in this repo. Don't try to understand every option yet.

---

## Build

### Step 1 — Install and sanity-check

```bash
node --version        # must be 20 or higher
npm install
npm run hello:mcp     # runs your playground MCP server + test client; no network, no model
```

If `hello:mcp` prints a `GOOD CALL` and a `BAD CALL`, your toolchain (Node, npm, `tsx`, TypeScript, Zod) works. Anything that breaks after this is config, not tooling.

**Predict, then run:** after `npm install`, which folder holds all the downloaded libraries? Check with `ls`. Why is it in `.gitignore`?

### Step 2 — Fill in `.env`

```bash
cp .env.example .env
```

Open `.env` and fill in at least `BIFROST_BASE_URL`, `BIFROST_API_KEY` and `CLAUDE_MODEL` (leave it as `claude-haiku-4-5`, the cheapest current model).

> **Bifrost URL:** it must end in `/anthropic`, e.g. `http://bifrost.lan:8080/anthropic`. The SDK adds `/v1/messages` itself. If you leave off `/anthropic`, you'll hit Bifrost's OpenAI-style route and get confusing errors.

> **Model name:** check how your Bifrost config names Anthropic models. Some setups use the plain model ID; others use a provider prefix. Try the plain ID first.

### Step 3 — Write `src/config.ts`

This file loads `.env`, checks every value with Zod, and exports one typed `config` object. Every other file imports from here, so nobody else touches `process.env`.

Type this out yourself (don't paste). The comments explain each line.

```ts
// src/config.ts
import "dotenv/config";          // reads .env into process.env
import { z } from "zod";          // runtime validation library

// Describe the shape we expect. Each line is a rule.
const EnvSchema = z.object({
  BIFROST_BASE_URL: z.url(),                   // must look like a URL
  BIFROST_API_KEY: z.string().min(1),          // must not be empty
  CLAUDE_MODEL: z.string().default("claude-haiku-4-5"),

  // Optional for now — used from step 04
  PROXMOX_URL: z.url().optional(),
  PROXMOX_TOKEN_ID: z.string().optional(),
  PROXMOX_TOKEN_SECRET: z.string().optional(),
  PROXMOX_NODE: z.string().optional(),
  HERMES_AGENTS: z.string().optional(),
  MCP_AUTH_TOKEN: z.string().optional(),
});

// safeParse never throws; it returns { success, data } or { success, error }
const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Bad configuration in .env:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
  }
  process.exit(1);               // stop now, loudly
}

export const config = parsed.data;
// Hover over `config` in VS Code: TypeScript knows every field and its type.
```

**Predict, then run:** delete `BIFROST_API_KEY` from `.env` and run `npx tsx src/config.ts`. What do you expect to see? Run it. Put the key back.

### Step 4 — Write `src/check.ts`

A connectivity check: can we reach Bifrost at all? This uses plain `fetch` (no SDK) so you can see the raw HTTP. In step 01 the SDK will send this *same* request for you. Keep that in mind.

```ts
// src/check.ts
import { config } from "./config.js";   // note: .js even though the file is .ts

async function main() {
  console.log(`Checking ${config.BIFROST_BASE_URL} ...`);

  try {
    // TODO 1: send a minimal POST to `${config.BIFROST_BASE_URL}/v1/messages`
    //   headers:
    //     "content-type": "application/json"
    //     "x-api-key": config.BIFROST_API_KEY
    //     "anthropic-version": "2023-06-01"
    //   body: JSON.stringify({ model: config.CLAUDE_MODEL, max_tokens: 20,
    //                          messages: [{ role: "user", content: "Say OK" }] })

    // TODO 2: print res.status
    // TODO 3: read the body with `await res.json()` and print it
  } catch (err) {
    // fetch only throws for network problems (DNS, refused, timeout),
    // NOT for 4xx/5xx — those come back as a normal response with a status.
    console.error("❌ Could not reach Bifrost:", err);
    process.exit(1);
  }
}

main();
```

Hint for TODO 1:

```ts
const res = await fetch(url, { method: "POST", headers: { /* ... */ }, body: /* ... */ });
```

> **Auth header:** Bifrost may expect your virtual key in a different header depending on how it's configured. If `x-api-key` gives you a 401, check the Bifrost docs for your setup.

### Step 5 — Run it

```bash
npm run check
```

### Step 6 — Break it

One change at a time. Restore after each. Write down what you see.

| Change | Status / error you got |
|---|---|
| Wrong `BIFROST_API_KEY` | |
| Remove `/anthropic` from the URL | |
| Wrong port | |
| `CLAUDE_MODEL=not-a-model` | |

When it all works, run `/tutor-review src/config.ts` in Claude Code for feedback.

### Common TypeScript errors in this step

| You see | What it means | Fix |
|---|---|---|
| `Cannot find module './config'` | ESM imports need the file extension, and it's `.js` even for `.ts` files | `import { config } from "./config.js"` |
| `Cannot use import statement outside a module` | Node thinks the file is old-style CommonJS | Check `"type": "module"` is in `package.json` |
| `Top-level 'await' expressions are only allowed when…` | Your `tsconfig` target/module doesn't allow top-level await | Keep `"module": "NodeNext"`, or put the code inside `async function main()` |
| `Property 'FOO' does not exist on type …` | You read a field that isn't in your Zod schema | Add it to `EnvSchema`. That's the point: one place lists every setting. |

### Troubleshooting table

| You see | Most likely cause |
|---|---|
| `ECONNREFUSED` / `fetch failed` | Wrong host or port, or Bifrost isn't running |
| `404` | Missing `/anthropic` in the base URL, or the path is doubled (`/v1/v1`) |
| `401` / `403` | Wrong key, or wrong header name for your Bifrost auth setup |
| `400` mentioning `model` | Model name doesn't match what Bifrost has configured |

> **🏭 Production aside (skip on first pass):** real deployments keep secrets in a secrets manager (Vault, a cloud secret store) and inject them at runtime, with different keys per environment (dev/prod). The habit you're building, "never in code, validated at startup", is the same.

---

## Checkpoint

- [ ] `npm run hello:mcp` works
- [ ] `npm run check` prints a `200` status and a JSON body containing a `content` array
- [ ] Removing a required env var makes `config.ts` print a clear error and exit
- [ ] `.env` does **not** show up in `git status`
- [ ] Your break-it table is filled in

---

## Stretch

- Make `check.ts` print how long the request took (`Date.now()` before and after).
- Print `res.headers.get("content-type")`. What else does Bifrost add to the response headers?

---

## 🧪 Exam side quest (optional)

**Try the exam's own sample questions now.** Open `reference/Certified_Developer.md`, section 8. Answer the three sample questions *without* looking at the answer key. Write your answers and your reasoning in `notes/00.md`. You'll re-answer them after step 08 and compare. The difference is a good measure of what you learned.

---

## Exam check

Answer these in `notes/00.md`.

1. *(D7)* Why should a missing API key crash the program at startup rather than fail on the first request?
2. *(D5)* `fetch` resolved successfully but `res.status` is `401`. Did the network call fail? What does `res.ok` return?
3. *(D7)* Why put the key in `.env` and not in `config.ts`? Name two ways a hard-coded key leaks.
4. *(D2)* Why pin dependency versions in `package.json` instead of using `latest`? How is that like pinning a model version?

Then run `/exam-quiz 00` in Claude Code for more.

---

## Write-up (`notes/00.md`)

Copy `notes/TEMPLATE.md` to `notes/00.md` and fill it in. Make sure to include:

- What surprised you?
- One error you hit and how you fixed it.
- Your break-it table.
- Your answers to the three sample questions (side quest), if you did it.
