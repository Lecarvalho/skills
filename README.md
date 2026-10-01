# skills

Reusable procedures for coding agents — Claude Code, Codex, and anything else that can
read a folder of instructions.

A skill is a procedure plus its reference material: what to do, in what order, measured
against what standard. The content is agent-agnostic; only the packaging differs per
runtime (see [Install](#install)).

## Skills

### `agent-readiness-audit`

Audits a codebase and produces a self-contained HTML scorecard, in one of **two modes**.
Ten principles, 0–10 each against counted evidence, unweighted sum out of 100. In both
modes **high is good**.

| Mode | Flag | Question |
|---|---|---|
| Readiness *(default)* | — | Can an agent cheaply **find**, **predict**, and **verify** in this repo? |
| Overengineering | `--overengineering` | Is the repo's structure **paid for by the work it actually does**? |

#### Readiness — structural legibility to coding agents

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

#### Overengineering — is the structure paid for?

Overengineering here means **structure whose cost is paid now but whose benefit is
contingent on a future that hasn't arrived** — misallocated optionality. Someone bought
the ability to vary something that never varies, and paid for it by making the things that
*do* vary harder to touch.

| # | Principle |
|---|---|
| 1 | Abstractions have more than one occupant |
| 2 | Indirection carries logic |
| 3 | Configuration is actually configured |
| 4 | Generality has a second caller |
| 5 | Infrastructure matches load |
| 6 | Change is local |
| 7 | Data models transform |
| 8 | Ceremony pays for itself |
| 9 | Abstractions factor along the real axis |
| 10 | Surface is reachable |

The rubric's central bias: **name the concrete variation this structure absorbs, and point
at where it occurred.** Structure that survives that test is earning its keep whatever it
looks like; structure that fails it is the finding. Because speculation is invisible in a
snapshot and obvious in history, git history is primary evidence here rather than a
cross-check, and findings are weighted by how hot the file is.

The headline is a **proportionality** score — 100 means the structure is fully earned, not
that the repo is maximally overengineered. Every report carries a required
*under-engineering* section as a counterweight, so the recommendation reads as
proportionality rather than minimalism.

Output in both modes is a single self-contained, visual HTML file. Each issue is drawn as
problem → solution side by side (files as squares, folders, dependency arrows, check
tiles), with the principle's score beside it and a copy-ready prompt that fixes only
that issue. A fix plan ranked by payoff per hour links to each block, and the report
closes with the repo's folder tree today next to the tree after every fix. It responds
to both `prefers-color-scheme` and an explicit theme attribute.

**Usage** — invoke by name, or just ask:

```
audit C:\path\to\repo for agent-readiness
how well is this repo organized for agents to work in?

/agent-readiness-audit --overengineering C:\path\to\repo
is this codebase too complex for what it actually does?
```

**Scope.** Neither mode measures correctness, test quality, security, performance, or
product fit. A codebase can score 100 in either mode and still be wrong.

**Layout** — one procedure, two parallel rubric trees, one shared template:

```
agent-readiness-audit/
  SKILL.md                            procedure: mode → rubric → evidence → score → report
  references/readiness/               default mode
    principles.md                     the ten principles — the scoring standard
    evidence.md                       copy-paste sweeps per principle, with exclusions
    scoring.md                        0–10 anchors per principle, and scoring discipline
  references/overengineering/         --overengineering
    principles.md                     the ten proportionality principles + the falsification test
    evidence.md                       history-first sweeps, each with its counter-check
    scoring.md                        0–10 anchors, polarity, heat weighting, confidence rules
  assets/report-template.html         visual report skeleton + component catalog (both modes)
```

The filenames are identical across the two rubric folders; only the parent differs. Read
from one folder for the whole audit — mixing them produces a report whose scores don't
match its rubric.

The report's status palette was validated for colorblind separation and contrast in both
light and dark modes. Color is never the sole encoding — every score carries its number
and a text band word, and every colored group is labeled with a name and count. If you change the hex values, re-validate.

### `paper-cut-video`

Turns a script, story, or bare topic into a 15–60 s animated video in a cut-paper
storybook collage style: torn-paper shapes, a recurring hero character with a face,
handwritten keywords that write themselves on, taped fact notes, and a synthesized
soundtrack timed to the action. Everything is code — shapes drawn on a `<canvas>`,
frames rendered headlessly, audio synthesized from a cue list — so there are no stock
assets and nothing to license.

**Usage:**

```
/paper-cut-video how volcanoes work
/paper-cut-video path/to/script.txt 9:16, dreamy, storyboard first
```

Options, in words or flags: format (`1:1` default, `9:16`, `16:9`), length (~30 s
default), language (the script's), fact notes on/off, mood (`cute`, `dreamy`, `none`),
bpm, key, and "storyboard first" to review the plan before rendering.

**Output** in `videos/<slug>/`: `<slug>.mp4` (H.264 + AAC), `<slug>.html` (self-contained
interactive player), `cards.js` (the editable source), `soundtrack.mp3`.

**Requirements.** Unlike the audit skill, this one runs code, so the machine needs:

| Tool | Version | Install |
|---|---|---|
| Node.js | 18+ | nodejs.org · `brew install node` · `winget install OpenJS.NodeJS.LTS` |
| Python | 3.8+ | python.org · `brew install python` · `winget install Python.Python.3.12` |
| ffmpeg | any recent | `brew install ffmpeg` · `apt install ffmpeg` · `winget install ffmpeg` |
| bash | — | built in on macOS/Linux; **Git Bash or WSL on Windows** |

Everything else — Playwright, headless Chromium (~150 MB), numpy/scipy, the Patrick Hand
font — is fetched by a one-time setup that the agent runs on first use. To do it by hand:

```bash
bash ~/.claude/skills/paper-cut-video/scripts/setup.sh
```

It needs internet access once and is safe to re-run. Downloads land in `scripts/` and are
git-ignored. To check the install without an agent, render the bundled example:

```bash
cd ~/.claude/skills/paper-cut-video/scripts
bash make_video.sh examples/example.js /tmp/demo --title Demo   # → /tmp/demo/demo.mp4
```

**Layout:**

```
paper-cut-video/
  SKILL.md                 procedure: storyboard → cards.js → stills check → render → hand over
  scripts/
    setup.sh               one-time dependency install
    stills.sh              cards.js → PNG stills + contact sheet, for a quick visual check
    make_video.sh          cards.js → final MP4 + HTML player, in one command
    build_page.py          assembles the self-contained HTML page
    render.mjs             headless Chromium → frames → silent MP4 + sound cue list
    soundtrack.py          synthesizes the soundtrack from the cue list
    engine.js              the canvas engine and its drawing helpers
    examples/example.js    reference cards.js
```

## Install

The skill body is plain Markdown and works with any agent that can be pointed at it.
What differs is how each runtime discovers it.

**Claude Code** — this repo is laid out so that it *is* the personal skills directory.
Skills sit at the root, one folder each, which is exactly what Claude Code expects in
`~/.claude/skills/`. Clone it there and updates are a plain `git pull`:

```bash
git clone https://github.com/Lecarvalho/skills.git ~/.claude/skills
```

On Windows that target is `%USERPROFILE%\.claude\skills\`. Skills are picked up on the
next session; there is no registration step.

If the directory already exists with skills in it, attach in place instead of cloning:

```bash
cd ~/.claude/skills
git init && git remote add origin https://github.com/Lecarvalho/skills.git
git fetch origin && git reset --hard origin/main
git branch --set-upstream-to=origin/main main
```

Local-only skills you don't want tracked can live alongside; add them to `.gitignore` so
`git status` stays clean. `LICENSE` and `README.md` end up in the skills directory too —
Claude Code only reads folders containing a `SKILL.md`, so they're inert.

Thereafter:

```bash
cd ~/.claude/skills && git pull
```

For a single project instead, copy the skill's folder (`agent-readiness-audit/` or
`paper-cut-video/`, whole, including `scripts/`) into `.claude/skills/` at that repo's
root.

**Codex** — Codex has no skills directory. Either reference the procedure from your
`AGENTS.md`:

```markdown
| Read this | When |
|---|---|
| `agent-readiness-audit/SKILL.md` | Auditing a repo for agent-readiness or overengineering |
```

...or copy `SKILL.md`'s body into `~/.codex/prompts/agent-readiness-audit.md` to invoke
it as a slash command. In both cases keep `references/` and `assets/` beside it — the
procedure loads them by relative path.

**Anything else** — point the agent at `SKILL.md` and let it follow the steps. The YAML
frontmatter is Claude Code's discovery metadata and is inert everywhere else.

## License

MIT — see [LICENSE](LICENSE).
