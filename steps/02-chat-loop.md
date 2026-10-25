# Step 02 — Chat loop, streaming and retries

> **Time:** 8–10 hours · **Builds on:** Step 01 · **Unlocks:** Step 03

| Strand | In this step | How it connects |
|---|---|---|
| 🟦 JS/TS | arrays (`push`, `length`, `splice`), `while` loops, reading input with `readline`, events (`.on`), generics (`<T>`), higher-order functions | The conversation *is* an array you push to. A generic retry wrapper is how you make every Bifrost call survive a blip. Both patterns return in the agent loop in step 04. |
| 🟩 Homelab | `npm run chat`: a streaming terminal chat about your homelab, with commands and your own retry wrapper | A chat that goes through your gateway and redactor. Watching `/tokens` grow shows you why long chats get slow and expensive on your Bifrost bill. |
| 🟧 Exam | D2 Claude Application Design (8.6%) · D6 Context Engineering (3.8%) · D6 Prompt Engineering (4.6%) · D4 Debugging and Error Handling (2.6%) | "The API is stateless", "which errors to retry" and "how to stop context growing forever" are core exam ideas. Here you prove each one with your own numbers. |

---

## Why this matters

The Messages API is **stateless**: Claude remembers nothing between calls. "Memory" in a chat app is just your code re-sending the whole conversation every time. Understanding this explains most chat bugs ("it forgot what I said", "it's getting slow and expensive"), and it's core exam material. It also sets you up for step 04, where the same array holds tool calls and their results.

---

## 🟦 Warm-up drills (scratch.ts, 20–40 min)

Run `npm run scratch:watch`. Predict, then save.

**1. Arrays grow with `push`**

```ts
const history: string[] = [];
history.push("user: hi");
history.push("assistant: hello");
console.log(history.length, history);
```

Predict: the length, and the order of the items.

**2. Removing from the front**

```ts
const msgs = ["u1", "a1", "u2", "a2", "u3", "a3"];
msgs.splice(0, 2);          // remove 2 items starting at index 0
console.log(msgs);
```

Predict: what's left? (You'll use this to trim history in pairs.)

**3. A loop that stops on a condition**

```ts
let n = 0;
while (true) {
  n++;
  if (n === 3) break;
}
console.log(n);
```

Predict: the printed value. What happens if you delete the `break`?

**4. Functions as values (higher-order functions)**

```ts
function twice(fn: () => void) {
  fn();
  fn();
}
twice(() => console.log("ping"));
```

Predict: how many times does "ping" print? Notice that `twice` takes a *function* as its argument.

**5. Generics: "whatever goes in, the same type comes out"**

```ts
function first<T>(items: T[]): T {
  return items[0];
}
const a = first([1, 2, 3]);
const b = first(["hermes-a", "hermes-b"]);
```

Predict: hover over `a` and `b` in VS Code. What types does TypeScript show?

**6. Events and `setTimeout`**

```ts
setTimeout(() => console.log("later"), 500);
console.log("now");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
await sleep(1000);
console.log("after sleep");
```

Predict: the order of the three lines.

---

## Concepts

### 1. Conversation state is an array you own

```
Turn 1 send:  [ user:"My Bifrost VM is 10.0.0.5" ]
Turn 1 get:   assistant:"Got it."

Turn 2 send:  [ user:"My Bifrost VM is 10.0.0.5",
                assistant:"Got it.",                 ← you appended this
                user:"What IP did I give you?" ]     ← and this
Turn 2 get:   assistant:"10.0.0.5"
```

If you only send the latest message, Claude has no idea what came before. Every turn costs more input tokens than the last, because you send everything again.

Rules to know:
- The first message must be `user`.
- Turns normally alternate: `user`, `assistant`, `user`, … If you send two `user` messages in a row, the API merges them into one turn. That won't error, but Claude then never sees its own earlier replies.
- The assistant message you append is the **content** Claude returned (you can append `response.content` directly).

### 2. Streaming

Without streaming you wait for the whole answer, then print it. With streaming, text arrives in small pieces as it's generated.

```
non-streaming:  [............ wait 6s ............] "Here is the full answer."
streaming:      "Here" " is" " the" " full" " answer."   ← first words after ~0.5s
```

The SDK gives you a stream object that fires an event each time text arrives:

```ts
const stream = client.messages.stream({ /* same params as create */ });
stream.on("text", (chunk) => process.stdout.write(chunk));   // print as it arrives
const final = await stream.finalMessage();                    // the complete message at the end
```

Under the hood this is **server-sent events (SSE)**: one long HTTP response that the server keeps writing to.

### 3. Which errors to retry

```
                  ┌── 400 bad request ────── your bug. Don't retry. Fix it.
                  ├── 401/403 auth ───────── config. Don't retry.
 error ──► status ┼── 429 rate limited ───── retry, after waiting
                  ├── 500/502/503 ────────── retry, after waiting
                  └── 529 overloaded ─────── retry, after waiting longer
```

**Exponential backoff:** wait 1s, then 2s, then 4s, plus a little randomness ("jitter") so many clients don't all retry at the same instant.

**The SDK already retries for you.** By default the client retries twice (`maxRetries: 2`) on 408, 409, 429, 5xx and connection errors, with backoff. In this step you write your own retry once so you understand it. To see *your* wrapper doing the work, you'll create a client with `maxRetries: 0`.

---

## Read first (1 hour)

- javascript.info → *Arrays*, *Array methods* (`push`, `splice`, `map`, `filter`)
- javascript.info → *Error handling, "try...catch"*
- Claude docs (https://platform.claude.com/docs) → *Streaming messages*
- Claude docs → *Errors* (status codes and which are retryable)

---

## Build

### Step 1 — A basic loop with history

```ts
// src/chat.ts
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import type Anthropic from "@anthropic-ai/sdk";
import { client } from "./client.js";
import { config } from "./config.js";

const SYSTEM = `You are a homelab assistant for a Proxmox setup running
Bifrost (AI gateway), a PII redactor and Hermes agents on several VMs.
Be concise. If you don't know something about this specific homelab, say so.`;

async function main() {
  const rl = readline.createInterface({ input, output });

  // The whole conversation lives here.
  const history: Anthropic.MessageParam[] = [];

  while (true) {
    const userText = await rl.question("\nyou › ");
    if (userText.trim() === "/exit") break;

    // TODO 1: push the user's message onto history

    const response = await client.messages.create({
      model: config.CLAUDE_MODEL,
      max_tokens: 1024,
      system: SYSTEM,
      messages: history,
    });

    // TODO 2: print the text blocks (reuse your loop from 01)

    // TODO 3: push the assistant's reply onto history
    //   { role: "assistant", content: response.content }
  }

  rl.close();
}

main();
```

**Predict, then run:** two experiments, one at a time.

1. Comment out TODO 3 (don't save Claude's replies). Ask Claude to suggest three backup strategies. Then ask "Tell me more about the second one." What happens, and why? Claude still sees *your* messages, merged together, but none of its own.
2. Restore TODO 3. Now change `messages: history` to send only the latest message: `messages: [history[history.length - 1]]`. Tell it your Bifrost IP, then ask for it back.

Which experiment "forgets" more? Write down why.

### Step 2 — Commands

Add these, handled *before* calling Claude:

| Command | Does |
|---|---|
| `/exit` | quits |
| `/reset` | empties `history` |
| `/history` | prints how many messages are in history and their roles |
| `/tokens` | prints the `input_tokens` of the last response |

Use `/tokens` after each turn for five turns. Write down the numbers. What's the pattern?

### Step 3 — Stream the output

Replace `messages.create` with `messages.stream`:

```ts
process.stdout.write("claude › ");
const stream = client.messages.stream({
  model: config.CLAUDE_MODEL,
  max_tokens: 1024,
  system: SYSTEM,
  messages: history,
});

// TODO 4: on each "text" event, write the chunk to stdout (no newline)

const final = await stream.finalMessage();
// TODO 5: push final.content onto history as the assistant message
```

### Step 4 — Your own retry wrapper

Write `withRetry` in `src/retry.ts`. This is a **higher-order function**: a function that takes another function as an argument (warm-up drill 4), and it's **generic** (drill 5).

```ts
// src/retry.ts
import Anthropic from "@anthropic-ai/sdk";

const RETRYABLE = new Set([429, 500, 502, 503, 529]);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// <T> is a "generic": whatever type fn returns, withRetry returns the same type.
export async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 4): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const status = err instanceof Anthropic.APIError ? err.status : undefined;

      // TODO 6: if status is not retryable, or attempt >= maxAttempts, rethrow err

      // TODO 7: compute delay = 1000 * 2 ** (attempt - 1), plus random 0–250ms jitter
      // TODO 8: log `retrying in Xms (attempt N, status S)` to stderr, then await sleep(delay)
    }
  }
}
```

Use it (with the non-streaming version, for simplicity):

```ts
const response = await withRetry(() => client.messages.create({ /* ... */ }));
```

To test it without waiting for a real outage:
- Create a second client with `maxRetries: 0`, so the SDK's own retries don't hide yours.
- Temporarily make `fn` throw a fake error on the first two attempts.

**Predict:** with the SDK's default `maxRetries: 2` *and* your `maxAttempts = 4`, how many real HTTP requests could one failing call make in the worst case?

### Step 5 — Keep history from growing forever

Long chats get slow and expensive, and eventually exceed the context window. Add a simple limit: if `history` has more than 20 messages, drop the oldest **pair** (one user + one assistant).

**Predict:** why drop a pair rather than one message? (Hint: what would the first message be if you dropped just one? And in step 04, a `tool_use` in an assistant message *must* be followed by its `tool_result` in the next user message, so splitting a pair would break the request.)

When it works, run `/tutor-review src/chat.ts` in Claude Code.

### Common TypeScript errors in this step

| You see | What it means | Fix |
|---|---|---|
| `Argument of type '{ role: string; ... }' is not assignable to parameter of type 'MessageParam'` | TypeScript widened `"user"` to `string` | Push the object literal directly, or type the variable as `Anthropic.MessageParam` |
| `Cannot use namespace 'Anthropic' as a type` / import errors with `import type` | `import type` gives you types only, not runtime values | Use `import type Anthropic` for types; use a normal `import Anthropic` where you need `Anthropic.APIError` at runtime |
| `Function lacks ending return statement and return type does not include 'undefined'` | TypeScript can't see that your `for (;;)` loop always returns or throws | Make sure every path in `catch` either rethrows or continues the loop |
| `Object is possibly 'undefined'` on `history[history.length - 1]` | Indexing an array might give `undefined` | Check it first, or use `history.at(-1)` with a guard |

---

## Checkpoint

- [ ] Multi-turn chat remembers earlier turns
- [ ] Output streams word by word
- [ ] `/reset`, `/history`, `/tokens` work
- [ ] `withRetry` retries a 429/5xx and does **not** retry a 400/401 (tested with `maxRetries: 0`)
- [ ] History is trimmed in pairs

---

## Stretch

- Save `history` to `reports/chat-<timestamp>.json` on `/exit`, and add `/load <file>`.
- Instead of dropping old messages, ask Claude to **summarise** the oldest 10 into one message. Compare token counts. What's lost?
- Look up prompt caching in the docs. Which part of this chat would benefit most from being cached? (You'll measure it in step 07.)

---

## 🧪 Exam side quest (optional)

1. **Server-side compaction vs your trimming (D6 Context Engineering).** Read the Claude docs on *compaction*. It's a beta feature (header `compact-2026-01-12`) on models such as `claude-sonnet-5-5` and `claude-opus-5-5`, not on Haiku 4.5. The API summarises old context for you when the conversation gets long. Note the key rule: you must append the full `response.content` to history (not just the text), or the compaction state is lost. Write three lines comparing it with your pair-trimming: what each keeps, what each loses, and who controls it.
2. **SSE vs websockets (D5 Technical Fundamentals).** Run `curl -N` against Bifrost with `"stream": true` in the JSON body and watch the raw `event:` / `data:` lines arrive. That's SSE. Then read a short intro to websockets. Write down one difference in direction (who can send) and one reason the Messages API uses SSE.

---

## Exam check

1. *(D2)* A user says the chatbot "forgot" something from three messages ago. Give two possible causes in the code.
2. *(D5)* Why does each turn cost more input tokens than the last? Name two ways to limit it.
3. *(D6)* Your chat history keeps growing. Name two context-management techniques and what each loses.
4. *(D4)* Which status codes should be retried? Why add jitter to backoff?
5. *(D4)* The SDK already retries by default. Why might you still write your own wrapper, and what must you change on the client to test it?
6. *(D2)* When is streaming worth the extra code, and when isn't it?
7. *(D6)* Where does a system prompt sit relative to the conversation history, and why doesn't it need to be re-sent as a message each turn?

Then run `/exam-quiz 02` in Claude Code for more.

---

## Write-up (`notes/02.md`)

Copy `notes/TEMPLATE.md` to `notes/02.md`. Make sure to include:

- Your five `/tokens` numbers and the pattern you saw
- A diagram (ASCII is fine) of how `history` changes over three turns
- The results of the two "forgetting" experiments in Step 1
- What `withRetry<T>` does, in your own words, including what `<T>` means
