# Evidence sweeps — overengineering mode

Run these against the target repo. Batch several per tool call. Everything here is
read-only.

Set once:

```bash
REPO=/path/to/repo          # git-bash path form on Windows: /c/Workspace/repos/Foo
```

`find` won't expand exclusions from a variable — they're pasted inline below for that
reason. Adjust the source extensions (`*.ts *.tsx *.cs`) to the target's languages.

**Two things make this rubric different from the readiness sweeps, and both are
load-bearing:**

1. **Git history is primary evidence, not a cross-check.** Speculation is invisible in a
   snapshot and obvious in history. If the repo has no git history, say so up front —
   principles 3, 6, 8, and 9 drop to low confidence and the report must state that.
2. **Every finding must survive the falsification test** — *name the variation this
   structure absorbs and point at where it occurred.* Each sweep below ends with the
   counter-check that runs that test. Do not report a finding that skipped it.

---

## 0. Orient, and size the denominator

```bash
cd "$REPO" && ls -la && sed -n '1,40p' README.md 2>/dev/null
find . -maxdepth 3 -type d -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/dist/*" | sort
```

Count source files and total source lines — every later ratio is read against these:

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" \
  -o -name "*.go" -o -name "*.cs" -o -name "*.rb" -o -name "*.java" -o -name "*.rs" \) \
  -not -path "*/node_modules/*" -not -path "*/bin/*" -not -path "*/obj/*" \
  -not -path "*/dist/*" -not -path "*/vendor/*" | wc -l
```

**Establish heat before scoring anything.** Nearly every principle is weighted by it:

```bash
git log --since="12 months ago" --name-only --pretty=format: \
  | grep -v '^$' | sort | uniq -c | sort -rn | head -30
```

Keep that list. A structure sitting on a top-20 file scores hard; the same structure on a
file untouched in a year is a footnote. Also record the repo's age and commit count —
a six-month-old repo with five layers is a different (and more serious) finding than a
ten-year-old one that accreted them.

**Determine the repo's kind, because it changes what's legitimate:**

```bash
grep -nE '"(name|main|types|exports|private)"' package.json 2>/dev/null | head
ls *.csproj *.nuspec setup.py pyproject.toml go.mod 2>/dev/null
```

A published library with external consumers legitimately carries interfaces, options, and
extension points that an application would not. State which kind you concluded and why.

---

## P1 — Abstractions have more than one occupant

```bash
# Declared abstractions
grep -rnE "^\s*(export\s+)?(public\s+)?(interface|abstract class|protocol)\s+\w+" \
  --include="*.ts" --include="*.cs" --include="*.java" --include="*.go" \
  . 2>/dev/null | grep -v node_modules | head -60

# Python protocols / ABCs
grep -rnE "class \w+\((ABC|Protocol)\)|@abstractmethod" --include="*.py" . | head -40

# Factory / registry / strategy machinery
find . -type f \( -name "*factory*" -o -name "*registry*" -o -name "*strategy*" \
  -o -name "*provider*" -o -name "*plugin*" \) -not -path "*/node_modules/*" \
  -not -path "*/bin/*" -not -path "*/obj/*" | sort
```

Then, for each abstraction that looks structural, **count its implementations**:

```bash
grep -rn "implements PaymentProvider\|: PaymentProvider\b" --include="*.ts" . \
  | grep -v node_modules
```

**The counter-check (mandatory).** For every single-occupant abstraction, before reporting
it, verify there is no second implementation coming:

```bash
grep -rniE "TODO|FIXME|coming soon|will implement|second provider" \
  --include="*.md" --include="*.ts" --include="*.cs" . | grep -v node_modules | head -20
git log --oneline -15 -- path/to/the-interface-file
```

Also check whether the *only* other user is a test double:

```bash
grep -rn "PaymentProvider" --include="*.test.*" --include="*Tests.*" . | wc -l
```

**Report:** total declared abstractions, how many have exactly one implementation, the
paths of the worst offenders, and whether each is on a hot file from step 0.

---

## P2 — Indirection carries logic

Pick **one ordinary operation** — the most common write path in the product — and walk it
from entry point to persistence, listing every file in order. This is a reading exercise,
not a grep; do it properly, it produces the single most legible finding in the report.

Helpers for finding the chain and the naming tells:

```bash
find . -type f \( -name "*Impl.*" -o -name "*-impl.*" -o -name "*Wrapper.*" \
  -o -name "*Delegate.*" -o -name "*Facade.*" \) -not -path "*/node_modules/*" | sort

# Methods whose whole body is a single delegating call — the pass-through signature
grep -rnB1 -A2 -E "^\s*(public |export |async )?\w+\([^)]*\)[^{]*\{\s*$" \
  --include="*.ts" --include="*.cs" . 2>/dev/null | grep -v node_modules | head -40
```

The reliable measurement is manual: for the chosen operation, state **"N files to follow
one write; M of them add no decision"**, and list them in call order with paths. Classify
each hop as: decides / transforms / guards / adapts / **pass-through**.

**The counter-check.** A hop that looks like a pass-through may be a real boundary — an
anti-corruption layer, or a dependency inversion the compiler enforces. Open it and
confirm it carries nothing before counting it.

---

## P3 — Configuration is actually configured

```bash
find . -type f \( -name "*.env*" -o -name "config*.y*ml" -o -name "appsettings*.json" \
  -o -name "settings*.py" -o -name "config*.ts" -o -name "config*.json" \) \
  -not -path "*/node_modules/*" | sort
grep -rnE "process\.env\.|os\.environ|Configuration\[|getenv\(" --include="*.ts" \
  --include="*.py" --include="*.cs" --include="*.go" . | grep -v node_modules | wc -l
```

For each flag, the question is whether a **non-default value is set anywhere**. Compare
environment files against each other — that comparison is the whole measurement:

```bash
# Do the per-environment files actually differ, or are they copies?
diff config/staging.yml config/production.yml 2>/dev/null
```

**History is the decisive evidence.** A value unchanged since introduction is a constant:

```bash
git log --oneline --follow -- config/defaults.yml | tail -5   # is the last change the first?
git log -S"retry.strategy" --oneline | head
```

Then check for the heavier version — a homegrown DSL or rules engine:

```bash
find . -type d \( -name "rules" -o -name "dsl" -o -name "policies" \) | grep -v node_modules
find . -name "*.rules" -o -name "*.dsl" | grep -v node_modules
```

If found, **check who edits it**. Same authors as the source means it should have been code:

```bash
git log --format="%an" -- rules/ | sort | uniq -c | sort -rn
git log --format="%an" -- src/ | sort | uniq -c | sort -rn
```

**Report:** number of flags, number with an observed non-default value, and the names of
the frozen ones. If a DSL exists, report its author overlap as a percentage.

---

## P4 — Generality has a second caller

```bash
# Options-bag signatures
grep -rnE "\(\s*\w+:\s*\w+,\s*(options|opts|config|params)\??:" --include="*.ts" \
  --include="*.tsx" . | grep -v node_modules | head -30

# Generic types — then check how many types they're instantiated at
grep -rnE "(class|interface|function|type)\s+\w+<[A-Z]\w*(\s*,\s*[A-Z]\w*)*>" \
  --include="*.ts" --include="*.cs" --include="*.java" . | grep -v node_modules | head -30

# In-repo "framework" packages
ls packages/ libs/ src/core/ src/platform/ src/framework/ src/common/ 2>/dev/null
```

For each candidate, **count distinct call sites and distinct argument shapes**:

```bash
grep -rn "renderReport(" --include="*.ts" . | grep -v node_modules
grep -rn "Repository<" --include="*.ts" . | grep -v node_modules | grep -oE "Repository<\w+>" | sort | uniq -c
```

One argument shape across many callers is still one shape. For an in-repo framework
package, count *importers outside the package*:

```bash
grep -rn "from '@app/core\|from \"../core\|import.*core/" --include="*.ts" . \
  | grep -v node_modules | grep -v "^./src/core" | cut -d: -f1 | sort -u | wc -l
```

**Report:** per construct — call sites, distinct shapes, unused parameters by name.

---

## P5 — Infrastructure matches load

```bash
# How many deployables?
find . -name "Dockerfile*" -o -name "docker-compose*.y*ml" -o -name "*.csproj" \
  -o -name "serverless.y*ml" | grep -v node_modules | sort
ls k8s/ helm/ charts/ deploy/ infra/ terraform/ 2>/dev/null

# Queues, buses, caches
grep -rniE "rabbitmq|kafka|sqs|servicebus|pubsub|redis|memcached|celery|sidekiq|\
eventbus|mediatr|masstransit" --include="*.json" --include="*.ts" --include="*.cs" \
  --include="*.py" --include="*.yml" --include="*.toml" . 2>/dev/null \
  | grep -v node_modules | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

**The decisive measurement for eventing — subscribers per event.** Take each published
event type and count handlers:

```bash
grep -rn "OrderCreated" --include="*.ts" --include="*.cs" . | grep -v node_modules
```

Zero or one subscriber means the event is a function call with extra steps and no stack
trace. Report the distribution: how many event types have 0, 1, or 2+ subscribers.

**The counter-check — look for the justification before scoring.** Distribution is
legitimate when something measured demanded it:

```bash
grep -rniE "benchmark|load test|p95|p99|throughput|rps|incident|postmortem|SLA" \
  --include="*.md" . | grep -v node_modules | head -20
find . -iname "*benchmark*" -o -iname "*loadtest*" -o -iname "*perf*" | grep -v node_modules
```

If you find a benchmark or a postmortem motivating the architecture, quote it and score
the principle high. Absence of any such artifact alongside heavy infrastructure is the
finding. Also compare service count to contributor count:

```bash
git log --format="%an" --since="12 months ago" | sort -u | wc -l
```

---

## P6 — Change is local  *(the strongest signal in the rubric)*

```bash
# Files per commit, recent history
git log --since="6 months ago" --pretty=format:"%h %s" --name-only \
  | awk '/^[0-9a-f]{7} /{if(n)print n" "h; h=$0; n=0; next} NF{n++} END{if(n)print n" "h}' \
  | sort -rn | head -30
```

Then take **10–20 non-trivial commits** — prefer ones whose message describes adding a
field, an endpoint, or a small feature — and inspect them individually:

```bash
git show --stat <sha>
```

For each, classify every file as **carrying the change** or **propagating it** (a field
added to a DTO, an interface, a mapper, a view model). Compute the propagation ratio:
mechanical files ÷ total files, averaged across the sample.

Find the corroborating admission — the codebase documenting its own friction:

```bash
grep -rniE "temporary|for now|bypass|shortcut|hack|workaround|skip the (layer|service)|\
going around|TODO: (remove|refactor)" --include="*.ts" --include="*.cs" --include="*.py" \
  . 2>/dev/null | grep -v node_modules | head -25
```

Then check the age of those comments — a "temporary" from two years ago is the quote that
belongs in the report's blockquote:

```bash
git log -1 --format="%ai" -S"temporary workaround" -- path/to/file
```

**Report:** the propagation ratio, 2–3 named commits with their file lists, and the
strongest self-documenting quote with its age.

---

## P7 — Data models transform

```bash
# Find model chains for one core entity
find . -type f -iname "*order*" -not -path "*/node_modules/*" -not -path "*/bin/*" \
  -not -path "*/obj/*" | sort
grep -rn "class OrderDto\|class OrderEntity\|class Order\b\|OrderViewModel\|OrderResponse\|\
OrderRequest\|OrderModel" --include="*.ts" --include="*.cs" --include="*.py" . \
  | grep -v node_modules

# Mappers and profiles
find . -type f \( -iname "*mapper*" -o -iname "*mapping*" -o -iname "*profile*" \
  -o -iname "*adapter*" -o -iname "*converter*" \) -not -path "*/node_modules/*" | sort
grep -rn "AutoMapper\|MapStruct\|class-transformer\|CreateMap(" --include="*.cs" \
  --include="*.ts" --include="*.java" . | grep -v node_modules | head
```

**Then open the models and diff the field lists by hand.** This is the measurement:
representations of the entity, and how many field differences exist between adjacent
hops. Report it as **"N representations of Order, M mappers, K field differences"**.

**The counter-check.** A layer with real field differences is doing its job — an API model
hiding internal IDs, a persistence model shaped by the schema, a view model with derived
display fields. Only identical or near-identical hops are findings. Say which hops you
cleared and why.

---

## P8 — Ceremony pays for itself

```bash
# DI registrations vs. the classes they wire
grep -rnE "services\.Add(Scoped|Transient|Singleton)|container\.(register|bind)|\
@Injectable|@Component|providers:\s*\[" --include="*.cs" --include="*.ts" \
  --include="*.java" --include="*.py" . | grep -v node_modules | wc -l

# Tests that assert delegation rather than behavior
grep -rncE "toHaveBeenCalled|Verify\(|verify\(|assert_called|\.Received\(" \
  --include="*.test.*" --include="*Tests.*" --include="test_*.py" . \
  | grep -v node_modules | grep -v ":0$" | sort -t: -k2 -rn | head -20
```

Compare that against tests asserting a returned value or a state change — the ratio is the
finding. A suite where mock-verification dominates is testing wiring.

**The per-feature checklist — measure it from history.** Find the most recent small
feature and list every file it created:

```bash
git log --diff-filter=A --name-only --pretty=format:"%h %s" --since="6 months ago" \
  | head -60
git show --stat <sha-of-a-small-feature>
```

**Report:** files created per trivial feature, and the ratio of decision-carrying lines to
declaration/wiring lines within them.

---

## P9 — Abstractions factor along the real axis

For each significant abstraction found in P1, ask history how often the **contract itself**
changed relative to its implementations:

```bash
git log --oneline --follow -- src/exports/exporter.ts | wc -l          # the base/interface
git log --oneline --follow -- src/exports/pdf-exporter.ts | wc -l      # an implementation
git log --oneline --follow -- src/exports/csv-exporter.ts | wc -l
```

A base type edited about as often as its subtypes is cut across the grain: new cases are
*modifying* the abstraction rather than being absorbed by it. Read the commit subjects on
the base file — if they name new features (`add charts support`, `add paging`), that is
conclusive, and the subjects belong in the report verbatim.

Corroborate in the code — a "generic" abstraction that branches on concrete type:

```bash
grep -rnE "instanceof |typeof \w+ ===|is [A-Z]\w+\)|switch\s*\(\s*\w+\.(type|kind)" \
  --include="*.ts" --include="*.cs" . | grep -v node_modules | head -25
```

Also count capability flags on the contract — `supportsX()`, `canY()`, `isZ` — one per
implementation is the classic wrong-axis signature.

**Report:** the abstraction, its base-vs-implementation edit counts, and which axis the
changes actually fall along. The recommendation is **re-cut**, not delete — say so.

---

## P10 — Surface is reachable

```bash
# Dead code / dead exports — the hard number
grep -rn "knip\|ts-prune\|vulture\|deadcode\|unimport\|unused" package.json Makefile \
  pyproject.toml .github/workflows/ 2>/dev/null | head
npx knip --no-progress 2>/dev/null | tail -40        # if TS/JS and available
npx ts-prune 2>/dev/null | head -40
vulture . 2>/dev/null | head -40                      # if Python and available
```

If no tool is available, approximate by sampling exports and grepping for importers.

```bash
# Feature flags — is the second branch live?
grep -rnE "isEnabled\(|featureFlag|LaunchDarkly|\bflags?\.\w+|unleash|toggle" \
  --include="*.ts" --include="*.cs" --include="*.py" . | grep -v node_modules | head -30

# Extension points with no registrations
grep -rnE "beforeEach\w*Hook|onBefore|onAfter|addHook|registerHook|\bhooks?\.\w+ =" \
  --include="*.ts" --include="*.py" . | grep -v node_modules | head -20

# Directories nothing imports
for d in $(find src -maxdepth 2 -type d 2>/dev/null); do
  n=$(grep -rl "$(basename $d)/" --include="*.ts" src 2>/dev/null | grep -v "^$d" | wc -l)
  echo "$n $d"
done | sort -n | head -15
```

**The counter-check.** In a published library, exports are the product — do not report
them as dead. Confirm the repo kind from step 0 first. And check that an untouched
directory is genuinely unreferenced rather than reached by dynamic loading, reflection, or
a route table:

```bash
grep -rnE "require\(|import\(|importlib|Activator.CreateInstance|getattr\(" \
  --include="*.ts" --include="*.py" --include="*.cs" . | grep -v node_modules | head -20
```

**Report:** unreachable export count, dead flags with their age, and the largest
unreachable subsystem by line count — that last one is usually the report's single
biggest cheap win.

---

## Assembling the report

Two things must appear in every overengineering report, and they are easy to forget:

- **The under-engineering note.** While running these sweeps you will also see genuine
  duplication, missing seams, and copy-paste. Record it. The report includes it as an
  explicit counterweight so the recommendation is *proportionality*, not minimalism.
- **The confidence statement.** Say which principles rest on history (3, 6, 8, 9) and
  what the history depth was. A shallow clone or a squashed-import repo makes those scores
  provisional and the report must say so.
