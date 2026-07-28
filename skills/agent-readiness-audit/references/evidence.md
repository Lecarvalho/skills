# Evidence sweeps

Run these against the target repo. Batch several per tool call. Everything here is
read-only.

Set once:

```bash
REPO=/path/to/repo          # git-bash path form on Windows: /c/Workspace/repos/Foo
PRUNE='-not -path "*/node_modules/*" -not -path "*/bin/*" -not -path "*/obj/*"
       -not -path "*/dist/*" -not -path "*/build/*" -not -path "*/vendor/*"
       -not -path "*/target/*" -not -path "*/.venv/*" -not -path "*/.git/*"'
```

`find` won't expand `$PRUNE` from a variable — paste the exclusions inline. They're
repeated in the commands below for that reason. Adjust the source extensions
(`*.ts *.tsx *.cs`) to the target's languages.

---

## 0. Orient

```bash
cd "$REPO" && ls -la && cat README.md 2>/dev/null | head -40
find . -maxdepth 3 -type d -not -path "*/node_modules/*" -not -path "*/.git/*" \
  -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/dist/*" | sort
```

Then count total source files to decide whether the small-repo leniency note applies:

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" \
  -o -name "*.go" -o -name "*.cs" -o -name "*.rb" -o -name "*.java" -o -name "*.rs" \) \
  -not -path "*/node_modules/*" -not -path "*/bin/*" -not -path "*/obj/*" \
  -not -path "*/dist/*" -not -path "*/vendor/*" | wc -l
```

---

## P1 — Organize around behavior

```bash
# Top-level source layout: role-first or feature-first?
ls src/ app/ lib/ pkg/ 2>/dev/null
find src -maxdepth 2 -type d -not -path "*/node_modules/*" | sort
```

**Look for:** top-level directories named for technical roles (`controllers/`,
`services/`, `models/`, `repositories/`, `helpers/`, `hooks/`, `components/`,
`utils/`) versus named for behavior (`orders/`, `billing/`, `checkout/`).

**The decisive measurement — feature fan-out.** Pick the product's core feature, then
count distinct top-level directories holding its files:

```bash
grep -ril "<feature>" --include="*.ts" --include="*.tsx" --include="*.cs" . \
  2>/dev/null | grep -v node_modules | sed 's|^\./||' | cut -d/ -f1-3 | sort -u
```

Three or more top-level directories for one behavior, repeatedly, is the failure this
principle names. Report the count and the directory list.

Also check for feature grouping applied at the wrong depth — feature folders *inside*
`components/` and `hooks/` is the right idea one level too deep, and is worth calling
out specifically because it's a cheap fix.

---

## P2 — Explicit, enforced dependency direction

Enforcement is what's being scored. Search for it, in this order:

```bash
# Architecture / boundary tests
find . -iname "*arch*test*" -o -iname "*boundar*" -o -iname "*depend*rule*" \
  -o -iname ".import-linter*" -o -iname "*.dependency-cruiser*" \
  | grep -v node_modules

# Lint-level boundary rules
grep -rnE "no-restricted-imports|no-restricted-paths|boundaries/|import/no-cycle|\
NetArchTest|ArchUnit|import-linter|dependency-cruiser|depguard" \
  --include="*.json" --include="*.js" --include="*.cjs" --include="*.yaml" \
  --include="*.yml" --include="*.toml" --include="*.cfg" --include="*.cs" \
  . 2>/dev/null | grep -v node_modules | head -30
```

If a boundary test project exists, **read it** — the rules it asserts are the finding.
Note especially whether the innermost layer is banned from importing vendor SDKs; that
single rule catches most accidental inversions and is a strong signal.

Then check the anti-patterns:

```bash
grep -rnE "^\s*(var|let|const|static|public static).*(GlobalDb|globalDb|currentUser|\
CurrentUser|_instance|Singleton)" --include="*.ts" --include="*.cs" --include="*.py" . \
  | grep -v node_modules | head -20
```

Also look for the asymmetric case: one tier enforced, another only documented. That's
the most common shape and drives the score down from 10 to 7–8.

---

## P3 — Names own the concept

```bash
# Dumping grounds
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.py" -o -name "*.go" \
  -o -name "*.cs" -o -name "*.js" \) -not -path "*/node_modules/*" \
  -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/dist/*" \
  | grep -iE "/(utils?|helpers?|common|misc|shared|stuff|data|manager|handler|\
base|core|main|index|types|constants)\.[a-z]+$" | sort
```

`index.*` barrels and one `main.*` are legitimate — discount them. Everything else in
that list is a finding.

```bash
# Two buckets with the same job
ls lib/ utils/ helpers/ common/ shared/ 2>/dev/null
ls src/lib/ src/utils/ src/helpers/ 2>/dev/null
```

If two such directories coexist, grep the docs for a stated boundary. No boundary = a
coin flip on every new helper. Count the files in each and report both numbers.

```bash
# Brand / naming drift: does the repo name appear in the code?
REPO_NAME=$(basename "$REPO")
grep -rl "$REPO_NAME" --include="*.ts" --include="*.cs" --include="*.py" . \
  | grep -v node_modules | wc -l
```

Near-zero hits means an old name is still in the source. Find it (namespaces, package
names, assembly names) and count its files — an agent grepping the current name finds
nothing, which is a real retrieval cost even when the deferral is deliberate.

---

## P4 — One canonical workflow

```bash
ls Makefile justfile Taskfile.yml package.json pyproject.toml Cargo.toml 2>/dev/null
find . -name "verify*" -o -name "check*.sh" -o -name "ci*.sh" | grep -v node_modules
ls .github/workflows/ .gitlab-ci.yml .circleci/ 2>/dev/null
ls .githooks/ .husky/ 2>/dev/null
```

Then **read** the CI workflow and the verify script side by side. The three questions:

1. **Is there one root entry point?** If the agent must know both the subdirectory and
   the script name, that's two facts too many. Cap the score at 7.
2. **Does CI invoke that entry point, or restate its steps?** Restating always drifts.
   This is the single most common failure of this principle. Cap at 7.
3. **Is there a fast tier?** A verify that takes 20 minutes gets skipped.

Also check the trigger — `workflow_dispatch`-only CI means drift can persist unnoticed.
And check failure-output quality: does the runner print `file:line` and a real diff?

```bash
grep -nE "^on:|workflow_dispatch|pull_request|push:" .github/workflows/*.yml
```

---

## P5 — Instructions close to the code

```bash
find . -name "AGENTS.md" -o -name "CLAUDE.md" -o -name ".cursorrules" \
  -o -name "CONTRIBUTING.md" | grep -v node_modules
ls docs/ .claude/rules/ 2>/dev/null
wc -l AGENTS.md CLAUDE.md docs/*.md 2>/dev/null | sort -rn | head -15
```

Score on four axes:

- **Leanness.** A 400-line instruction file is skimmed like the wiki page it replaced.
  Look for a short always-on core with a **trigger table** routing to detail files on
  demand — that's the strong pattern.
- **No forking.** `CLAUDE.md` should point at `AGENTS.md`, not duplicate it.
- **Proximity.** Count nested instruction files. Zero means every local invariant lives
  at the root; find one such invariant (idempotency, a concurrency rule, a unit
  convention) and report how many hops it sits from the code it governs.
- **Enforcement over documentation.** The best signal in the whole audit: a non-obvious
  invariant encoded as a custom lint rule or a type rather than a paragraph. Quote it
  if found — it's evidence of a mature harness and belongs in the "Working" column.

---

## P6 — Tests mirror behavior

```bash
find . -type d -name "test*" -o -type d -name "spec*" | grep -v node_modules | sort
find . \( -name "*.test.*" -o -name "*_test.*" -o -name "*Tests.*" -o -name "test_*.py" \) \
  -not -path "*/node_modules/*" -not -path "*/bin/*" -not -path "*/obj/*" | wc -l
```

Then the three things that actually matter:

1. **Is the test path derivable from the source path?** Take a real implementation file
   and try to construct its test path without searching. If you can't, that's the
   finding — state it with the specific file.
2. **Is the directory name honest?** A flat `tests/services/` holding hooks, components,
   and page flows is worse than flat: it's actively misleading. Sample the filenames and
   count how many don't match the folder's claim.
3. **Can one test run alone?** Check the test script and the runner's help:

```bash
grep -n '"test"\|"test:' package.json 2>/dev/null
# then: does the runner accept a path/name filter?
```

A hand-rolled runner with no filter flag means every one-line change costs a full-suite
run. That is usually the most expensive single property in a repo — score it hard and
put the fix near the top of the remediation list.

Also check naming consistency across test files (`*Tests.ts` vs `*.test.ts`) and flag
large test files, which are read in full on every failure.

---

## P7 — Generated and external code separated

```bash
find . -type d \( -name "generated" -o -name "gen" -o -name "vendor" \
  -o -name "third_party" -o -name "__generated__" \) | grep -v node_modules
grep -rl "DO NOT EDIT\|Do not edit\|@generated\|auto-generated" --include="*.ts" \
  --include="*.cs" --include="*.go" --include="*.py" . | grep -v node_modules | head
cat .gitattributes 2>/dev/null
grep -n "generated\|vendor" .gitignore .eslintrc* eslint.config.* tsconfig.json 2>/dev/null
```

Full marks require the separation to be visible at the **point of contact**, since an
agent may arrive by grep and never see the directory name:

- Header in the file itself
- Excluded from lint / typecheck / format config
- `linguist-generated` in `.gitattributes`
- **Best:** gitignored and regenerated by the verify command — a file absent from the
  tree cannot be hand-edited
- **A drift gate:** regenerate in CI and fail on divergence

Worst case to look for is vendored code with local edits — it looks editable, is
editable, and silently loses the edits on the next update.

---

## P8 — One live implementation per concept

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.cs" -o -name "*.py" \
  -o -name "*.go" \) -not -path "*/node_modules/*" -not -path "*/bin/*" \
  -not -path "*/obj/*" -not -path "*/dist/*" \
  | grep -iE "(v2|v3|old|legacy|deprecated|copy|backup|temp|final|new|_2|-2)\.[a-z]+$" | sort
```

For each hit, check whether the sibling still exists — a live pair is a coin flip and
scores hard; a `V2` with no surviving `V1` is only a misleading name and scores as minor.

```bash
# Is dead-code detection continuous or occasional?
grep -rn "knip\|ts-prune\|vulture\|deadcode\|unimport" package.json Makefile \
  .github/workflows/ 2>/dev/null | head
```

A dead-code tool that exists but isn't in `verify` means nothing stops accumulation
between runs — worth one point.

---

## P9 — Consistency over local optimality

This one is assembled from the other sweeps rather than measured directly. Look for
**unfinished migrations** — two live conventions for the same job with no stated target:

- Two directories with the same role (from P3)
- Two test-naming conventions (from P6)
- A structural pattern applied to some directories but not others (from P1)
- One tier with enforced conventions, another with prose (from P2)

Report each as "Unfinished #N" with its file counts. A migration at 60% teaches the
agent both patterns simultaneously and is worse than either endpoint.

---

## P10 — Right-sized files

```bash
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.cs" -o -name "*.py" \
  -o -name "*.go" -o -name "*.java" \) -not -path "*/node_modules/*" \
  -not -path "*/bin/*" -not -path "*/obj/*" -not -path "*/dist/*" \
  -not -path "*/generated/*" -exec wc -l {} + | sort -rn | head -30
```

Thresholds: **< 400 comfortable, > 800 needs a reason, > 1,500 is a liability.**
Report the count over 800, the count over 1,400, and name the worst offenders with
line counts.

Weight by heat, not just size: a 1,600-line file on the hottest change path costs far
more than a 1,600-line file nobody touches. Cross-reference against `git log` if useful:

```bash
git log --since="6 months ago" --name-only --pretty=format: \
  | grep -v '^$' | sort | uniq -c | sort -rn | head -20
```

Also check whether anything prevents growth:

```bash
grep -rn "max-lines\|max_lines\|too-many-lines" .eslintrc* eslint.config.* \
  setup.cfg pyproject.toml 2>/dev/null
```
