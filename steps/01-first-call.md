# Step 01 — Your first Claude call through Bifrost

> **Time:** 6–8 hours · **Builds on:** Step 00 · **Unlocks:** Step 02

| Strand | In this step | How it connects |
|---|---|---|
| 🟦 JS/TS | values, objects, arrays, functions, Promises, `async`/`await`, `try`/`catch`, type narrowing | `await` is how you wait for Bifrost's reply; narrowing is how you safely read Claude's `content` array. You'll use both in every step from here on. |
| 🟩 Homelab | `src/client.ts` (the SDK pointed at Bifrost) and `npm run ask "..."` | The first real model call through *your* gateway and redactor. You'll find it in Bifrost's logs, which proves the whole path works end to end. |
| 🟧 Exam | D2 Claude API Mechanics (6.8%) · D5 LLM Fundamentals (5.2%) · D5 Cost and Token Management (2.8%) · D4 Debugging and Error Handling (2.6%) | Every field you print (`content`, `stop_reason`, `usage`) is exam material. Your break-it table becomes your answer to "a request failed: where do you look first?" |

---

## Why this matters

API mechanics is the heaviest single area of the exam, and it's what you'll debug most when something in your homelab stops answering. By the end of this step you should be able to look at any Messages API request or response and explain every field, and know which field to check first when something goes wrong.

---

## 🟦 Warm-up drills (scratch.ts, 20–40 min)

Run `npm run scratch:watch` and work through these in `scratch.ts`. Predict first, then save.

**1. `const`, `let` and types**

```ts
const name = "Bifrost";          // string  — `const` can't be reassigned
let count = 3;                   // number  — `let` can
const up = true;                 // boolean
count = count + 1;
// name = "Other";               // try uncommenting this
console.log(name, count, up);
```

Predict: what does your editor say when you uncomment the `name = ...` line?

**2. Objects and arrays**

```ts
const service = { name: "Bifrost", port: 8080, healthy: true };
const vms = ["hermes-a", "hermes-b", "hermes-c"];
console.log(service.port, vms.length, vms[0], vms[5]);
```

Predict: what does `vms[5]` print? Does it crash?

**3. Functions, two ways**

```ts
function greet(who: string): string {
  return `Hello ${who}`;
}
const greet2 = (who: string) => `Hello ${who}`;   // arrow function, same thing
console.log(greet("hermes-a"), greet2("hermes-b"));
// greet(42);                    // try uncommenting
```

Predict: what does TypeScript say about `greet(42)`?

**4. Promises and `await`: the most important idea in this course**

A network call doesn't return the answer immediately. It returns a **Promise**: a box that will contain the answer later.

```
 call fetch()  ──►  you get a Promise (empty box)  ──►  ...time passes...  ──►  box fills with Response
                                                                         or ──► box fills with an error
```

`await` means "pause this function until the box is filled, then give me what's inside". You can only use `await` inside an `async` function (or at the top level of a module).

```ts
async function demo() {
  console.log("1. before");
  const res = await fetch("https://example.com");   // pauses here
  console.log("2. after, status", res.status);
}
demo();
console.log("3. demo() was called");
```

Predict: in what order do lines 1, 2, 3 print? Write your answer, then run it. If the order surprises you, that's the lesson: `demo()` starts, hits `await`, and hands control back.

**5. `try`/`catch`**

```ts
try {
  JSON.parse("{not json");
} catch (err) {
  console.log("caught:", (err as Error).message);
}
console.log("still running");
```

Predict: does "still running" print?

**6. Type narrowing**

```ts
type Block = { type: "text"; text: string } | { type: "image"; url: string };
const blocks: Block[] = [{ type: "text", text: "hi" }, { type: "image", url: "x.png" }];
for (const b of blocks) {
  // console.log(b.text);        // try this first
  if (b.type === "text") console.log(b.text);
}
```

Predict: why does TypeScript reject `b.text` outside the `if`? You'll meet exactly this with Claude's responses.

---

## Concepts

### What a Messages API call looks like

```
REQUEST                                          RESPONSE
───────                                          ────────
{                                                {
  model: "claude-haiku-4-5",                       id: "msg_...",
  max_tokens: 500,          ← hard cap on output    type: "message",
  system: "You are...",     ← instructions          role: "assistant",
  messages: [                                       model: "...",
    { role: "user",                                 content: [             ← ARRAY of blocks
      content: "Hi" }                                 { type: "text", text: "Hello!" }
  ]                                                 ],
}                                                   stop_reason: "end_turn", ← why it stopped
                                                    usage: {
                                                      input_tokens: 12,      ← you pay for these
                                                      output_tokens: 5       ← and these
                                                    }
                                                 }
```

Three things trip everyone up:

1. **`content` is an array**, not a string. Text lives in blocks whose `type` is `"text"`. Block 0 isn't guaranteed to be text.
2. **`max_tokens` is required.** If Claude hits it, `stop_reason` is `"max_tokens"` and the answer is cut off mid-sentence.
3. **`system` is a top-level field**, not a message with `role: "system"`.

### `stop_reason`: why Claude stopped

| Value | Meaning | What your code should do |
|---|---|---|
| `end_turn` | Finished naturally | Use the answer |
| `max_tokens` | Hit your cap, answer cut off | Raise `max_tokens` or ask for shorter output |
| `stop_sequence` | Hit a custom stop string you set | Use the answer up to that point |
| `tool_use` | Wants to call a tool | Run it (step 04) |
| `pause_turn` | Paused a long server-side task | Send the conversation back to resume |
| `refusal` | Declined for safety reasons | Don't read `content` as an answer; show or log the refusal |

Always check `stop_reason` *before* you trust `content`.

### Tokens and models

You pay per token, input and output separately. Output usually costs about five times more per token than input. Current models you can reach through Bifrost (check the Claude docs for live prices):

| Model ID | Roughly | Use while learning for… |
|---|---|---|
| `claude-haiku-4-5` | $1 in / $5 out per million tokens | Almost everything in this course (your default) |
| `claude-sonnet-5-5` | $2 / $10 | Comparisons, harder tasks |
| `claude-opus-5-5` | $4 / $20 | Hard reasoning, agents |
| `claude-fable-5-1` | the most capable model, priced above Opus | Curiosity only |

---

## Read first (1 hour)

- javascript.info → *Promises, async/await*: "Introduction: callbacks" through "Async/await"
- Claude docs (https://platform.claude.com/docs) → *Messages API* reference: skim the request and response fields
- Claude docs → *Errors*: the table of HTTP status codes

---

## Build

### Step 1 — `src/client.ts`: one client, pointed at Bifrost

```ts
// src/client.ts
import Anthropic from "@anthropic-ai/sdk";
import { config } from "./config.js";

export const client = new Anthropic({
  apiKey: config.BIFROST_API_KEY,
  baseURL: config.BIFROST_BASE_URL,   // ← the only line that sends traffic through Bifrost
});
```

That's it. The SDK doesn't know Bifrost exists. Compare this with your raw `fetch` in `check.ts`: the SDK builds the same URL, headers and JSON body for you. That's what "an SDK wraps a REST API" means.

### Step 2 — `src/ask.ts`: one question, one answer

Fill in the `TODO`s. Use the response diagram above.

```ts
// src/ask.ts
import { client } from "./client.js";
import { config } from "./config.js";

async function main() {
  // process.argv = ["node", "script path", ...your words]
  const question = process.argv.slice(2).join(" ");
  if (!question) {
    console.error('Usage: npm run ask "your question"');
    process.exit(1);
  }

  const response = await client.messages.create({
    model: config.CLAUDE_MODEL,
    max_tokens: 500,
    system: "You are a concise homelab assistant. Answer in under 100 words.",
    messages: [
      // TODO 1: one user message containing `question`
    ],
  });

  // TODO 2: check response.stop_reason first.
  //   If it's "refusal", print a short note and stop.
  //   If it's "max_tokens", print a warning that the answer was cut off (but still print it).

  // TODO 3: print the text of the answer.
  //   response.content is an array. Loop over it and print `.text`
  //   for every block whose `.type === "text"`.

  // TODO 4: print a footer line like:
  //   [model: claude-haiku-4-5 | stop: end_turn | in: 31 tok | out: 58 tok]
}

main();
```

Hint for TODO 3: TypeScript will complain if you write `response.content[0].text`. Why? Because block 0 *might* not be a text block. Narrow it first, exactly like warm-up drill 6:

```ts
for (const block of response.content) {
  if (block.type === "text") {
    // inside here, TypeScript knows `block` has `.text`
  }
}
```

**Predict, then run:**

```bash
npm run ask "What is Proxmox in one sentence?"
```

Before running, guess roughly how many input tokens the request uses. Then compare.

### Step 3 — Handle errors properly

Wrap the call so each kind of failure gives a useful message.

```ts
import Anthropic from "@anthropic-ai/sdk";

try {
  // ... messages.create ...
} catch (err) {
  if (err instanceof Anthropic.APIError) {
    // TODO 5: print err.status and err.message
    // TODO 6: add a hint based on status:
    //   401 → "check BIFROST_API_KEY"
    //   404 → "check BIFROST_BASE_URL ends with /anthropic"
    //   429 → "rate limited — wait and retry"
    //   500+ → "upstream or gateway error — check Bifrost logs"
  } else {
    // network error, bug in your code, etc.
    throw err;
  }
}
```

The SDK also has more specific classes (`Anthropic.AuthenticationError`, `Anthropic.RateLimitError`, `Anthropic.BadRequestError`), all subclasses of `Anthropic.APIError`. Checking `.status` is fine for now.

### Step 4 — Break it

One at a time, restoring after each. Write down what each produces:

| Change | Status | Message |
|---|---|---|
| Wrong API key | | |
| Remove `/anthropic` from URL | | |
| Model name `"not-a-model"` | | |
| `max_tokens: 5` (not an error — what happens?) | | |

### Step 5 — See it in Bifrost

Open the Bifrost UI and find your requests in its logs. Match one log entry to one run of `npm run ask`. What does Bifrost record that your code doesn't print? Does the logged request show the original text or the redacted text?

When it works, run `/tutor-review src/ask.ts` in Claude Code.

### Common TypeScript errors in this step

| You see | What it means | Fix |
|---|---|---|
| `Property 'text' does not exist on type 'ContentBlock'` | `content` holds several kinds of block; not all have `.text` | Narrow with `if (block.type === "text")` |
| `'await' expressions are only allowed within async functions…` | You used `await` in a normal function | Mark the function `async` |
| `Type 'string' is not assignable to type '"user" \| "assistant"'` | `role` must be one of two exact strings | Write `role: "user"` directly in the object, not via a `string` variable |
| `'err' is of type 'unknown'` | In `catch`, TypeScript doesn't know what was thrown | Narrow with `err instanceof Anthropic.APIError` (or `instanceof Error`) |
| `Unhandled promise rejection` (at runtime) | An `await` threw and nothing caught it | Wrap in `try`/`catch`, or let `main()` crash on purpose with a clear message |

---

## Checkpoint

- [ ] `npm run ask "..."` prints an answer and the footer line
- [ ] `refusal` and `max_tokens` are handled before you print `content`
- [ ] Each broken config in Step 4 gives a clear, specific message
- [ ] You can explain, out loud, what `content`, `stop_reason` and `usage` are
- [ ] You found your request in Bifrost's logs

---

## Stretch

- Add a `--model` flag that overrides `CLAUDE_MODEL` for one call.
- Print how long the call took (`const t0 = Date.now()` … `Date.now() - t0`).

---

## 🧪 Exam side quest (optional)

These cover D2 Claude API Mechanics and D5 objectives the main build doesn't reach.

1. **Vision.** Take a screenshot of your Bifrost or Proxmox dashboard and ask Claude what it shows. Read it as base64 with `readFileSync("shot.png").toString("base64")` (from `node:fs`), then send an image block *before* your text block:

   ```ts
   content: [
     { type: "image", source: { type: "base64", media_type: "image/png", data } },
     { type: "text", text: "Which VMs look unhealthy in this screenshot?" },
   ]
   ```

   Check `usage.input_tokens`. How many tokens did one image cost compared with a sentence of text?

2. **Count tokens before sending.** Use `client.messages.countTokens({ model, system, messages })` to get `input_tokens` without making a real call. Compare its number with the real footer. When would you want to know this *before* sending?

3. **Same question, two models.** Run the same question with `claude-haiku-4-5` and `claude-sonnet-5-5`. Compare tokens, time and the answer itself. Did the more expensive model give a noticeably better answer for this simple question? (You'll do this properly in step 07.)

---

## Exam check

1. *(D2)* A response has `stop_reason: "max_tokens"`. What happened, and what are two ways to fix it?
2. *(D2)* Why is `content` an array rather than a string? Name two block types other than `text`.
3. *(D6)* Where does the system prompt go in a Messages API request?
4. *(D4)* Your app gets a `429`. What should it do, and what should it *not* do?
5. *(D5)* What's the difference between `input_tokens` and `output_tokens` for cost? Which is usually more expensive per token?
6. *(D4)* The app routes through a gateway. A request fails. List, in order, the places you would check.
7. *(D2)* A response comes back with `stop_reason: "refusal"`. Why must your code check this before reading `content`?
8. *(D2)* You call Claude through Bifrost by changing `baseURL`. How is that different from calling Claude on Amazon Bedrock or Google Vertex AI, which use their own dedicated client classes (`@anthropic-ai/bedrock-sdk`, `@anthropic-ai/vertex-sdk`)? What stays the same?

Then run `/exam-quiz 01` in Claude Code for more.

---

## Write-up (`notes/01.md`)

Copy `notes/TEMPLATE.md` to `notes/01.md`. Make sure to include:

- Your filled-in break-it table
- In your own words: what does `await` do?
- What Bifrost logged that your code didn't print
- One thing you'd now check first when "Claude isn't responding"
