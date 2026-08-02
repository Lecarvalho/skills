---
name: agent-readiness-audit
description: Audit a codebase and produce a scored HTML report, in one of two modes. Default (readiness) scores ten structural principles for how well the repo is organized for coding agents — behavior-oriented layout, enforced dependency direction, naming, canonical verify workflow, instruction placement, test mirroring, generated-code separation, one live implementation, consistency, file size. The `--overengineering` flag switches to a proportionality rubric that scores whether the repo's structure is paid for by the work it actually does — single-occupant abstractions, pass-through indirection, unconfigured configuration, speculative generality, premature infrastructure, change amplification, identical model chains, ceremony, wrong-axis seams, unreachable surface. Use when the user asks to audit, score, assess, or review a repository for agent-readiness, agent-friendliness, LLM-friendliness, codebase legibility, "how well is this repo organized for Claude/agents to work in", or — for the flag — for overengineering, over-abstraction, over-architecture, accidental complexity, YAGNI violations, speculative generality, or "is this codebase too complex for what it does".
---

# Codebase Structural Audit

Produces a scored structural audit of a codebase as a self-contained HTML report. Two
rubrics share one procedure, one scoring machine, and one report template.

## Modes

Pick the mode **before step 1**, then use only that mode's reference files. Never mix
rubrics in one report.

| Mode | Invoked by | Question it answers |
|---|---|---|
| **Readiness** *(default)* | no flag, or "agent-readiness" | Can an agent cheaply **find**, **predict**, and **verify** in this repo? |
| **Overengineering** | `--overengineering` / `--oe`, or an ask about over-abstraction, accidental complexity, YAGNI, "too complex for what it does" | Is the repo's structure **paid for by the work it actually does**? |

Both modes: ten principles, 0–10 each, unweighted sum out of 100, same bands, **same
polarity — high is good.** In overengineering mode the headline is a **Proportionality**
score: 100 means the structure is fully earned, not that the repo is maximally
overengineered. Never label it "overengineering score."

If the user's ask is ambiguous, ask which mode before spending sweeps. Running both is
allowed if requested — produce two separate reports, and do not sum them.

**Reference files per mode:**

**Reference layout — the two rubrics are parallel trees; the filenames are identical, only
the parent folder differs.**

| Step | Readiness | Overengineering |
|---|---|---|
| Rubric | `references/readiness/principles.md` | `references/overengineering/principles.md` |
| Sweeps | `references/readiness/evidence.md` | `references/overengineering/evidence.md` |
| Anchors | `references/readiness/scoring.md` | `references/overengineering/scoring.md` |
| Report | `assets/report-template.html` | same file — see *Template swaps* below |

Read from **one** folder for the whole audit. Reading `principles.md` from one and
`scoring.md` from the other produces a report whose scores don't match its rubric.

**What neither mode measures.** Not correctness, not test quality, not security, not
performance, not product fit. A codebase can score 100 in either mode and still be wrong.
Say so in the footer; never let the score read as a quality verdict.

**Scope assumption (readiness mode).** These principles target codebases large enough that
nobody holds them in context — hundreds of source files, often multiple stacks. Several
are overkill for a small service, where a flat layered layout is genuinely fine. If the
target repo is small (< ~100 source files, single stack), say so up front and note which
principles are scored leniently as a result.

**Scope assumption (overengineering mode).** Size does not exempt a repo — a small repo
with six layers is the *more* serious finding, not the lesser one. What does change the
bands is **kind and age**: a published library legitimately carries interfaces, options,
and exported surface an application would not, and a ten-year-old repo that accreted
structure under real load is judged differently from a six-month-old one that arrived with
it. Determine kind and age in step 2 and state both in the report.

## Procedure

Follow these in order. Do not skip step 2 — scores must rest on counted evidence, never
on impression.

### 1. Read the rubric

Read the mode's principles file. That file is the scoring standard: ten principles, each
with its intent, good/bad shape, and the line that separates a strong score from a weak
one.

Each mode has one load-bearing idea, and the report's conclusion should usually return to
it:

- **Readiness:** *a principle encoded into a check scores high; a principle only written
  down scores low.* Most repos split cleanly along that line, and naming the split is the
  most useful thing the report says.
- **Overengineering:** *name the concrete variation this structure absorbs, and point at
  where it occurred.* Structure that passes this test is earning its keep whatever it
  looks like; structure that fails it is the finding. Every deduction must have run this
  test and failed it — say so in the finding text.

### 2. Gather evidence

Run the sweeps in the mode's evidence file against the target repo.

Rules for this step, both modes:

- **Count things.** Every claim in the report should trace to a number, a path, or a
  quoted line. "Too many layers" is not a finding; "5 files to follow one write, 4 of
  which add no decision" is.
- **Batch the commands** — several per tool call. This is a read-only sweep; it should
  take a handful of calls, not dozens.
- **Exclude** `node_modules/`, `bin/`, `obj/`, `dist/`, `vendor/`, `target/`, `.venv/`,
  and generated output from all counts. State the exclusions in the footer.
- **Read the actual files**, not just their names — the lint config, the CI workflow, the
  interface and its implementations, the models being compared. Directory listings support
  a hypothesis; they never settle one.
- **Quote the repo against itself when it self-documents a problem.** A comment
  acknowledging a workaround is the strongest possible evidence and belongs in a
  blockquote in the report.
- **Solo by default.** Spawn subagents only as described in *Solo or fan-out* below —
  for context capacity on large repos, never for speed or economy.

Additionally, in **overengineering mode**:

- **Git history is primary evidence, not a cross-check.** Speculation is invisible in a
  snapshot and obvious in history. Establish the 12-month heat list first — nearly every
  principle is weighted by it — and run the per-principle history checks. If the repo has
  no usable history, score P3/P6/P8/P9 at 7 by default and say so in the masthead.
- **Run the counter-check before every finding.** Each sweep names one. A single-occupant
  interface with a second implementation in flight, an event bus justified by a
  postmortem, a "dead" export in a published library — these are not findings, and a
  report that lists them loses the reader's trust for the ones that are.
- **Record under-engineering as you go.** Duplication, missing seams, copy-paste. It goes
  in the report as an explicit counterweight (see step 4), so the recommendation reads as
  proportionality rather than minimalism.

#### Solo or fan-out — decide after the orient sweep

Subagents always cost more total tokens — each pays its own setup and its slice of the
rubric. What they buy is context capacity: on a large repo, a solo audit fills its
context with sweep output and file reads before it ever scores, and evidence quality
degrades quietly into skimming. So spawn for capacity, never for speed. The orient sweep
already counts source files; decide there.

| Repo | Path |
|---|---|
| < ~100 source files | Solo, with the small-repo leniency note (see *Scope assumption*) |
| Up to ~1,500 source files, single stack | Solo — the procedure above, unchanged |
| > ~1,500 source files, or ≥2 distinct stacks/tiers at any size | Fan out (below) |

In overengineering mode drop the fan-out threshold to ~1,000 — history output is bulky.
The numbers are proxies, not laws: the honest test is whether sweeps plus file reads
will fit in roughly half the context, leaving room to score and write the report.
Multi-stack monorepos hit the wall at half the count because tiers are evidenced
separately and scored as a composite.

User overrides: `--deep` forces fan-out at any size; `--solo` forces a single context at
any size. If the harness has no way to spawn subagents, run solo regardless and state in
the footer that evidence was gathered under a context ceiling.

**Fan-out shape.** The orchestrator stays the auditor; subagents are evidence gatherers.

1. The orchestrator itself runs step 0, fixes the exclusion list, determines kind and
   age, and — in overengineering mode — builds the 12-month heat list. This groundwork
   feeds every cluster; do it once and pass it down.
2. Dispatch 3–4 subagents clustered by **data source, not by principle** — one owns
   directory structure and filename sweeps, one owns configs and CI, one owns the source
   files the rubric requires actually reading, one (overengineering mode) owns git
   history. Each source is read once, by the agent that owns it, and answers every
   principle whose sweeps draw on it. One agent per principle is the wrong cut — ten
   agents re-running the shared groundwork and re-reading the same files.
3. Each subagent gets the sweeps it owns from the mode's evidence file, the groundwork
   from step 1, and the repo path. It returns counted evidence only — numbers, paths,
   quoted lines, counter-check results. Never scores, never verdicts.
4. Scoring, the under-engineering counterweight, the synthesis sections, and the report
   remain the orchestrator's alone. Cross-principle judgment — the single pattern behind
   the scores, composite tier scoring, calibrated low scores — does not survive being
   split ten ways.

Run evidence subagents at low reasoning effort where the harness offers the knob — the
work is mechanical grep-and-count. Keep the orchestrator at full effort for scoring and
writing. Inherit the session model everywhere; do not pick models per subagent.

### 3. Score

Apply the mode's scoring file. Ten principles, 0–10 each, unweighted sum = the headline
out of 100. Bands: **8–10 strong, 6–7 adequate, 0–5 weak** (in overengineering mode:
proportionate / tolerable / overengineered).

Score the repo as a whole, not the best tier. When tiers diverge sharply — common in
monorepos — score the composite and make the divergence the headline finding for that
principle. A backend at 10 and a frontend at 2 is a 6, and the verdict line must say why.

Be willing to give low scores. A rubric that returns 8s for everything is not measuring.

In overengineering mode, additionally: **weight every score by heat**, and never let the
absence of abstraction alone earn a 10 — cap a principle at 8 where the sweeps found
genuine under-abstraction, and name it.

### 4. Write the report

Copy `assets/report-template.html` and fill it in. Structure, in order:

1. **Masthead** — repo path, date, hero score, and a two-line framing of where the deficit
   is concentrated. In overengineering mode, also state repo kind, age, and history
   confidence here.
2. **Scorecard table** — all ten with score, band pill, and a one-line verdict each.
3. **Findings by principle** — one card per principle: verdict paragraph, then a two-column
   `Working` / `Costing …` split. The right-hand heading names the *cost*, not the
   problem: "Costing searches", "Costing verification", "Costing every read".
4. **What to fix, in order** — ranked by payoff per hour, *not* by score. Each row: action,
   principles addressed, rough effort, and why it sits at that rank. Cheap high-leverage
   fixes come before expensive high-score ones. Anything measured in weeks goes last with
   an explicit "defer this" note.
5. **Reading the result** — two short paragraphs naming the single pattern that explains
   the scores.
6. **Footer** — method, and the explicit not-assessed list.

**Overengineering mode adds one required section**, between 4 and 5:

> **Where the repo is *under*-engineered** — the counterweight. Duplication, missing
> seams, and copy-paste found during the sweeps, with paths and counts. If the sweeps
> found none, say that explicitly. Without this section the report reads as an argument
> for minimalism, which is a different and equally wrong position.

Writing rules:

- Every finding carries a path, a count, or a quote. No unsupported adjectives.
- Lead each card's "Working" column honestly — if a tier is genuinely excellent, say so
  plainly. A report that only criticizes gets discounted.
- Effort estimates in hours/days. They make the fix list actionable and force honesty
  about which items are real projects.
- The last remediation row is usually the biggest restructure. Flag that a half-finished
  version of it is worse than not starting.
- In overengineering mode, prefer **"re-cut"** to **"delete"** for P9 findings, and be
  explicit that the recommendation is never a rewrite. If the fix list reads as
  "restructure the codebase," it has drifted from the evidence.

### 5. Deliver

Write the file to the **current working directory**, unless the user names a location:

| Mode | Filename |
|---|---|
| Readiness | `<repo-name>-agent-readiness-report.html` |
| Overengineering | `<repo-name>-overengineering-report.html` |

Don't write into the audited repo unprompted — an audit is not something to leave lying
in someone else's tree. State the full output path when reporting.

Then report, in chat: the headline score, the scorecard table, and the three findings
worth acting on first. Don't restate the whole report — it's in the file.

Then offer to publish it as an Artifact for a shareable link. Do not publish
unprompted: an audit names weaknesses in someone's codebase, so the decision to
give it a URL is the user's.

## Visual spec (do not re-derive)

`assets/report-template.html` already carries a validated palette. Reuse it as-is, in both
modes.

The status colors were checked with the `dataviz` skill's `validate_palette.js` in both
modes and pass the lightness band, chroma floor, normal-vision floor, and contrast checks.
The one CVD warning (green↔amber, ΔE 6.8–7.9) is legal **only because every meter carries
a numeric score and a text band label** — color is never the sole encoding. If you change
these hex values you must re-run the validator and keep the secondary encoding.

| Role | Light | Dark |
|---|---|---|
| Strong / Proportionate (8–10) | `#1a8a5e` | `#3d9970` |
| Adequate / Tolerable (6–7) | `#a8761f` | `#b8842a` |
| Weak / Overengineered (0–5) | `#b83a4c` | `#d1495b` |
| Surface | `#fcfcfb` | `#1a1a19` |

Other constraints, all already in the template: fully self-contained (no external fonts,
scripts, or images); responds to `prefers-color-scheme` **and** to `:root[data-theme]`
so a viewer toggle wins in both directions; tables live in `.scroller` wrappers so wide
content scrolls inside itself and the page body never scrolls horizontally.

### Template swaps for overengineering mode

The template carries `{{MODE_*}}` placeholders. Fill them per mode — everything else in
the template is mode-neutral. Do not restyle anything.

| Placeholder | Readiness | Overengineering |
|---|---|---|
| `{{MODE_TITLE}}` | `Agent-Readiness Audit` | `Overengineering Audit` |
| `{{MODE_HEADING}}` | `agent-readiness scorecard` | `proportionality scorecard` |
| `{{MODE_SUBTITLE}}` | scored against ten structural principles for codebases that coding agents work in at scale; scores reflect how cheaply an agent can locate, predict, and verify | scored against ten principles of proportionate structure; scores reflect whether the repo's abstraction, indirection, and infrastructure are paid for by the work it actually does |
| `{{MODE_BANDS}}` | `8–10 strong, 6–7 adequate, 0–5 weak` | `8–10 proportionate, 6–7 tolerable, 0–5 overengineered` |
| `{{MODE_METHOD}}` | directory structure, filename sweeps, line-count distribution, lint and CI configuration, boundary tests, and the instruction layer | abstraction/implementation counts, call-path tracing, configuration variance, subscriber counts, model field diffs, and 12-month change history |
| `{{MODE_RUBRIC_LINE}}` | scored against the agent-readiness rubric | scored against the proportionality rubric; **high is good — 100 means fully earned structure, not maximum overengineering** |
| `{{MODE_NOT_ASSESSED}}` | measures structural legibility only — how cheaply an agent can find, predict, and verify | measures proportionality of structure only — not correctness, not whether the architecture is otherwise sound. It is not an argument for minimalism: under-engineering is called out separately |

Also, in overengineering mode: retitle the scorecard section **Proportionality scorecard**,
and add the required under-engineering section as one more `.card` block before
*Reading the result*.

## Reference files

```
references/
  readiness/         principles.md · evidence.md · scoring.md    default mode
  overengineering/   principles.md · evidence.md · scoring.md    --overengineering
assets/
  report-template.html                                           both modes
```

| File | Mode | Contents |
|---|---|---|
| `references/readiness/principles.md` | Readiness | The ten readiness principles — intent, good/bad shape, enforcement. |
| `references/readiness/evidence.md` | Readiness | Copy-paste sweeps per principle, cross-platform, with exclusions. |
| `references/readiness/scoring.md` | Readiness | Per-principle 0–10 bands and scoring discipline. |
| `references/overengineering/principles.md` | Overengineering | The ten proportionality principles, the falsification test, and the three costs. |
| `references/overengineering/evidence.md` | Overengineering | Sweeps per principle, history-first, each with its counter-check. |
| `references/overengineering/scoring.md` | Overengineering | Per-principle 0–10 bands, polarity, heat weighting, confidence rules. |
| `assets/report-template.html` | Both | The report skeleton — validated palette, card and table components. |
