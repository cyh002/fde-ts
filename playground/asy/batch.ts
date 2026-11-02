// Message Batches API: submit many requests at once → get an ID → poll → read results.
//
// Good for: offline bulk jobs where no one is waiting. Cheaper per token, but slow
// (most batches finish within an hour, max 24 h).
//
// Run:     npm run demo:batch                 (creates a new batch, then polls)
// Resume:  npm run demo:batch -- msgbatch_... (polls an existing batch, no new cost)
// Cost:    three tiny requests, at batch pricing.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

const POLL_EVERY_MS = 30_000;

// One request per log line. custom_id is how you match results back up later.
const LOG_LINES: Record<string, string> = {
  "hermes-a": "hermes-a: heartbeat ok, load 0.4",
  "hermes-b": "hermes-b: qmp socket timeout, VM unresponsive",
  "hermes-c": "hermes-c: disk 94% full, writes slowing",
};

async function createBatch(): Promise<string> {
  const batch = await client.messages.batches.create({
    requests: Object.entries(LOG_LINES).map(([vm, line]) => ({
      custom_id: vm,
      params: {
        model: "claude-haiku-4-5",
        max_tokens: 50,
        messages: [
          { role: "user", content: `Reply with one word: up, down or degraded.\n<log>${line}</log>` },
        ],
      },
    })),
  });

  console.log("Created batch:", batch.id);
  console.log("Status       :", batch.processing_status);
  console.log(`(Ctrl+C is fine. Resume later with: npm run demo:batch -- ${batch.id})\n`);
  return batch.id;
}

async function waitUntilEnded(id: string) {
  while (true) {
    const batch = await client.messages.batches.retrieve(id);
    const c = batch.request_counts;
    console.log(
      `[${new Date().toLocaleTimeString()}] ${batch.processing_status}`,
      `processing=${c.processing} succeeded=${c.succeeded} errored=${c.errored}`,
    );
    if (batch.processing_status === "ended") return;
    await new Promise((resolve) => setTimeout(resolve, POLL_EVERY_MS));
  }
}

async function printResults(id: string) {
  console.log("\n--- results ---");
  // Results can come back in ANY order, so always key them by custom_id, never by position.
  for await (const item of await client.messages.batches.results(id)) {
    const r = item.result;
    if (r.type === "succeeded") {
      const block = r.message.content[0];
      const text = block?.type === "text" ? block.text.trim() : "(no text)";
      console.log(`${item.custom_id.padEnd(9)} → ${text}`);
    } else {
      console.log(`${item.custom_id.padEnd(9)} → ${r.type}`); // errored | canceled | expired
    }
  }
}

async function main() {
  const existingId = process.argv[2]; // the argument after `--`, if any
  const id = existingId ?? (await createBatch());
  await waitUntilEnded(id);
  await printResults(id);

  // 🤔 There's no `await` that "waits for the batch". Why does the API make you poll
  //    instead of keeping the connection open like sync.ts does?
  // 🤔 Your PII harness (step 03) runs 50 test cases overnight. Batch or Promise.all? Why?
}

main();
