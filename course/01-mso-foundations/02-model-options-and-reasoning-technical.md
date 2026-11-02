# Model options, reasoning modes and the technical substrate

## Model options and reasoning modes
- Model families: **Fable, Opus, Sonnet, Haiku**.
- Current models reason with **adaptive thinking**:
  - the **model decides** when to think and how much
  - tune the depth with the **effort** setting

## SDKs and REST
- Claude is reached over an **HTTP REST API**: request to an endpoint, with an **API key** and a **JSON body**, and a JSON response back.
- Official SDKs (**Python, TypeScript**) handle **auth, request construction, retries, response parsing**.

## Synchronous vs streaming
- **Synchronous:** send the request, wait for the **complete** response. Fine for short replies and backend jobs where no one is waiting.
- **Streaming:** the response arrives **in pieces as it's generated**. Use it when the reply is long or a user is watching.
  - Sent as **server-sent events (SSE)** over the same HTTP connection.
  - **Your code reassembles** the pieces into the final message.
  - Consuming a stream safely and recovering from interruptions → Module 2.

## High-volume work: two different patterns
| | Async client | Message Batches API |
|---|---|---|
| Solves | **concurrency** without blocking your app | **bulk offline** work, cheaper |
| Latency | **real time** | **up to 24 h** |
| Cost | normal | **lower per-token** |
| How | Python: `AsyncAnthropic`. **TS: the normal client is already Promise-based, so just `await`. There's no separate async class.** | submit many requests in one call → get an **ID** → **poll** for completion |
| Use for | many live calls at once | offline pipelines, eval runs, bulk jobs |

## Exam traps
- "In TypeScript, use the async client class" → ✗ The TS `Anthropic` client is already Promise-based. There is no `AsyncAnthropic` client in TS.
- "The async client makes calls cheaper / runs them offline" → ✗ It's still real time at normal price. **Batches** is the cheap, slow one.
- "Use the Batches API for a user-facing feature" → ✗ It can take up to 24 h.
- "Streaming makes the full answer arrive sooner" → ✗ It makes the **first output** appear sooner. Your code still has to reassemble the whole message.
