// Why async/await, Promises, fetch and JSON matter for agent code,
// shown with REAL calls to Claude using the key in your .env.
// Run it from the repo root (so .env is found):
//   npx tsx "questions/why async_await_promises_fetch/play.ts"
//
// The big idea: an agent is a loop of
//   build JSON -> send it over HTTP (fetch) -> WAIT (Promise) -> read JSON -> decide
// Every step in that loop is one of the topics below. The Anthropic SDK you use
// later does exactly this for you, so knowing it helps you debug the SDK.

import "dotenv/config"; // copies the values in .env into process.env

const BASE_URL = process.env.ANTHROPIC_BASE_URL ?? "https://api.anthropic.com";
const API_KEY = process.env.ANTHROPIC_API_KEY ?? "";
if (!API_KEY) throw new Error("ANTHROPIC_API_KEY is missing from .env");

// The part of Claude's reply we care about. TS trusts this; it does NOT check it
// at runtime. (That gap is what zod fills: see ../why_use_zod.md.)
type ClaudeReply = { content: { type: string; text?: string }[] };

// One model call = one HTTP POST with a JSON body. That's all an LLM API is.
async function ask(question: string, model = "claude-haiku-5-5"): Promise<string> {
  const res = await fetch(`${BASE_URL}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": API_KEY, // who you are (and who gets billed)
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    // JSON out: JS object -> text
    body: JSON.stringify({
      model,
      max_tokens: 60,
      messages: [{ role: "user", content: question }],
    }),
  });

  // fetch does NOT throw on 401/404/429/500. If you skip this check, you'll
  // try to read an error body as if it were an answer.
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${(await res.text()).slice(0, 150)}`);

  // JSON in: text -> JS object
  const data = (await res.json()) as ClaudeReply;
  return data.content[0]?.text ?? "(no text)";
}

// ---------------------------------------------------------------------------
// 1. Promises: the answer isn't there yet
// ---------------------------------------------------------------------------
console.log("--- 1. Promise ---");
const pending = ask("Say hello in exactly 3 words.");
console.log("without await:", pending); // Promise { <pending> }  <- not the answer!
console.log("with await:   ", await pending); // the actual text

// ---------------------------------------------------------------------------
// 2. Sequential vs parallel: agents spend most of their time waiting
// ---------------------------------------------------------------------------
console.log("\n--- 2. Sequential vs Promise.all ---");
const questions = ["Name a planet.", "Name a colour.", "Name a fruit."];

let t = Date.now();
for (const q of questions) await ask(q); // each waits for the one before
console.log(`sequential: ${Date.now() - t}ms`);

t = Date.now();
const answers = await Promise.all(questions.map((q) => ask(q))); // all start at once
console.log(`parallel:   ${Date.now() - t}ms ->`, answers);
// This is what an agent does when Claude asks for several tool calls in one turn.

// ---------------------------------------------------------------------------
// 3. Errors: a failed request only reaches your catch if you await it
// ---------------------------------------------------------------------------
console.log("\n--- 3. Errors ---");
try {
  await ask("hi", "not-a-real-model");
} catch (err) {
  // `err` is `unknown` in TS: narrow it before using .message
  if (err instanceof Error) console.log("caught:", err.message);
}

// Try it yourself:
//  - In section 3, remove the `await`. Does the catch still run? What happens?
//  - Comment out the `if (!res.ok)` line and rerun section 3. What does ask() return?
//  - Add a 4th question. Which timing in section 2 grows, and which barely moves?
