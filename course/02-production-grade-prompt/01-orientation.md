# System prompts, XML, few-shot and output constraints

## The core rule
- When a prompt fails, **don't add more words**. **Diagnose the failure → add the one missing technique → re-run.** Still failing? Diagnose again.
- The fix is **structural, not phrasing**. "Please format this correctly" won't fix format drift.
- A prompt that **gets longer every pass** is the sign you're skipping the diagnosis.

## Diagnose: symptom → missing technique
| You see | Missing | Why it fixes it |
|---|---|---|
| **Wrong shape**: a sentence instead of a label, prose instead of JSON | **Output constraint** | Controls the form, separately from the content |
| **Content off**: scope drifts or tone shifts, **worse deeper into the conversation** | **System prompt** (or a more specific one) | Holds role, scope and format steady across turns |
| **Right task, invented structure** | **Few-shot examples** | Shows the pattern; a description can't pin down an exact shape |
| **Fine on tested inputs, breaks on an edge case** | **A constraint or example covering that variant** | The prompt only handled the happy path |

## The four techniques
- **System prompt:** the **persistent behavioural contract** for the whole session. Role, output format, rules that never change. Write it once.
- **XML tags:** **separate** the instruction from the data and examples, so Claude doesn't read the examples as part of the task.
- **Few-shot examples:** **show** the exact format and casing instead of describing it.
- **Output constraint:** specify the **form, field names and stopping point**.

## Worked example: ticket classifier
**Before:** `"You are a support classifier. Classify the ticket."` → `Billing` / `billing` / "This looks like a billing issue." → the router breaks.

**After:** all three techniques, each doing a separate job:
```
System: Classify each ticket into exactly one of: BILLING, TECHNICAL, ESCALATION.
        Return only the label. No other text.          ← output constraint

<sample_input>My account shows two charges for April.</sample_input>
<ideal_output>BILLING</ideal_output>                     ← few-shot, separated by XML

User: <ticket>I was charged twice for the same month.</ticket>
```

## How much to use
| Situation | Do |
|---|---|
| Clearly defined output contract, edge cases you can cover with examples | **Stack all four** |
| Simple task (e.g. "summarize this paragraph") | **Simplify**: no few-shot or schema needed |
| Prompt growing with each iteration, still wrong after ~5 tries | **Diagnose** before adding anything |

## Structured outputs: enforcement by the API, not a request in the prompt
- A prompt instruction is a **request**, so the model can still slip. Structured outputs use **constrained decoding**: you give the API a **JSON schema**, and at each token it **only allows tokens that keep the output valid**.
- Why it matters in production: **it holds on inputs you never tested**, because correctness is enforced up front instead of checked afterwards.

| | JSON outputs | Strict tool use |
|---|---|---|
| Constrains | the **final response** | the **arguments Claude passes to your tools** |
| How | `output_config.format` with `type: "json_schema"` + schema | `strict: true` on the tool definition |
| Use when | the response *is* the payload your code consumes (e.g. extracting ticket fields). Removes parse-and-retry code | agentic loops, where a bad argument would crash the function or trigger the wrong action |

You can use them separately or together in the same request.

### Costs: don't turn it on everywhere by default
- **First request on a new schema is slower:** the schema is compiled into a grammar, **cached for 24 h from last use**. Schemas that change constantly pay the cost repeatedly.
- **More input tokens:** the API **injects a system prompt** describing the format, and it's billed.
- **A valid schema doesn't mean success:** `stop_reason: "refusal"` (declined for safety) or `"max_tokens"` (cut off mid-structure). **Still check `stop_reason`.**
- **Incompatible with prefilling** the assistant message. Pick one.

## Exam traps
- "The format keeps drifting → reword it / add 'please format correctly'" → ✗ Add an **output constraint**.
- "Still wrong after 5 tries → add more detail" → ✗ **Diagnose** the failure type first.
- "Use all four techniques on every prompt" → ✗ A simple task needs one.
- "Drift gets worse later in the conversation → add few-shot" → ✗ That's a **system prompt** problem.
- "'Return only JSON' in the prompt is as reliable as structured outputs" → ✗ Request vs. **enforced per token**.
- "Structured outputs guarantee every response parses" → ✗ **refusal** and **max_tokens** still break it.
- "Structured outputs cost nothing extra" → ✗ First-call **compile latency** + **injected input tokens**.
- "Use JSON outputs with a prefilled assistant message" → ✗ **Incompatible.**
- "`strict: true` constrains the final response" → ✗ It constrains **tool inputs**. JSON outputs constrains the response.
