import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// 1. Create the server
const server = new McpServer({ name: "hello-mcp", version: "1.0.0" });

// 2. Register one tool. The Zod schema does double duty:
//    - it's turned into the JSON schema the LLM sees
//    - it validates whatever the LLM actually sends
server.registerTool(
  "greet",
  {
    description: "Greet someone by name, optionally in a given language",
    inputSchema: {
      name: z.string().min(1).describe("Person's name"),
      language: z.enum(["en", "ms", "zh"]).default("en").describe("Greeting language"),
    },
  },
  async ({ name, language }) => {
    // `name` and `language` are fully typed here — try hovering in VS Code
    const hello = { en: "Hello", ms: "Selamat pagi", zh: "你好" }[language];
    return { content: [{ type: "text", text: `${hello}, ${name}!` }] };
  }
);

// 3. Talk to the client over stdin/stdout
await server.connect(new StdioServerTransport());
