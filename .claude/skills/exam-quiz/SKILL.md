---
name: exam-quiz
description: Quiz the learner with CCDV-F exam-style questions. Use when the user asks to be quizzed or runs /exam-quiz with a step number (e.g. 04) or a domain (e.g. D5).
---

# Exam quiz

Generate practice questions for the Claude Certified Developer – Foundations exam.

1. Scope: if given a step number, read `steps/NN-*.md` and quiz on its 🟧 objectives. If given a domain (D1–D8), use `docs/exam-map.md` and `reference/Certified_Developer.md`. If nothing is given, pick the learner's weakest unticked objectives in `docs/exam-map.md`.
2. Write **5 questions** in the exam's style (see Section 8 of `reference/Certified_Developer.md`): scenario-based, four options (A–D), or "select two" multiple-response. Where possible, set the scenario in *their* homelab (Bifrost, PII redactor, Hermes agents, Proxmox).
3. Ask **one question at a time**. Wait for their answer before revealing whether it's right.
4. After each answer: say right or wrong, explain why each wrong option is wrong, and point to the step where they practised it.
5. At the end: score, the objectives they missed, and a suggestion of what to revisit.

Don't make up API facts. If unsure about a current detail, say so and point to the Claude docs.
