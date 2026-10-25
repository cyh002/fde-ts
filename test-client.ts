import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const client = new Client({ name: "test-client", version: "1.0.0" });
await client.connect(new StdioClientTransport({ command: "npx", args: ["tsx", "server.ts"] }));

// What the LLM would see
const { tools } = await client.listTools();
console.log("TOOLS:", JSON.stringify(tools, null, 2));

// A good call
const ok = await client.callTool({ name: "greet", arguments: { name: "Christopher", language: "ms" } });
console.log("GOOD CALL:", JSON.stringify(ok.content));

// A bad call (language not in the enum) — Zod should reject it
const bad = await client.callTool({ name: "greet", arguments: { name: "Christopher", language: "fr" } });
console.log("BAD CALL:", JSON.stringify(bad));

await client.close();
