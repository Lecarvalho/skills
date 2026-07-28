# Scoring — overengineering mode

Ten principles, 0–10 each, **unweighted sum** = headline out of 100. The headline is a
**proportionality score**.

| Band | Range | Meaning |
|---|---|---|
| Proportionate | 8–10 | Structure is paid for by observed variation, or is absent because none exists |
| Tolerable | 6–7 | Some speculative structure, contained; a reader pays but survives |
| Overengineered | 0–5 | Structure imposes a real, recurring cost with no variation behind it |

**Polarity — read this before scoring anything.** High is good, exactly as in readiness
mode: **10 means proportionate, 0 means severely overengineered.** The template's palette
follows the same convention (green = strong = proportionate). Do not invert it, and do not
label the headline "overengineering score" — a high number would read backwards. Call it
**"Proportionality"** everywhere it appears.

## Discipline

**Score on the falsification test, not on taste.** For every deduction you must have run
the test — *name the variation this structure absorbs, point at where it occurred* — and
failed it. An interface with a second implementation is not a finding no matter how much
ceremony surrounds it. If you cannot say what the structure was speculating about, you
have an impression, not a score.

**Weight by heat.** Cross-reference every finding against the 12-month change list from
evidence step 0. A five-layer chain on a top-20 hot file is worth a 3; the same chain on
code untouched in a year is worth a 7 and a footnote. State the heat in the verdict line.

**Do not reward under-engineering.** A repo with no seams at all, heavy duplication, and
one giant module should not score 90. Where the sweeps surfaced genuine under-abstraction,
cap the affected principle at 8 and name it — a copy-paste codebase is proportionate to
nothing. The report must carry this as an explicit section, not a footnote.

**Age and kind change the bands.** A six-month-old repo with six services and four model
layers scores harder than a ten-year-old one that accreted them under real load. A
published library legitimately carries interfaces, options bags, and exported surface an
application would not — score P1, P4, and P10 leniently and say why in the report.

**Confidence.** P3, P6, P8, and P9 rest substantially on git history. With no history,
a shallow clone, or a squashed import, score those at 7 by default rather than guessing,
and state the limitation in the masthead — not only in the footer.

**Use the full range.** Most production repos land 55–80 here. Below 40 means the
structure actively obstructs the work being done in it. Above 85 is a genuinely lean
codebase and is uncommon in anything mature — if you are handing out 9s across the board,
check whether you ran the sweeps or just read the directory names.

## Per-principle anchors

### P1 — Abstractions have more than one occupant
- **10** Every interface/abstract type has 2+ real implementations, or the seam simply isn't there yet
- **8** One or two single-occupant interfaces, on cold paths or with a named second implementation in flight
- **6** A visible habit — several one-implementation interfaces, factories returning a single type
- **4** Interface-per-class as the default convention; a `providers/` directory with one provider
- **2** Full factory + registry + strategy machinery over a single concrete behavior

### P2 — Indirection carries logic
- **10** Every hop decides, transforms, guards, or adapts; the core write path is 2–3 files
- **8** One pass-through layer, consistent and shallow
- **6** 4–5 files to follow one operation, 2 of them pure delegation
- **4** `Thing → ThingImpl → ThingHelper → ThingUtil` chains on the primary paths
- **2** 6+ files per operation, most adding nothing; stack traces are mostly first-party frames

### P3 — Configuration is actually configured
- **10** Every flag has an observed non-default value somewhere; no homegrown DSL
- **8** A couple of frozen flags; environment files genuinely differ
- **6** Many options, a minority ever varied; per-environment files are near-copies
- **4** A configuration layer nobody configures — most values unchanged since introduction
- **2** A homegrown DSL or rules engine written and edited exclusively by the engineers who edit the source

### P4 — Generality has a second caller
- **10** Parameters vary; generics instantiated at multiple types; no in-repo framework without consumers
- **8** One or two unused parameters; otherwise justified
- **6** Options bags where callers pass a single shape; a generic or two at one type
- **4** Speculative parameterization is the house style
- **2** An in-repo `core`/`platform`/`framework` package with one consumer and its own abstractions

### P5 — Infrastructure matches load
- **10** Deployables, queues, and caches each traceable to measured load or a real boundary
- **8** Slightly ahead of demand, but the seams are cheap and the reasoning is written down
- **6** Eventing where direct calls would do — most events have exactly one subscriber
- **4** More services than teams; caches with no measured hit rate; no benchmark anywhere
- **2** Distributed architecture at trivial traffic — partial-failure semantics owned for no gain

### P6 — Change is local
- **10** Ordinary changes land in 1–2 files plus a test; propagation ratio near zero
- **8** Occasional propagation, confined to one boundary
- **6** Propagation ratio around 0.5 — half of a typical commit is mechanical
- **4** A one-field change touches 6+ files across 4 layers, repeatedly
- **2** As above, **plus** live evidence of people routing around the architecture (a "temporary" bypass over a year old)

### P7 — Data models transform
- **10** One representation per genuine boundary; every hop has real field differences
- **8** One redundant hop, or a mapper layer that mostly earns its keep
- **6** 3 representations with 2 near-identical hops
- **4** 4+ representations, mappers field-for-field, new fields propagate through all of them
- **2** As above, with hand-written mappers where an omission fails silently

### P8 — Ceremony pays for itself
- **10** Adding a trivial feature creates 1–2 files; tests assert behavior
- **8** Some wiring boilerplate; behavior tests dominate
- **6** 3–4 files per trivial feature; delegation-asserting tests are a visible minority
- **4** 5–6 files with one line of real logic between them; mock-verification dominates the suite
- **2** As above, plus DI registration for single-construction objects and undecipherable annotation stacks

### P9 — Abstractions factor along the real axis
- **10** New cases arrive as new files; contracts are stable in history
- **8** One abstraction showing strain; the rest absorb change cleanly
- **7** *Default when git history is unavailable* — say so
- **6** A base type edited noticeably more often than expected; a couple of capability flags
- **4** Contracts edited about as often as their implementations; `supportsX()` per implementation
- **2** "Generic" handlers branching on concrete type; every new case edits the shared contract and every sibling

### P10 — Surface is reachable
- **10** Dead-code detection runs in verify and is clean; no dormant flags or unused hooks
- **8** A handful of unreachable exports; flags retired promptly
- **6** Noticeable dead surface — unused hooks, a few year-old flags at 100%
- **4** Large unreachable regions; extension points nothing extends; no detection tooling
- **2** A whole subsystem built for a use case that never shipped, still maintained and read

## Ordering the remediation list

Rank by **payoff per hour**, not by severity. Deletion is cheap, reversible, and shrinks
everything downstream, so it leads. The ordering that usually holds:

1. Delete unreachable code and retire dormant flags *(hours — pure subtraction, zero risk)*
2. Inline never-varied configuration into constants *(hours — removes phantom branches)*
3. Collapse single-occupant interfaces *(hours–days — IDE inlining does most of it)*
4. Drop unused parameters and single-type generics *(hours)*
5. Collapse pass-through hops on the hot paths only *(days — biggest comprehension win)*
6. Merge identical model representations *(days — directly fixes the propagation ratio)*
7. Replace delegation-assertion tests with behavior tests *(days — do it alongside 5 and 6)*
8. Re-cut one wrong-axis abstraction along the observed change axis *(weeks — one at a time)*
9. Recombine services / remove premature infrastructure *(weeks–months — **defer**, needs a migration plan)*

Two constraints on the list, both worth stating in the report:

- **Deletions apply repo-wide; re-cuts apply one at a time.** A half-collapsed abstraction
  teaches both shapes at once and is worse than either endpoint.
- **Nothing here is a rewrite.** If the list reads as "restructure the codebase," it has
  drifted from the evidence. Every row should trace to a counted finding.
