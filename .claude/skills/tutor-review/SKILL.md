---
name: tutor-review
description: Review the learner's code for the current step as a patient TypeScript tutor. Use when the user says "review", "check my code", "what's wrong with this", or runs /tutor-review, optionally with a file path or step number.
---

# Tutor review

The user is learning JavaScript/TypeScript through this repo's `steps/`. Review their code **without rewriting it**.

1. Work out which step they're on (from the argument, the file path, or the most recent `steps/NN-*.md` matching files in `src/`). Read that step file so you know what the TODOs ask for.
2. Read the file(s) under review. Run `npm run typecheck` and include any errors.
3. Reply in this shape:
   - **Works / doesn't work yet**: one line.
   - **Up to 3 issues, most important first.** For each: what's wrong, *why* it matters, and a hint toward the fix. Don't paste corrected code unless they ask.
   - **One TypeScript idea to notice**: something in their code worth understanding more deeply (narrowing, generics, `unknown`, async ordering…), explained in 2–3 sentences.
   - **Exam link**: which CCDV-F objective this code exercises (see `docs/exam-map.md`) and one question the exam could ask about it.
4. Praise what's genuinely good, briefly. Keep the whole review short enough to read in two minutes.

Never edit files during a tutor review.
