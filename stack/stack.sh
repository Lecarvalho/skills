#!/usr/bin/env bash
# stack.sh - pile of tasks worked one at a time by chained coding-agent sessions.
#
# The pile is <git dir>/session-stack/stack.md, one task per line, top first:
#   - [ ] <id> <task>   open
#   - [~] <id> <task>   a session is working on it
#   - [x] <id> <task>   done
# A task may start with model=<model> and effort=<effort>: its session is started
# with them. Lines may be reordered, edited or deleted by hand.
#
#   stack.sh add [--model <model>] [--effort <effort>] <task>
#                          append a task, print its id
#   stack.sh handoff [id]  mark task <id> done, then open a new terminal session on the top open task
#   stack.sh show <id>     print a task's text
#   stack.sh done <id>     mark a task done
#   stack.sh reopen <id>   put a task back in the pile
#   stack.sh status        print the pile and what blocks the next hand-off
#   stack.sh clear         empty the pile
set -u
export LC_ALL=C

git_dir=$(git rev-parse --git-common-dir 2>/dev/null) || { echo "not a git repository" >&2; exit 2; }
dir=$(cd "$git_dir" && pwd)/session-stack
file="$dir/stack.md"
mkdir -p "$dir"
touch "$file"

usage() { echo "usage: stack.sh add [--model <model>] [--effort <effort>] <task> | handoff [id] | show <id> | done <id> | reopen <id> | status | clear" >&2; exit 2; }
native() { cygpath -w "$1" 2>/dev/null || echo "$1"; }
check_id() { case "${1:-}" in ''|*[!0-9]*) usage ;; esac; }
safe_word() { case "$1" in ''|*[!][A-Za-z0-9._:-]*) return 1 ;; esac; }

lock() {
  local tries=0
  until mkdir "$dir/lock" 2>/dev/null; do
    tries=$(( tries + 1 ))
    [ "$tries" -lt 100 ] || { echo "the pile is locked: remove $dir/lock" >&2; exit 2; }
    sleep 0.2
  done
  trap 'rmdir "$dir/lock" 2>/dev/null' EXIT
}

set_mark() { # <id> <mark>
  grep -q "^- \[.\] $1 " "$file" || { echo "no task $1" >&2; exit 1; }
  sed -i "s/^- \[.\] $1 /- [$2] $1 /" "$file"
}

# Reads task $1 into the variables model, effort and task.
parse() {
  local rest word
  rest=$(sed -n "s/^- \[.\] $1 //p" "$file" | head -n 1)
  model="" effort=""
  while :; do
    word=${rest%% *}
    case "$word" in
      model=*) model=${word#model=} ;;
      effort=*) effort=${word#effort=} ;;
      *) break ;;
    esac
    [ "$word" = "$rest" ] && { rest=""; break; }
    rest=${rest#* }
  done
  task=$rest
}

# Prints why the next task may not start yet; prints nothing when it may.
blocker() {
  local id changes
  id=$(sed -n 's/^- \[~\] \([0-9]*\) .*/\1/p' "$file" | head -n 1)
  [ -z "$id" ] || { echo "task $id is being worked on"; return; }
  changes=$(git --no-optional-locks status --porcelain 2>/dev/null) || { echo "git status failed"; return; }
  [ -z "$changes" ] || echo "working tree has uncommitted changes"
}

# Opens a terminal window running a session on task $1. The launcher reports
# back through a marker file, because a blocked window still exits 0.
launch() {
  local id=$1 bin bat started model effort task opts=""
  case "$(uname -s)" in
    MINGW*|MSYS*|CYGWIN*) ;;
    *) echo "no terminal launcher for $(uname -s)"; return 1 ;;
  esac
  bin=${STACK_CLAUDE_BIN:-$(command -v claude)}
  [ -n "$bin" ] || { echo "claude is not on PATH"; return 1; }
  [ -e "$bin.exe" ] && bin="$bin.exe"
  parse "$id"
  if [ -n "$model" ]; then
    safe_word "$model" || { echo "task $id has an unusable model: $model"; return 1; }
    opts="$opts --model \"$model\""
  fi
  if [ -n "$effort" ]; then
    safe_word "$effort" || { echo "task $id has an unusable effort: $effort"; return 1; }
    opts="$opts --effort \"$effort\""
  fi
  bat="$dir/run-$id.bat"
  started="$dir/run-$id.started"
  rm -f "$started"
  printf '%s\r\n' \
    '@echo off' \
    "title Stack $id" \
    "cd /d \"$(native "$(git rev-parse --show-toplevel)")\"" \
    "echo.>\"$(native "$started")\"" \
    "\"$(native "$bin")\"$opts \"/stack $id\"" > "$bat"
  cmd.exe //c start "Stack $id" cmd.exe //k "$(native "$bat")" > /dev/null 2>&1
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -e "$started" ] && { rm -f "$started"; return 0; }
    sleep 0.5
  done
  echo "the terminal window did not open (a sandboxed shell cannot open one)"
  return 1
}

cmd_add() {
  local task id prefix=""
  while [ $# -gt 1 ]; do
    case "$1" in
      --model|--effort)
        safe_word "$2" || { echo "not a model or effort name: $2" >&2; exit 2; }
        prefix="$prefix${1#--}=$2 "
        shift 2 ;;
      *) break ;;
    esac
  done
  task=$(printf '%s' "$*" | tr '\r\n' '  ')
  [ -n "$task" ] || usage
  lock
  id=$(( $(sed -n 's/^- \[.\] \([0-9]*\) .*/\1/p' "$file" | sort -n | tail -n 1) + 1 ))
  printf -- '- [ ] %s %s%s\n' "$id" "$prefix" "$task" >> "$file"
  echo "$id"
}

cmd_handoff() {
  local reason id
  [ $# -eq 0 ] || check_id "$1"
  lock
  [ $# -eq 0 ] || set_mark "$1" x
  reason=$(blocker)
  [ -z "$reason" ] || { echo "BLOCKED: $reason"; exit 1; }
  id=$(sed -n 's/^- \[ \] \([0-9]*\) .*/\1/p' "$file" | head -n 1)
  [ -n "$id" ] || { echo "EMPTY: no open task"; exit 0; }
  set_mark "$id" "~"
  reason=$(launch "$id") || { set_mark "$id" " "; echo "FAILED: $reason"; exit 2; }
  echo "SPAWNED: task $id"
}

cmd_show() {
  local model effort task
  check_id "${1:-}"
  grep -q "^- \[.\] $1 " "$file" || { echo "no task $1" >&2; exit 1; }
  parse "$1"
  echo "$task"
}

cmd_done() {
  check_id "${1:-}"
  lock
  set_mark "$1" x
}

cmd_reopen() {
  check_id "${1:-}"
  lock
  set_mark "$1" " "
}

cmd_status() {
  local reason
  if [ -s "$file" ]; then cat "$file"; else echo "no tasks"; fi
  reason=$(blocker)
  echo "next hand-off: ${reason:-ready}"
  echo "file: $(native "$file")"
}

cmd=${1:-status}
[ $# -gt 0 ] && shift
case "$cmd" in
  add) cmd_add "$@" ;;
  handoff) cmd_handoff "$@" ;;
  show) cmd_show "$@" ;;
  done) cmd_done "$@" ;;
  reopen) cmd_reopen "$@" ;;
  status) cmd_status ;;
  clear) rm -f "$file" "$dir"/run-* ;;
  *) usage ;;
esac
