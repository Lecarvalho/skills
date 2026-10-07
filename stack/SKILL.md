---
name: stack
description: Add a task to this repository's pile of stacked tasks. Sessions work the pile one at a time, each in its own terminal window - when one reaches its definition of done it opens a new session on the next open task, until the pile is empty. Also `/stack go`, `/stack status` and `/stack clear`.
argument-hint: <task> | go | status | clear
disable-model-invocation: true
---

# Stacked tasks

Sessions in one checkout of a repository must work one at a time. Tasks wait in a pile, not in open sessions: a session that reaches its definition of done opens a new terminal session on the next open task, and that session does the same, until the pile is empty.

Run every command below with the Bash tool, from inside the repository. The script sits beside this file: `${CLAUDE_SKILL_DIR}/stack.sh`. Keep the quotes around its path in every command. The pile is the file `<git dir>/session-stack/stack.md` (`stack.sh status` prints its full path): one task per line, top first, `[ ]` open, `[~]` being worked on, `[x]` done. A task may start with `model=<model>` and `effort=<effort>`: its session is started with them. The user may reorder, edit or delete lines by hand.

## Arguments

$ARGUMENTS

- `status`: run `bash "${CLAUDE_SKILL_DIR}/stack.sh" status`, report the result, and stop.
- `clear`: run `bash "${CLAUDE_SKILL_DIR}/stack.sh" clear`, report that the pile is empty, and stop.
- `go`: do "Hand off" now, without waiting for a definition of done. For a session that has no work of its own.
- A number alone: this session was opened to do that task. Go to "Run a task".
- Anything else is a task to add. Go to "Add a task".

## Add a task

1. `bash "${CLAUDE_SKILL_DIR}/stack.sh" add "<task>"` prints the task's id. Keep the user's words and add what a session with no memory of this conversation needs to do the task: the file paths, branch or pull request it depends on, and its definition of done when the user gave one.
2. When the user, the repository's instructions or the plan the task comes from name the model or the effort the task must run on, pass them before the task: `bash "${CLAUDE_SKILL_DIR}/stack.sh" add --model <model> --effort <effort> "<task>"`. Look them up there before adding, and never guess a value. Leave out whatever nothing names: that session then starts on the user's defaults.
3. Tell the user the id in one line and carry on with what this session was doing. Do not start the task, read code for it, or plan it.
4. This session now owes a hand-off: when its own work reaches its definition of done, do "Hand off". If it has no work of its own, say that `/stack go` starts the pile.

## Hand off

Do this once the session's work has reached its definition of done and the working tree is clean. Run it with the sandbox disabled (`dangerouslyDisableSandbox: true`), because a sandboxed shell cannot open a terminal window:

`bash "${CLAUDE_SKILL_DIR}/stack.sh" handoff <id>`

`<id>` is the task this session ran: the one command marks it done and opens the next session. A session that ran no task from the pile leaves the id out.

- `SPAWNED: task <id>`: a new terminal window is working on that task. Say so in one line. This session is finished with the pile.
- `EMPTY`: nothing is left to do. Say the pile is finished.
- `BLOCKED: task <id> is being worked on`: another session is on the pile and will hand off itself. Do nothing.
- `BLOCKED: working tree has uncommitted changes`: commit or restore what this session left, then run `handoff` again without the id. If the changes are not this session's, tell the user and stop.
- `FAILED: <reason>`: the task went back to the pile. Report the reason.

## Run a task

1. `bash "${CLAUDE_SKILL_DIR}/stack.sh" show <id>` prints the task. If it prints `no task`, report it and stop.
2. Run `git fetch`, check which branch the checkout is on (`git branch --show-current`) and switch to the base the task names (the default branch, pulled, when it names none). Read the current state of the code before acting, because the task was written before the earlier sessions landed their changes. If the task no longer makes sense against the new code, say so instead of forcing it.
3. Do the task, following the repository's own instructions. The user is away and the pile must keep moving: do not stop to ask for approval or confirmation. Decide what the task and the repository's instructions settle, and record each decision in the pull request body.
4. Verify it: run the applicable checks. List whatever needs the user's device or judgment in the pull request body instead of waiting for it.
5. Create a branch, commit, and open the pull request. An open pull request is done: do not merge, unless the task itself says to merge.
6. Do "Hand off" with this task's id.

Ask the user only when the task cannot move forward without them: a decision only they can make, access this session lacks, a failing check it cannot fix. Ask with the AskUserQuestion tool, which is what alerts them, and continue from their answer. Never ask for something a sensible default or the pull request body can carry.

Hand off in every ending, not only the successful one: also when the task needs no change or no longer makes sense against the current code, after restoring a clean working tree and saying why. If the session cannot leave the working tree clean, say exactly what state it is in and ask the user before handing off.

A task left at `[~]` by a session that died blocks the pile: `bash "${CLAUDE_SKILL_DIR}/stack.sh" reopen <id>` puts it back, `done <id>` drops it.
