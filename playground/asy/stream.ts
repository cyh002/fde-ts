// Streaming: the response arrives in pieces (server-sent events) as it's generated.
//
// Good for: long replies, or when a user is watching the screen.
//
// Run:  npm run demo:stream
// Cost: one small request (same prompt as sync.ts, so you can compare timings).

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

async function main() {
  const start = Date.now();
  let firstTokenMs: number | null = null;

  // .stream() returns immediately. Events arrive as Claude generates them.
  const stream = client.messages.stream({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "In 5 bullet points, how should I monitor 3 VMs on a Proxmox homelab?" },
    ],
  });

  // `for await` = loop over things that arrive over time.
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      if (firstTokenMs === null) firstTokenMs = Date.now() - start;
      process.stdout.write(event.delta.text); // print each piece as it arrives
    }
  }

  // The SDK reassembles the pieces into one normal Message for you.
  const final = await stream.finalMessage();

  console.log("\n\n--- metadata ---");
  console.log("stop_reason     :", final.stop_reason);
  console.log("output tokens   :", final.usage.output_tokens);
  console.log("first text after:", firstTokenMs, "ms  ← what the user feels");
  console.log("total time      :", Date.now() - start, "ms  ← about the same as sync");

  // 🤔 Compare with `npm run demo:sync`. Did streaming make the TOTAL time shorter?
  //    (Check the exam trap in your notes before answering.)
  // 🤔 Uncomment the line below to see every raw event type the server sends.
  // for await (const event of client.messages.stream({ model: "claude-haiku-4-5", max_tokens: 50, messages: [{ role: "user", content: "hi" }] })) console.log(event.type);
}

main();
