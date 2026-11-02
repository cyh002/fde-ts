---
name: course-notes
description: Turn pasted Claude Certified Developer – Foundations course material into short exam notes in course/. Use when the user pastes lesson text from the developer course, or runs /course-notes, optionally with a module or lesson name.
---

# Course notes

The learner is pasting lesson text from the official **Claude Certified Developer – Foundations Prep Course**. Turn it into short exam notes. No fluff.

## Where things go

One folder per module, one file per lesson:

```
course/
  README.md
  01-mso-foundations/01-how-llms-behave.md
  02-prompting-agents-tools/
  03-claude-code-mcp/
  04-production-evals-security/
  05-accelerators-ip/
```

If the module isn't clear from the paste, ask in one line.

## Format (see `course/01-mso-foundations/02-model-options-and-reasoning-technical.md` for a worked example)

```md
# <Lesson title>

## <Part / tab name>
- Terse bullets. **Bold** the fact an exam question would hinge on.
- Exact names in `code`: stop reasons, params, error codes.
- Forward refs as "→ Module N".

## Exam traps
- "<plausible wrong statement>" → ✗ <one-line correction>
```

- Use a table when the paste contrasts two or more options (e.g. async client vs Batches API).
- If the learner pasted their own rough bullets, keep their structure and tighten it. Flag anything contradictory with ⚠️ rather than guessing.

- If it's a new lesson, create a new file. If it's the next part of a lesson that already has a file, add a `##` section to it and add any new traps to its trap list.
- Don't keep the original text. The learner removed it.
- Cut the motivation, repetition and "this course will…" lines. Keep every fact, number, name and caveat.
- Traps come **only from the paste**: the wrong beliefs it explicitly corrects. Don't invent API facts.
- Update `course/README.md` with a link to the lesson.

## Reply

Give the file path and **one** question back to check understanding. Nothing else.

## Don't

- Don't add glossaries, takeaways, or sections beyond the format above.
- Don't edit `steps/` or `src/` from this skill.
- If something in the paste looks out of date, say so in the reply, not in the file.
