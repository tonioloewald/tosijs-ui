# Lean-plan review of tosijs-ui: the reviewer's brief

You are one of eight reviewers. Each of you reads one area of `~/tosijs-ui`. Your findings feed a plan the owner reads before cutting 1.20.0. The plan answers one question: **how does this library get leaner, cleaner, more robust, and easier to learn and use?**

- **The output is a plan, not a diff.** Change nothing in the repo: no edits to `src/`, `tests/`, `bin/` or docs, no git operations, no commits.
- Don't file cards. I file them.
- Don't edit other repos. Reading them is fine.

## Basis

- Commit `af13cd1ee` on `main`: version 1.19.2 plus the unreleased 1.20 change, in which no component defines an `on<Event>` member.
- Line numbers refer to that commit.

## Read first

1. **`CLAUDE.md`** at the repo root. It records many settled decisions. A settled decision is never re-proposed: it goes under "Not proposing", citing where it was settled. Some examples:
   - the doc-system cluster stays out of the root barrel;
   - no blanket `sideEffects: false`;
   - CodeMirror and prismjs are hard dependencies;
   - `isLiveFence` and `parseFenceInfo` are the one fence predicate and the one fence parser;
   - `iife.js` is CDN-only;
   - the dev server must never call `Bun.build()` in-process;
   - markdown is not formatted;
   - object- and function-valued props default to `null`.
2. **`…/scratchpad/lean/open-cards.txt`**, the board's open cards for this repo. If a finding is already filed, cite the card number rather than presenting it as new.
3. **`the consumer-usage count (a scratch file, not kept: per-name import counts across 25 sibling repos)`**: which exports the 25 sibling repos (`~/<repo>`) import, counted by name and by subpath.
   - Namespace imports dodge the count; they are listed at the bottom.
   - Users outside these repos are invisible.
   - A count shows which spelling won. It does not prove a removal is safe.
   - Grep the consumer repos yourself for anything the table doesn't settle, and skip their `node_modules`, `dist` and `docs` folders.
4. **`…/scratchpad/lean/exports-before.json`**: each entry point's runtime exports.

`…` is `<scratchpad, not kept>`.

**Breaking-change policy here** (CLAUDE.md, "What earns a minor"):
- A patch never breaks anyone.
- A minor may remove or rename things. 1.20.0 already removes `<tosi-tabs>`'s `onCloseTab` alias.
- There is no separate major.

## Method

- **Read every non-test module in your scope, line by line.** Don't sample.
  - If you run out of room, say exactly which files or line ranges you only skimmed.
  - Read the tests for your area enough to know what is covered.
- **Mark what you ran.** ✔ means you executed it: a unit check, a throwaway script, `bun test <file>`. Give the exact command and the output that proves it.
  - Anything else is "read", and labelled so.
  - Throwaway scripts go in `…/scratchpad/lean/<your-area>/`, never in the repo.
  - DOM code runs with the happy-dom preload: `cd ~/tosijs-ui && bun --preload ./src/test-setup.ts <script>`.
  - Don't start dev servers or Playwright: eight reviewers would fight over ports.
- **Line up the copies.** This is where the defects come from.
  1. For every behaviour implemented more than once, diff the copies, within your scope and across the repo (grep `src/` and `bin/`).
     - Some likely families: path get/set helpers, positioning and clamping, debounce/throttle, escaping HTML or attributes, slugging, focus trapping, keyboard handling, observers and teardown, fence/markdown parsing, colour maths, fetch with timeout, temp-file and lock handling.
  2. When the copies disagree, one of them is usually a bug: report it as a defect.
  3. A merge is the union of every copy's guards plus the better optimisation.
  4. Check that a proposed merge isn't a router in disguise: a function with a mode switch that is really two functions.

## What to report

Write your report to **`…/scratchpad/lean/<your-area>.md`** in exactly these sections. Give each item a `file:line`.

**A. Defects:** live bugs. They are neither cleanup nor redundancy.
- For each, give the defect, its evidence (✔ with the reproduction, or "read"), where it is, and any existing card.
- Group defects that share a cause and name the cause.
- Say whether each is worth a patch on its own.

**B. Phase 1 (no functionality removed):**
- **Dead code:** internal things nothing uses. Check `src/`, the tests and every entry point. A public export is never phase 1; it goes to C or E.
- **One implementation each:** the duplicates to merge, and what the merged version keeps.
- **Declarations written twice** when they could be derived from the data they describe, e.g. a type and a list of its keys.
- **Teardown and caches:** listeners, observers, timers and maps that grow forever or are never released when an element disconnects.
- **Structure** with no behaviour change, one file per change.
- **Tests and build:** repeated harness code, and the tests a merge would need.
- **Docs, with no API change:**
  - examples in `/*#` blocks that throw;
  - advice that is wrong today;
  - a teaching order that puts the second-best spelling first.

**C. Phase 2 (one way to do each thing):**
- **Redundant public spellings,** as a table: the task, the redundant spelling, what it's the same as, uses across the consumers, and notes.
  - Prove "same as" (✔ where you can).
  - A spelling with a capability the survivor lacks isn't redundant.
- **The existing `@deprecated` inventory in your scope:** is each one still needed? Does it warn once at runtime and name its replacement? Do the docs teach only the survivor? What does the inventory miss?

**D. Not proposing:** things that look redundant but stay, each with its reason (settled, and where; a different job; or not worth a break by itself).

**E. Unused, but not redundant:** exports no consumer imports that duplicate nothing. This is information, not a recommendation, so name only the few that need a decision.

**F. Numbers:**
- lines of code, doc and comment in your scope;
- the largest files;
- for your area's most common task, how many ways there are to do it (e.g. "ways to open a popup: 4");
- anything else that frames the area.

## Rules

- No byte estimates you didn't measure.
- Don't pad. When you're unsure of a finding, say so and say what would settle it.
- Quote code sparingly: a `file:line` plus one line is usually enough.
- **Your final message** is a summary of about 12 lines: the counts per section, the 3 items the owner most needs to see, and anything you couldn't finish. The report file holds the detail.
