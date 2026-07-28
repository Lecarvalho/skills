---
name: agent-readiness-audit
description: Audit a codebase for how well it is structured for coding agents to work in, and produce a scored HTML report. Scores ten structural principles (behavior-oriented layout, enforced dependency direction, naming, canonical verify workflow, instruction placement, test mirroring, generated-code separation, one live implementation, consistency, file size) 0-10 each with evidence, then emits a self-contained light/dark HTML scorecard plus a prioritized remediation list. Use when the user asks to audit, score, assess, or review a repository for agent-readiness, agent-friendliness, LLM-friendliness, codebase legibility, or "how well is this repo organized for Claude/agents to work in".
---

# Agent-Readiness Audit

Produces a scored structural audit of a codebase — how cheaply an agent can **find**
relevant code, **predict** its constraints, and **verify** a change. The output is a
self-contained HTML report.

**This measures structural legibility only.** Not correctness, not test quality, not
security, not performance, not product fit. A codebase can score 100 here and still be
wrong. Say so in the report footer; never let the score be read as a quality verdict.

**Scope assumption:** these principles target codebases large enough that nobody holds
them in context — hundreds of source files, often multiple stacks. Several are overkill
for a small service, where a flat layered layout is genuinely fine. If the target repo is
small (< ~100 source files, single stack), say so up front and note which principles are
being scored leniently as a result.

## Procedure

Follow these in order. Do not skip step 2 — scores must rest on counted evidence, never
on impression.

### 1. Read the rubric

Read `references/principles.md`. That file is the scoring standard: ten principles, each
with its intent, good/bad shape, and the "enforce with" line that separates a strong
score from a weak one.

The load-bearing idea, which the report's conclusion should usually return to:
**a principle encoded into a check scores high; a principle only written down scores low.**
Most repos split cleanly along that line, and naming the split is the most useful thing
the report says.

### 2. Gather evidence

Run the sweeps in `references/evidence.md` against the target repo. They cover: directory
shape, filename sweeps (generic names, versioned/legacy names), line-count distribution,
lint/CI configuration, architecture or boundary tests, test layout and single-test
runnability, generated-code markers, and the instruction layer.

Rules for this step:

- **Count things.** Every claim in the report should trace to a number, a path, or a
  quoted line. "Tests are disorganized" is not a finding; "79 test files flat in
  `tests/services/`, of which at least 30 are not services" is.
- **Batch the commands** — several per tool call. This is a read-only sweep; it should
  take a handful of calls, not dozens.
- **Exclude** `node_modules/`, `bin/`, `obj/`, `dist/`, `vendor/`, `target/`, `.venv/`,
  and generated output from all counts. State the exclusions in the footer.
- **Read the actual config files** — the lint config, the CI workflow, the verify script,
  the instruction files. Configs are where the difference between "documented" and
  "enforced" is visible, and that difference drives half the scores.
- **Quote the repo against itself when it self-documents a problem.** A comment
  acknowledging a workaround is the strongest possible evidence and belongs in a
  blockquote in the report.
- Do not spawn subagents unless the user asks for it.

### 3. Score

Apply `references/scoring.md`. Ten principles, 0–10 each, unweighted sum = the headline
out of 100. Bands: **8–10 strong, 6–7 adequate, 0–5 weak.**

Score the repo as a whole, not the best tier. When tiers diverge sharply — common in
monorepos — score the composite and make the divergence the headline finding for that
principle. A backend at 10 and a frontend at 2 is a 6, and the verdict line must say why.

Be willing to give low scores. A rubric that returns 8s for everything is not measuring.

### 4. Write the report

Copy `assets/report-template.html` and fill it in. Structure, in order:

1. **Masthead** — repo path, date, hero score, and a two-line framing of where the deficit
   is concentrated.
2. **Scorecard table** — all ten with score, band pill, and a one-line verdict each.
3. **Findings by principle** — one card per principle: verdict paragraph, then a two-column
   `Working` / `Costing …` split. The right-hand heading names the *cost*, not the
   problem: "Costing searches", "Costing verification", "Costing the feedback loop".
4. **What to fix, in order** — ranked by payoff per hour, *not* by score. Each row: action,
   principles addressed, rough effort, and why it sits at that rank. Cheap high-leverage
   fixes come before expensive high-score ones. Anything measured in weeks goes last with
   an explicit "defer this" note.
5. **Reading the result** — two short paragraphs naming the single pattern that explains
   the scores.
6. **Footer** — method, and the explicit not-assessed list.

Writing rules:

- Every finding carries a path, a count, or a quote. No unsupported adjectives.
- Lead each card's "Working" column honestly — if a tier is genuinely excellent, say so
  plainly. A report that only criticizes gets discounted.
- Effort estimates in hours/days. They make the fix list actionable and force honesty
  about which items are real projects.
- The last remediation row is usually the biggest restructure. Flag that a half-finished
  version of it is worse than not starting.

### 5. Deliver

Write the file to the **current working directory** as
`<repo-name>-agent-readiness-report.html`, unless the user names a location. Don't write
into the audited repo unprompted — an audit is not something to leave lying in someone
else's tree. State the full output path when reporting.

Then report, in chat: the headline score, the scorecard table, and the three findings
worth acting on first. Don't restate the whole report — it's in the file.

Then offer to publish it as an Artifact for a shareable link. Do not publish
unprompted: an audit names weaknesses in someone's codebase, so the decision to
give it a URL is the user's.

## Visual spec (do not re-derive)

`assets/report-template.html` already carries a validated palette. Reuse it as-is.

The status colors were checked with the `dataviz` skill's `validate_palette.js` in both
modes and pass the lightness band, chroma floor, normal-vision floor, and contrast checks.
The one CVD warning (green↔amber, ΔE 6.8–7.9) is legal **only because every meter carries
a numeric score and a text band label** — color is never the sole encoding. If you change
these hex values you must re-run the validator and keep the secondary encoding.

| Role | Light | Dark |
|---|---|---|
| Strong (8–10) | `#1a8a5e` | `#3d9970` |
| Adequate (6–7) | `#a8761f` | `#b8842a` |
| Weak (0–5) | `#b83a4c` | `#d1495b` |
| Surface | `#fcfcfb` | `#1a1a19` |

Other constraints, all already in the template: fully self-contained (no external fonts,
scripts, or images); responds to `prefers-color-scheme` **and** to `:root[data-theme]`
so a viewer toggle wins in both directions; tables live in `.scroller` wrappers so wide
content scrolls inside itself and the page body never scrolls horizontally.

## Reference files

| File | Contents |
|---|---|
| `references/principles.md` | The ten principles — intent, good/bad shape, enforcement. The scoring standard. |
| `references/evidence.md` | Copy-paste sweeps per principle, cross-platform, with exclusions. |
| `references/scoring.md` | Per-principle 0–10 bands and the scoring discipline. |
| `assets/report-template.html` | The report skeleton — validated palette, card and table components. |
