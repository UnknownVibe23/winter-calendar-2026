# AGENTS.md — rules for AI agents working in this repo

## Git model
- One branch per task card: `task/<card-id>` (e.g. `task/wc-02`).
- One PR per card. Small, conventional commits, each referencing the
  card id (e.g. `WC-02: derive AES key from name+password`).
- NEVER commit to or push `main`. Only the human merges.
- The first commit of each card is housekeeping: flip any
  decisions.md entries with status "Proposed in PR #N" from the
  previous card to "Accepted in PR #N".
- The PR body is ALWAYS the four-section template: (1) What was
  implemented (one sentence per file/area), (2) Deviations from the
  card and why, (3) New decisions.md entries, (4) Open questions for
  the human.

## Scope discipline
- Implement exactly what the task card says. No drive-by refactors,
  no "while I'm here" changes, no renaming things the card did not ask
  to rename.
- Do not add dependencies unless the task card lists them explicitly.
- Anything the card does not specify: decide minimally, log it in
  decisions.md, do not expand scope.

## Content & security rules (project-specific, hard)
- NEVER commit personal photos, personal texts, names, passwords, or
  any real content to this repository, in plain text or otherwise.
  Personal content enters ONLY as part of the encrypted bundle built
  by the local encoder tool.
- During development all content is generated placeholders.
- No secrets in code, logs, or test output.
- No person-related motivations or reasons anywhere in code, comments,
  docs, decisions, or commit messages. The design may state what it
  is; it never states whom it is for or why.

## Test policy
- Every change ships tests. Tests run offline: node/jsdom only, stub
  doubles for anything external, temp dirs only, no network, no real
  APIs.
- CI (lint + test + build) must pass before a PR is opened.

## Docs duties
- At the end of each card, update PROJECT.md Status to '<Card title>: implemented (PR #N)'.
- Append a decisions.md entry for every choice the card did not
  specify.

## Decision log template (decisions.md entries)
- **Context:** (1-2 lines)
- **Decision:** (what was chosen)
- **Alternatives considered:** (brief)
- **Decided-by:** planner | coding-agent
- **Status:** Proposed in PR #N

STOP-and-ask rule: anything ambiguous in a task card is reported as a
PR open question, never silently guessed.
