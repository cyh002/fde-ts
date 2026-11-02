# 01 MSO Foundations

## How LLMs behave: tokens, context, sampling, non-determinism

### Tokens
- Tokens are the unit of **input, output, cost and context budget**. Think in tokens, not words.
- Everything counts: system prompt, history, tool definitions, tool results, output.
- Chars-per-token **varies by model/tokenizer**. Don't hardcode a ratio; check at build time.

### Context window
- A **fixed per-request budget** that holds everything at once, **output included**.
- Input already too big → **rejected with a validation error** before generation.
- Input fits but generation hits the ceiling → **not an error**: returns partial output with `stop_reason: model_context_window_exceeded`.
- Long sessions need the **app** to trim or summarize history before each call.
- Rarely fills in dev (short inputs), fills fast in prod (long inputs, many turns). → Module 2.

### Sampling
- The model produces a probability distribution over the next token and **samples** from it.
- Low temperature = more repeatable; high = more varied.
- **Newest Claude models reject non-default `temperature` / `top_p` / `top_k` → 400.** Steer with prompting instead.
- `temperature: 0` ≠ identical outputs.

### Non-determinism
- Same input ≠ same output.
- Tests: **don't assert exact text**. Assert properties: field present, value in range, structure parses.
- To judge meaning → **eval with a model-graded judge**. → Module 3.

### Exam traps
1. "Set temperature 0 for deterministic output" ✗
The model picks each next token by sampling from a set of probabilities. Temperature 0 makes it lean hard toward the most likely token, so answers get more repeatable, but the course says it doesn't guarantee identical output. There's a second catch too: the newest Claude models don't accept temperature at all. Sending it returns a 400.

How it shows up: "Your team needs consistent outputs for a test suite. What do you do?" The answer is "set temperature 0" is wrong. The right answer is to test properties of the output (see trap 4), or to steer the model with the prompt.

2. "Overflow during generation throws an error" ✗
There are two different edge cases, and the trap mixes them up:

The input is already too big: the request is rejected before anything is generated. That one is an error.
The input fits, but the reply runs out of room: no error. You get the text generated so far, with stop_reason: "model_context_window_exceeded".
So a try/catch alone won't catch the second case. Your code has to check stop_reason on every reply. (Step 01 already prints stop_reason, and this is why.)

3. "Estimate cost from word count / a fixed chars-per-token" ✗
You're billed in tokens, not words. How many characters make up a token depends on the model, and it changes between model generations. So "about 4 characters per token" is a rough guess, not something to build on. Also, the cost isn't just your prompt. It's everything the model processes: system prompt, history, tool definitions, tool results, and the output.

How it shows up: "Why is the agent's bill 10× the estimate?" The answer is that the estimate only counted the user's message and left out the history and tool results, which grow with every turn.

4. "Unit test with an exact string match" ✗
Because the model samples, the same input can produce different wording that is still correct. An exact-match test will pass sometimes and fail other times. Test what must always hold instead:

Structure: it parses, and the required field is there (this is your Zod schema's job from step 03)
Range: a value falls within bounds
Meaning: use an eval with a model as the judge (→ Module 3)