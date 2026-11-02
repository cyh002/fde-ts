// Synchronous: send the request, wait for the WHOLE response, then act on it.
//
// Good for: short replies, backend jobs where no one is watching.
//
// Run:  npm run demo:sync
// Cost: one small request.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from .env

async function main() {
  const start = Date.now();

  // `await` pauses here until the full message has arrived. Nothing prints until then.
  const res = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      { role: "user", content: "In 5 bullet points, how should I monitor 3 VMs on a Proxmox homelab?" },
    ],
  });

  const ms = Date.now() - start;

  for (const block of res.content) {
    if (block.type === "text") console.log(block.text);
  }

  console.log("\n--- metadata ---");
  console.log("stop_reason  :", res.stop_reason);
  console.log("input tokens :", res.usage.input_tokens);
  console.log("output tokens:", res.usage.output_tokens);
  console.log("total time   :", ms, "ms  (and you saw nothing until the end)");

  // 🤔 Change max_tokens to 50 and re-run. What's the stop_reason now,
  //    and what would your code need to do about it?
}

main();
