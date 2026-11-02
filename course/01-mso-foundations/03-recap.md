# Recap
1. Tokens are unit of input, output and cost
2. Context window is a fixed token budget that holds whole request at once.
    - An oversized input errors before generation, while hitting the ceiling mid-generation returns truncated output with a model_context_window_exceeded stop reason, so managing history is the application's job
3. Sampling makes generation non-deterministic
    - The same prompt can return different wording on each run, so testing on exact text is unreliable. This is what evals are built for.
4. Model choice and reasoning mode are separate, composable levers.
5. A developer reaches Claude over a REST API, usually through an SDK.
    - Choose between synchronous, streaming, async/await, or batch based on whether a user is waiting and whether the workload is real-time or bulk offline.