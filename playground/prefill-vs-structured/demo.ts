// Prefill vs structured outputs: same job, three requests.
//
//   Part A: prefill on claude-haiku-4-5    → works (Claude continues after "{")
//   Part B: prefill on claude-sonnet-5-5   → 400 (newer models reject prefill)
//   Part C: structured output on sonnet    → schema-enforced JSON, no gluing
//   Part D: strict tool use on sonnet      → schema-enforced tool arguments
//
// Run:  npm run demo:prefill
// Cost: five tiny requests (max_tokens 256), well under a cent.

import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

// Talks straight to api.anthropic.com. With no options, the SDK reads
// ANTHROPIC_API_KEY from the environment (loaded from .env by dotenv above).
const client = new Anthropic();

const LOG_LINE = "hermes-b: qmp socket timeout, VM unresponsive";

// You can only choose prefill or JSON outputs. but not both. 

// ── Part A: prefill (works on claude-haiku-4-5) ─────────────────────────────
async function prefill(model: string) {
  const res = await client.messages.create({
    model,
    max_tokens: 256,
    messages: [
      {
        role: "user",
        content:
          'Classify this Proxmox log line. Reply as JSON {"vm": string, "status": "up"|"down"|"degraded"}.\n' +
          `<log>${LOG_LINE}</log>`,
      },
      // The prefill: we write the start of Claude's answer, Claude continues from here.
      { role: "assistant", content: "{" },
    ],
  });

  console.log("stop_reason:", res.stop_reason);
  
  // Guard: only parse if Claude actually finished. 
  if (res.stop_reason !== "end_turn") {
    console.log("Claude didn't finish, skipping the parse");
    return;
  }
  
  const block = res.content[0];
  if (block?.type === "text") {
    console.log("raw text   :", JSON.stringify(block.text)); // note: no leading "{"
    //\n  \"vm\": \"hermes-b\",\n  \"status\": \"down\"\n}
    // The guard above handles "Claude stopped early". This try/catch handles
    // "Claude finished, but the text still isn't JSON". See simulate.ts for both.
    try {
      const result = JSON.parse("{" + block.text); // put the "{" back yourself
      console.log("parsed     :", result);
    } catch (err) {
      console.log("not valid JSON:", block.text);
    }
  }
}

// ── Part C: structured outputs (the modern way) ─────────────────────────────
async function structured(model: string) {
  const res = await client.messages.create({
    model,
    max_tokens: 256,
    // JSON Outputs constrain the final response. you set output_config.format 
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            vm: { type: "string" },
            status: { type: "string", enum: ["up", "down", "degraded"] },
          },
          required: ["vm", "status"],
          additionalProperties: false,
        },
      },
    },
    messages: [
      { role: "user", content: `Classify this Proxmox log line:\n<log>${LOG_LINE}</log>` },
    ],
  });

  console.log("stop_reason:", res.stop_reason);

  const block = res.content.find((b) => b.type === "text");
  if (block?.type === "text") {
    console.log("raw text   :", block.text); // already a complete JSON object
    console.log("parsed     :", JSON.parse(block.text));
  }
}

// ── Part D: strict tool use (constrains tool arguments, not the response) ───
// A vaguer log line than LOG_LINE: none of up/down/degraded is an obvious fit,
// which tempts Claude to invent a status like "unknown" when nothing stops it.
const VAGUE_LOG_LINE = "hermes-b: status unknown, last heartbeat 3h ago";

type VmStatus = { vm: string; status: string };

const ACTIONS: Record<string, string> = {
  up: "no action",
  down: "page on-call",
  degraded: "open a ticket",
};

// Stands in for the real function in an agentic loop. It only prints: a status
// it doesn't know is the "malformed argument" that would break a real handler.
function reportVmStatus(input: VmStatus) {
  const action = ACTIONS[input.status];
  if (action === undefined) {
    console.log(`handler    : ❌ no action for status "${input.status}"`);
  } else {
    console.log(`handler    : ${input.vm} is ${input.status} → ${action}`);
  }
}

async function strictTool(model: string, strict: boolean) {
  const res = await client.messages.create({
    model,
    max_tokens: 256,
    // Forcing the tool with tool_choice returns a 400 on this model, so we leave
    // tool_choice on its default ("auto") and ask for the tool in the prompt.
    tools: [
      {
        name: "report_vm_status",
        description: "Record the status of a VM from a Proxmox log line.",
        strict, // top level of the tool, next to name and input_schema
        input_schema: {
          type: "object",
          properties: {
            vm: { type: "string" },
            status: { type: "string", enum: ["up", "down", "degraded"] },
          },
          required: ["vm", "status"],
          additionalProperties: false, // strict: true requires this
        },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Call report_vm_status for this Proxmox log line:\n<log>${VAGUE_LOG_LINE}</log>`,
      },
    ],
  });

  console.log("stop_reason:", res.stop_reason);

  // strict constrains the arguments IF Claude calls the tool. With "auto" it can
  // still answer in plain text, so a missing tool_use block is a real case.
  const block = res.content.find((b) => b.type === "tool_use");
  if (block?.type !== "tool_use") {
    console.log("no tool call this time");
    return;
  }

  console.log("tool input :", block.input); // already an object, no JSON.parse
  // block.input is typed `unknown`, and `as` is a promise we make to the compiler,
  // not a runtime check. strict: true is what makes this promise safe to keep.
  reportVmStatus(block.input as VmStatus);
}

async function main() {
  console.log("\n=== A. prefill on claude-haiku-4-5 ===");
  await prefill("claude-haiku-4-5");

  console.log("\n=== B. prefill on claude-sonnet-5-5 ===");
  // Before running: which error class do you predict? (step 01)
  try {
    await prefill("claude-sonnet-5-5");
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.log(`${err.constructor.name} (status ${err.status}):`, err.message);
    } else {
      throw err;
    }
  }

  console.log("\n=== C. structured output on claude-sonnet-5-5 ===");
  await structured("claude-sonnet-5-5");

  console.log("\n=== D1. tool use WITHOUT strict on claude-sonnet-5-5 ===");
  await strictTool("claude-sonnet-5-5", false);

  console.log("\n=== D2. tool use WITH strict on claude-sonnet-5-5 ===");
  await strictTool("claude-sonnet-5-5", true);
}

main();
