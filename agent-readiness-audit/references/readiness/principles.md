# Agent-Ready Codebase — Structural Principles at Scale

Principles for organizing a large codebase so that coding agents work efficiently in it.

**Scope:** these assume a codebase big enough that no agent (and no human) holds it all in
context — hundreds of source files, multiple stacks, long-lived. Several of them are
overkill for a small service, where a flat layered layout is genuinely fine.

**The three problems being solved.** Every principle below serves exactly one of these.
Know which, because they have very different payoffs:

| Goal | Principles | Payoff |
|---|---|---|
| **Reduce search** — fewer tool calls to build a working mental model | 1, 3, 6, 7, 10 | Moderate; agents still converge, just slower |
| **Make verification cheap** — a fast, obvious way to know an edit is correct | 4, 6 | **Highest.** An agent that can't verify ships broken work |
| **Communicate what code can't express** — constraints not inferable by reading | 2, 5, 8, 9 | High; prevents confident wrong edits |

**The meta-rule that outranks all ten:** *prefer enforcement over documentation.* A rule a
machine checks is a fact. A rule in a document is a wish. Every principle below has an
"enforce with" line; that line is the principle. The prose is the fallback for what you
genuinely can't encode.

---

## 1. Organize around behavior, not around technical role

Files needed for one change should sit near each other, so an agent builds a complete
mental model with few searches. The invariant is **things that change together live
together** — not "features, never layers."

**Good** — feature-first at the top, layers *inside* a feature:

```
src/orders/
  create-order.ts
  cancel-order.ts
  order-repository.ts
  order-policy.ts

src/payments/
  collect-payment.ts
  payment-provider.ts
```

**Bad** — role-first, so every change is a five-directory scavenger hunt:

```
src/
  controllers/     # order logic here
  services/        # ...and here
  repositories/    # ...and here
  helpers/         # ...and here too
  models/
```

**Watch the failure mode.** Feature folders drift toward duplicated cross-cutting logic
(three hand-rolled retry helpers, two date formatters). The answer is a small, explicitly
shared kernel with a stated import direction — not a return to role-first layout.

**Measure it:** pick your three most recent non-trivial changes. Count distinct top-level
directories touched. Three or more, repeatedly, means the layout fights the work.

**Enforce with:** a folder-discipline test that asserts each feature directory contains
only its expected file kinds, and a codeowners file that maps owners to features rather
than to layers.

---

## 2. Make dependency direction explicit *and mechanically enforced*

An agent should predict what a module may import before opening it. What matters is that
the graph is **acyclic and enforced** — not that you adopt any particular layering
vocabulary. Ports-and-adapters is one valid shape, not the requirement.

**Good** — a stated direction, with interfaces owned by the inner layer:

```
API → Application → Domain
          ↓
    Infrastructure

Domain owns the interfaces.
Infrastructure implements them.
Nothing points back inward.
```

**Bad** — the things that make local reasoning invalid:

```
- HTTP parsing + SQL + business rules in one function
- A global database handle
- A global "current user"
- Circular service imports
```

**Why enforcement, not documentation.** An enforced boundary is *self-teaching*: the agent
violates it, gets a precise error naming the offending type and the rule, and corrects
itself in the same turn. A diagram in a doc produces a violation that survives to review.

**Enforce with:** `dependency-cruiser` or `eslint-plugin-boundaries` (TS/JS), NetArchTest
or ArchUnit (.NET/Java), `internal/` packages (Go), import-linter (Python) — wired into the
same command CI runs. Also ban vendor SDK imports from the domain layer; that one rule
catches most accidental inversions.

---

## 3. Name files for the concept they own — and be *predictable*

Precise names give search and retrieval useful signal. But precision alone isn't enough:
the goal is that an agent can **guess the path** for "refund policy" without searching at
all. That requires a consistent convention more than any particular convention.

**Good:**

```
calculate-refund.ts        # one casing, one convention
refund-policy.ts           # file name matches the primary export
refund-repository.ts
issue-refund.test.ts
```

**Bad:**

```
helpers.ts      utils.ts      common.ts
misc.ts         manager.ts    data.ts
```

Those are bad not because they're vague, but because they become **unowned dumping
grounds with no import direction** — everything may import them, so they accumulate
everything, and they're never safe to change.

**Two related traps at scale:**

- **Two buckets with the same job.** `lib/` next to `utils/` with no stated boundary means
  every new helper is a coin flip and neither directory is searchable. Pick one, or write
  the one-line rule that separates them.
- **Brand or naming drift.** If the repo is called `Acme` but every namespace still says
  `OldName`, an agent grepping the current name finds nothing. If a rename is deferred,
  say so at the *top* of the repo map, not in a footnote.

**Enforce with:** a naming-convention test (file name ↔ exported symbol, allowed suffixes
per folder), plus a lint rule banning the dumping-ground names outright.

---

## 4. One canonical workflow, invoked identically by humans, agents, and CI

There should be one obvious command for setup, development, and verification.

**Good:**

```
make setup      make dev
make test       make lint
make typecheck  make verify
```

...and **CI calls those exact entry points.** That's the load-bearing half. It's what
makes drift structurally impossible rather than merely discouraged.

**Bad:**

```
README:     npm test
CI:         pnpm run test:ci      # re-implements the steps
Dev script: yarn verify
Package:    ./check-new.sh
```

The specific failure to watch for is CI that *mirrors* the local verifier step-by-step
instead of invoking it. It always drifts, and it drifts in the worst direction: CI green,
local red — or the reverse, which trains everyone to ignore CI.

**Three requirements people forget:**

1. **One entry point at the repo root**, even in a polyrepo-shaped monorepo. `make verify`
   should figure out which stacks changed and verify those. Requiring an agent to know
   the right subdirectory *and* the right script name is two facts too many.
2. **A fast tier.** If `verify` takes 20 minutes it gets skipped. Provide `verify:fast`
   (types only, or changed-files only) for the inner loop and reserve the full run for
   commit and CI.
3. **Failure output is part of the interface.** A runner that prints `file:line` and a real
   assertion diff is worth more to an agent than a lot of directory reorganization.

**Enforce with:** a CI job that runs the same script name a developer runs, and a
pre-commit or post-edit hook that runs the fast tier automatically.

---

## 5. Put instructions close to the code — but encode them first

Repository-wide rules belong at the root; unusual, local constraints belong beside the
module they govern.

**Good:**

```
AGENTS.md                 # lean; links out, doesn't inline everything
src/billing/AGENTS.md     # • Monetary values are integer cents
                          # • Payment operations are idempotent
                          # • Run: make verify billing
```

**Bad:**

```
One enormous wiki page
Undocumented payment rules
Setup commands that no longer work
Comments that contradict CI
```

**The rule that makes this work:** write down only what you genuinely cannot encode.
"Monetary values use integer cents" is a document that will be violated; a `Money` type
that cannot be constructed from a float is a constraint that cannot be. Reach for the
compiler, then a lint rule, then a test — and only then a paragraph.

**Keep it lean.** A 400-line instruction file is skimmed exactly like the wiki page it
replaced. Prefer a short always-on root file with a **trigger table** pointing at detail
files ("read `rules/api.md` when changing an endpoint"), so context is loaded on demand
rather than all at once.

**Staleness is the dominant risk.** A doc that contradicts CI is worse than no doc, because
the agent trusts it. Anything documented that *could* be checked should also be checked.

---

## 6. Make tests mirror behavior, and make one test runnable

From an implementation path, the agent should be able to derive the test path and the
command to run *that test alone* — without searching, and without a full-suite run.

**Good:**

```
src/orders/create-order.ts
src/orders/create-order.test.ts       # derivable from the source path

tests/integration/orders-api.test.ts
tests/end-to-end/checkout.test.ts
```

**Bad:**

```
tests/test1.ts            tests/test-new.ts
tests/regression-final.ts tests/misc-tests.ts
```

Also bad, and much more common at scale: **a flat test directory whose name is a lie** —
`tests/services/` holding tests for hooks, components, and pages alike. There's no path
from source to test, so the agent greps, and the folder name actively misleads.

**Requirements beyond layout:**

- **Single-test execution must be obvious.** A custom runner with no filter flag forces a
  full-suite run for every one-line change. That's the single most expensive property a
  test setup can have for an agent.
- **Tests must be independent.** Hidden ordering dependencies or shared mutable fixtures
  mean a passing single test proves nothing.
- **Name tests for the behavior**, not the function: `refunds_partial_amount_when_...`.

**Enforce with:** a test that asserts every source file over N lines has a corresponding
test path, and a documented one-liner for "run just this file."

---

## 7. Separate generated and external code — machine-readably

Agents must know which files express product intent and which will be overwritten.

**Good:**

```
src/            # hand-written
generated/      # do not edit — regenerated by `make generate`
vendor/         # external
third_party/    # external
```

**Bad:**

```
src/hand-written.ts
src/generated-file.ts
src/copied-library-with-local-edits.ts   # worst of the three
```

**Directory convention alone is not enough.** An agent finds files by grep and may never
see the directory name. Make it visible at the point of contact:

- A `DO NOT EDIT — generated by X` header emitted by the generator itself
- `linguist-generated` in `.gitattributes` so diffs collapse
- Exclusion in lint / typecheck / formatter config
- Deny-globs in your agent's permission settings
- Ideally: **don't commit it.** Gitignore it and regenerate in `verify`. A file that isn't
  in the tree can't be hand-edited.
- A **drift gate**: regenerate in CI and fail if the output differs from what's committed.

Vendored code with local edits is the real hazard — it looks editable, is editable, and
silently loses the edits on the next update. Either fork it properly or patch it in a
build step.

---

## 8. One live implementation per concept

No `service.ts` beside `service-v2.ts` beside `service-old.ts`. No dead code kept "just in
case." No feature-flagged second implementation that outlived its rollout.

**Bad:**

```
src/checkout/checkout.ts
src/checkout/checkoutV2.ts        # which one runs?
src/checkout/checkout-legacy.ts   # is this reachable?
```

Ambiguity about which code path is live is the **single most expensive property** in an
agentic codebase, because it's a coin flip that produces confident, correct-looking edits
to code nobody runs — and the tests pass, because the dead path has tests too.

Git remembers. Delete it.

Watch for the degenerate case: a `V2` name with no surviving `V1`. Harmless to run,
actively misleading to read — it implies a predecessor the agent will go looking for.

**Enforce with:** a dead-code detector (`knip`, `ts-prune`, `vulture`, `deadcode`) in
`verify`, and a rule that flags version-suffixed filenames.

---

## 9. Consistency beats local optimality

Agents pattern-match hard on surrounding code. One mediocre approach used everywhere
produces better output than a superior approach used in 40% of the repo, because the
agent's prior is "do what the neighbors do."

Practical consequences:

- Migrations should be **finished**, not left at 60%. A half-migration is worse than either
  endpoint — it teaches both patterns simultaneously.
- If you must run two patterns during a transition, say so explicitly and say which one is
  the target, in the instruction file nearest the code.
- New conventions need a mechanical sweep, not a "use this going forward" note.

**Enforce with:** codemods for the sweep, and a lint rule banning the old pattern the day
the migration completes.

---

## 10. Keep files a size an agent can afford to read

Agents read whole files. A 3,000-line module means every change touching it pays for all
of it — and pushes out the context that would have made the change correct.

Rough thresholds, not laws: **under ~400 lines is comfortable; over ~800 deserves a
reason; over ~1,500 is a liability.** Applies to test files too — a 2,000-line test file
is read in full on every failure.

Splitting must follow principle 1: split by behavior (`create-order.ts` / `cancel-order.ts`),
not by role (`order-types.ts` / `order-impl.ts` / `order-helpers.ts`), or you've traded one
big read for four scattered ones and made it worse.

**Enforce with:** a lint rule with a per-file allowlist, so existing outliers are visible
and no new ones appear silently.

---

## Where to start on an existing codebase

Do not begin with principles 1 and 2. Those are expensive refactors with slow payoff.

| Order | Principle | Effort | Why first |
|---|---|---|---|
| 1 | **#4** — one command set, CI calls it | Days | Unlocks every other improvement; agents can self-verify |
| 2 | **#8** — delete dead and duplicate paths | Days | Removes coin flips; highest correctness-per-hour |
| 3 | **#3** — renames + kill the dumping grounds | Days | Cheapest retrieval win in the list |
| 4 | **#6** — colocate tests, enable single-test runs | Days–weeks | Tightens the inner loop |
| 5 | **#5 / #7** — lean instructions, mark generated code | Days | Prevents whole classes of wrong edits |
| 6 | **#2** — enforce boundaries you already have | Days | Cheap *if* the architecture is already sound |
| 7 | **#1 / #10** — restructure, split large files | Months | Apply to new modules first; migrate opportunistically |

Rule of thumb: anything you can do in a week, do to the whole repo. Anything that takes a
month, apply to new code and let the old code migrate as it's touched — a half-finished
restructure violates principle 9 and can leave you worse off than when you started.
