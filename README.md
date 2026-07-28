# skills

Reusable procedures for coding agents — Claude Code, Codex, and anything else that can
read a folder of instructions.

A skill is a procedure plus its reference material: what to do, in what order, measured
against what standard. The content is agent-agnostic; only the packaging differs per
runtime (see [Install](#install)).

## Skills

### `agent-readiness-audit`

Audits a codebase for **structural legibility to coding agents** — how cheaply an agent
can find relevant code, predict its constraints, and verify a change — and produces a
self-contained HTML scorecard.

Ten principles, scored 0–10 each against counted evidence:

| # | Principle |
|---|---|
| 1 | Organize around behavior, not technical role |
| 2 | Explicit, *enforced* dependency direction |
| 3 | Names own the concept — and are predictable |
| 4 | One canonical workflow, invoked identically by humans, agents, and CI |
| 5 | Instructions close to the code — but encoded first |
| 6 | Tests mirror behavior, and one test is runnable |
| 7 | Generated and external code separated, machine-readably |
| 8 | One live implementation per concept |
| 9 | Consistency over local optimality |
| 10 | Files an agent can afford to read |

The rubric's central bias: **a principle encoded into a check scores high; a principle
only written down scores low.** Most repos split cleanly along that line, and naming the
split is usually the most useful thing the report says.

Output is a single self-contained HTML file — no external fonts, scripts, or images —
with a scorecard, per-principle findings with file paths and counts, and a remediation
list ranked by payoff per hour rather than by severity. It responds to both
`prefers-color-scheme` and an explicit theme attribute.

**Usage** — invoke by name, or just ask:

```
audit C:\path\to\repo for agent-readiness
how well is this repo organized for agents to work in?
```

**Scope.** This measures structural legibility only — not correctness, test quality,
security, performance, or product fit. A codebase can score 100 and still be wrong.

**Layout:**

```
skills/agent-readiness-audit/
  SKILL.md                     procedure: rubric → evidence → score → report → deliver
  references/principles.md     the ten principles — the scoring standard
  references/evidence.md       copy-paste sweeps per principle, with exclusions
  references/scoring.md        0–10 anchors per principle, and scoring discipline
  assets/report-template.html  report skeleton with a validated palette
```

The report's status palette was validated for colorblind separation and contrast in both
light and dark modes. Color is never the sole encoding — every meter carries a numeric
score and a text band label. If you change the hex values, re-validate.

## Install

The skill body is plain Markdown and works with any agent that can be pointed at it.
What differs is how each runtime discovers it.

**Claude Code** — copy into the personal skills directory, where it's available in every
project. It's picked up on the next session; no registration step.

```bash
git clone https://github.com/Lecarvalho/skills.git
cp -r skills/skills/agent-readiness-audit ~/.claude/skills/
```

On Windows that target is `%USERPROFILE%\.claude\skills\`. For a single project instead,
copy into `.claude/skills/` at the repo root.

**Codex** — Codex has no skills directory. Either reference the procedure from your
`AGENTS.md`:

```markdown
| Read this | When |
|---|---|
| `skills/agent-readiness-audit/SKILL.md` | Auditing a repo for agent-readiness |
```

...or copy `SKILL.md`'s body into `~/.codex/prompts/agent-readiness-audit.md` to invoke
it as a slash command. In both cases keep `references/` and `assets/` beside it — the
procedure loads them by relative path.

**Anything else** — point the agent at `SKILL.md` and let it follow the steps. The YAML
frontmatter is Claude Code's discovery metadata and is inert everywhere else.

## License

MIT — see [LICENSE](LICENSE).
