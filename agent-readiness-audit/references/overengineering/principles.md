# Proportionate Code — Overengineering Principles

Principles for judging whether a codebase's structure is **paid for by the work it
actually does**.

**The definition this rubric measures.** Overengineering is structure whose cost is paid
now but whose benefit is contingent on a future that hasn't arrived. Two things separate
it from good design:

1. **The abstraction serves a requirement that doesn't exist.** Not *might* exist —
   flexibility for a real, near-term, known requirement is just engineering. Overengineering
   is flexibility for a hypothetical.
2. **It makes the common case harder to read or change.** Every layer, interface, and
   configuration point is a tax on comprehension. If it doesn't buy back more than it
   costs on the changes people actually make, it is a net loss.

The useful reframe: overengineering is not "too much code," it is **misallocated
optionality.** Someone bought the ability to vary something that never varies, and paid
for it by making the things that *do* vary harder to touch.

---

## The falsification test — apply it to every finding

> **Name the concrete variation this structure absorbs, and point at where it occurred.**

If you can name it and point at it, the structure is earning its keep, whatever it looks
like. If you cannot, it is speculative — and *that*, not line count or indirection depth,
is the finding. Never report a structure as overengineered without having run this test
and failed it. Say so in the finding: "one implementation, no second in the tree, none in
open issues or TODOs."

## The three costs

Every principle below serves exactly one. They have very different urgency:

| Cost | Principles | Severity |
|---|---|---|
| **Comprehension tax** — hops and files between the reader and the actual work | 2, 6, 7, 8 | **Highest.** Paid on every read, by everyone, forever |
| **Speculative optionality** — machinery built for variation that never came | 1, 3, 4, 10 | Moderate; mostly dead weight, occasionally a trap |
| **Structural misfit** — the seam is in the wrong place, or at the wrong scale | 5, 9 | High; every new case fights the design |

## Two rules that outrank all ten

**Weight by heat, not by size.** Optionality in code nobody touches is nearly free.
Friction on the hottest change path is what actually costs. Before scoring hard, check
`git log` — a five-layer abstraction over a module edited twice in two years is a note;
the same abstraction on a weekly-edited path is the headline.

**This rubric does not reward under-engineering.** Copy-paste everywhere, no seams, one
4,000-line function with every case inlined — that is the opposite failure and it is just
as expensive. The question is never "is this abstract?" but "does the variation this
abstraction anticipates actually occur?" A repo with no abstractions at all should not
score 100. Where you find genuine under-abstraction, say so explicitly in the report —
the scorecard is a proportionality measure, not a minimalism contest.

---

## 1. Abstractions have more than one occupant

An interface, abstract base class, protocol, strategy, or factory exists to let two or
more things vary behind one name. With one implementation, the name is the only thing it
adds — and the reader pays a hop to discover that.

**Bad** — the shape to look for:

```
src/payments/
  payment-provider.ts        # interface
  stripe-payment-provider.ts # the only implementation
  payment-provider-factory.ts# returns the only implementation
```

**Good** — either a second occupant exists, or the interface doesn't:

```
src/payments/
  stripe-payment.ts          # called directly; no seam until a second provider is real
```

**Test doubles do not count as a second implementation.** "We need it to mock" is a claim
about the test framework, not about the domain. Most modern languages mock concrete types
fine; where they genuinely cannot, the interface is justified — say so and don't penalize
it, but check whether the mock is really the only other user.

**A registry with one entry is the same finding, louder.** A `providers/` directory
containing one provider, a plugin loader with one plugin, a strategy map with one key.

**Where it's legitimate:** a published library whose consumers supply implementations; a
plugin surface that *is* the product; a seam with a scheduled, named second implementation
already in flight. Check for these before scoring.

**Measure it:** count declared interfaces/abstract types, then count implementations of
each. Report the ratio and name the single-occupant ones with paths.

---

## 2. Indirection carries logic

Every hop between a caller and the work should do something: decide, transform, guard, or
adapt. A hop that renames arguments and delegates is pure comprehension tax.

**Bad:**

```
OrderController.create()
  → OrderService.create()          # calls the next one
    → OrderServiceImpl.create()    # calls the next one
      → OrderHelper.doCreate()     # calls the next one
        → OrderRepository.insert() # the actual work
```

**Good** — fewer hops, each earning its place:

```
OrderController.create()           # parses HTTP, validates shape
  → createOrder()                  # applies the policy, the real decision
    → orders.insert()              # persists
```

**The measurement that matters:** take one ordinary operation and count the files you must
open to follow it end to end, and how many of those add no logic. **Five files where four
are pass-throughs** is the finding — state it exactly that way, with the paths in order.

Watch for the naming tell: `Thing` → `ThingImpl` → `ThingHelper` → `ThingUtil` chains, and
stack traces where a dozen consecutive frames are all first-party.

**Where it's legitimate:** an anti-corruption layer at a genuine system boundary; a
delegation that exists to invert a dependency the compiler actually enforces.

---

## 3. Configuration is actually configured

Every flag, option, and setting is a branch someone must reason about. A setting that has
never held a non-default value is a branch bought and never used.

**Bad:**

```yaml
# config/defaults.yml — every one of these is still at its introduced value
retry.strategy: exponential    # no other value has ever been set
cache.backend: memory          # the only backend implemented
export.format: json            # the only format implemented
```

**Good:** the value is a constant in the code until a second value is genuinely needed.

**The check:** for each flag, find where a non-default value is set — another environment
file, a deployment manifest, a test, anything. No such site means the flag is a constant
wearing a costume. Version history is the tiebreaker: a value unchanged since the commit
that introduced it is the strongest evidence available.

**The heavier version — a homegrown DSL or rules engine.** Rules in YAML, JSON, or a
custom expression language, edited exclusively by the same team that edits the code, are
strictly worse than code: no type checking, no debugger, no refactoring tools, and a
parser to maintain. A DSL earns its keep only when a *different* audience — ops,
compliance, customers — actually writes the rules. Check who edits those files in
`git log`; if it's the same three engineers who edit the source, that's the finding.

**Where it's legitimate:** flags that vary per environment (they do hold different values
— check prod vs staging config); kill switches for genuine incidents; anything a customer
sets.

---

## 4. Generality has a second caller

Parameterization is justified by callers, not by imagination.

**Bad:**

```ts
// One call site, which passes exactly one shape
function renderReport(data: Data, opts: {
  format?: 'pdf' | 'html' | 'csv'   // only 'pdf' is ever passed
  locale?: string                    // only 'en' is ever passed
  theme?: Theme                      // never passed
}) { ... }
```

**Good:** the parameters that vary are parameters; the rest are inlined until they vary.

**Three specific shapes:**

- **Options bags where callers pass one shape.** Grep the call sites; if every one passes
  the same object, the options are constants.
- **Generic type parameters instantiated at exactly one type.** `Repository<T>` where `T`
  is always `Order` is a rename of `OrderRepository` plus a comprehension cost.
- **In-repo "framework" code with one consumer.** A `core/`, `platform/`, or `framework/`
  package built for reuse that nothing outside the one caller reuses. This is the most
  expensive version, because it is usually also the code most resistant to change.

**Measure it:** for each generic/parameterized construct, count distinct call sites and
distinct argument shapes. One shape across N callers is still one shape.

---

## 5. Infrastructure matches load

Distribution, queueing, caching, and eventing are bought with permanent operational and
debugging cost. They must be paid for by measured load or a measured failure, not by an
architecture diagram.

**Bad:**

```
6 services · 3 queues · a service mesh · 40 requests/minute
```

Now every change needs a coordinated deploy, every bug is a distributed-tracing exercise,
and you own partial-failure semantics you never needed.

**Good:** one deployable until something measured says otherwise; the seams (module
boundaries) drawn so that splitting later is possible, without splitting now.

**What to look for:**

- Service count versus team count versus actual traffic. More services than teams is a
  strong signal.
- Message queues, event buses, or pub/sub where a direct call would do — the tell is that
  nobody can answer "what happens when `OrderCreated` fires?" without grepping the whole
  repo for subscribers. Count subscribers per event; **zero or one subscriber is a
  function call wearing a costume.**
- Caches with no measured hit rate, no stated invalidation rule, and no benchmark that
  motivated them. An unmeasured cache is a correctness risk bought for an unknown gain.
- Kubernetes, sharding, read replicas, or CQRS on a dataset that fits in memory.

**Where it's legitimate:** measured load, a real compliance or isolation boundary,
independent deploy cadence between teams that genuinely exists. Look for the benchmark,
the incident, or the requirement — and quote it if you find it.

---

## 6. Change is local

This is the behavioral principle, and the strongest signal in the rubric, because it is
measured on what the repo *did* rather than on how it looks.

**The measurement:** take the last 10–20 non-trivial commits. For each, count files
touched and classify them: files carrying the actual change versus files that only
propagate it — a field added to a DTO, then to the entity, then to the mapper, then to the
view model, then to two interfaces.

**Bad:** adding one field touches 8 files across 4 layers, 7 of them mechanical.

**Good:** the change lands in one or two files, plus a test.

Report the **propagation ratio** — mechanical files over total files touched — across the
sample, with two or three named commits as evidence. A ratio above ~0.5, repeatedly, means
the layers are not earning their keep.

**Two corroborating signals:**

- **People route around the architecture.** A direct call that skips the layers, with a
  comment calling it temporary, still there a year later. That is the codebase's own
  admission — quote it.
- **Onboarding questions are about structure, not domain.** Hard to measure from the tree,
  but if the docs are mostly "how the layers work" rather than "what the product does,"
  that is the same signal.

---

## 7. Data models transform

A model exists at a boundary to *change* something: shape, vocabulary, trust level,
visibility. A model that is field-for-field identical to the one beside it is a copy with
a mapper attached.

**Bad:**

```
OrderDto      { id, customerId, total, status }   # identical
OrderEntity   { id, customerId, total, status }   # identical
Order         { id, customerId, total, status }   # identical
OrderViewModel{ id, customerId, total, status }   # identical
+ three mappers, all of them field-for-field
```

**Good:** the layers that genuinely differ have their own model; the ones that don't share
one.

The cost is exactly principle 6's: every new field is a five-file change with no decision
in any of them. And the mappers accumulate quiet bugs, because a field forgotten in one of
five hand-written mappers fails silently.

**Measure it:** find the model chains, compare field lists, and report how many of the
hops are pure renames. **"Four representations of Order, three mappers, zero field
differences"** is the finding.

**Where it's legitimate:** a genuine trust boundary (never let an API-shaped object reach
the database layer); a public API contract that must stay stable while the domain moves;
a persistence model constrained by the schema. Each of these produces *actual field
differences* — that's how you tell.

---

## 8. Ceremony pays for itself

Boilerplate required per new case is a tax charged on every future feature.

**What to look for:**

- **DI container wiring for objects constructed in one place.** A container registration,
  a lifetime scope, and an interface — for a class instantiated exactly once. `new` was
  the whole feature.
- **Tests that assert delegation.** `expect(repo.save).toHaveBeenCalled()` on a service
  whose only job is to call `repo.save` verifies the wiring, not the behavior. A test
  suite dominated by these is evidence that the code is mostly plumbing — and the tests
  will need rewriting on any refactor while catching no bug.
- **The per-feature checklist.** Count the files that must be created to add one trivial
  new endpoint, command, or handler. Six files with one line of real logic between them is
  a finding, and it is the one most likely to be recognized immediately by the team.
- **Annotation, decorator, or attribute stacks** whose combined effect nobody can state.

**Measure it:** find the most recently added feature in `git log`, list every file it
created, and report the ratio of decision-carrying lines to declaration lines.

---

## 9. Abstractions factor along the real axis

The most consequential failure in the rubric, and the subtlest: the seam exists, but it is
cut across the grain of how the code actually changes.

**The tell:** the abstraction is *modified* every time a new case arrives, instead of
absorbing it. A base class that gains a method per subclass. An interface that grows a
flag per implementation. A "generic" handler with a `switch` on type inside it.

```ts
abstract class Exporter {
  abstract toPdf(): Buffer      // only PdfExporter implements meaningfully
  abstract toCsv(): string      // only CsvExporter does
  abstract supportsCharts(): boolean   // added when charts arrived
  abstract supportsPaging(): boolean   // added when paging arrived
}
```

Every new capability edits the shared contract and forces every implementation to change.
The variation is real, but the seam was cut in the wrong place.

**Good:** new cases arrive as new files, and nothing existing changes. That is the
definition of a correct seam, and it is directly observable in history.

**Measure it:** for each significant abstraction, ask git how often the base/interface file
itself was modified relative to its implementations. A base type edited as often as its
subtypes is factored along the wrong axis. `git log --follow` on the interface file, and
the commit messages, usually make this obvious in one look.

This principle is where the report should be most careful: the fix is rarely "delete the
abstraction," it is "re-cut it." Say which axis the changes actually fall along.

---

## 10. Surface is reachable

Code that cannot be reached, or extension points nothing extends, are pure cost — they
look live, they get maintained, they get read.

**What to look for:**

- **Extension points nothing extends** — hooks, lifecycle callbacks, `beforeX`/`afterX`
  slots, event handlers with no registrations.
- **Public API nobody outside calls.** In a non-library repo, `export` is not
  documentation — it is a claim of external use. Run a dead-export detector.
- **Feature flags whose second branch is dead.** A flag at 100% for a year is two code
  paths, one of which is fiction, and it is a principle-8-of-the-other-rubric coin flip on
  top.
- **"Just in case" parameters, hooks, and abstract methods** with no caller.
- **Whole subsystems built for a use case that never shipped.** These are usually
  discoverable by an untouched directory with no inbound imports.

**Measure it:** a dead-code / dead-export tool (`knip`, `ts-prune`, `vulture`, `deadcode`,
`unused`) gives a hard number. Report the count and name the largest unreachable
subsystem. Cross-check against `git log` — unreachable *and* untouched for a year is an
unambiguous delete.

Git remembers. The remediation for this principle is almost always deletion, which makes
it the cheapest points on the board.

---

## Where to start on an overengineered codebase

Deletion first — it is cheap, reversible via git, and it makes every later judgment easier
by shrinking what has to be understood.

| Order | Principle | Effort | Why first |
|---|---|---|---|
| 1 | **#10** — delete unreachable code and dead flags | Hours | Pure subtraction, zero risk, shrinks the problem |
| 2 | **#3** — inline never-varied config into constants | Hours | Removes branches nobody reasons about correctly |
| 3 | **#1** — collapse single-occupant interfaces | Hours–days | Mechanical; IDE inlining does most of it |
| 4 | **#4** — drop unused parameters and one-type generics | Hours | Same shape as #1, smaller blast radius |
| 5 | **#2** — collapse pass-through hops | Days | Real comprehension win; do the hot paths only |
| 6 | **#7** — merge identical model chains | Days | Directly fixes the propagation ratio in #6 |
| 7 | **#8** — delete delegation tests; cut per-feature boilerplate | Days | Frees the tests to be rewritten as behavior tests |
| 8 | **#9** — re-cut abstractions along the observed change axis | Weeks | Needs judgment; do one, learn, then the next |
| 9 | **#5** — recombine services / remove premature infrastructure | Weeks–months | **Defer.** Highest risk in the list; needs a migration plan |

Rule of thumb, inverted from the usual: **do the deletions to the whole repo, and the
re-cuts one at a time.** A half-collapsed abstraction is worse than either endpoint — it
teaches both shapes at once, and the next person has to learn which half is current.
