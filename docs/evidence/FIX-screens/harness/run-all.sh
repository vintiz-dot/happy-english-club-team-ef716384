#!/usr/bin/env bash
# FIX-screens: every proof run, one after another (two vite servers at once starve this machine).
H="C:/Users/Dell/hec-tools/fix-screens-harness"
BASE="C:/Users/Dell/hec-tools/fix-screens-base"
AFTER="C:/Users/Dell/Downloads/04 Code & Web Projects/hec-team-app/new/happy-english-club-team-ef716384/.claude/worktrees/agent-abb38f42ad67d0fe0"
OUT="C:/Users/Dell/hec-tools/fix-screens-out"
mkdir -p "$OUT/fs" "$OUT/pages"
cd "$H"
run_fs() { # side label flags...
  local side="$1" lbl="$2"; shift 2
  local repo="$BASE"; [ "$side" = after ] && repo="$AFTER"
  local port=5441; [ "$side" = after ] && port=5442
  node fix-fs.mjs "$repo" "$OUT/fs" "$lbl" "$@" --port=$port > "$OUT/fs-$lbl.log" 2>&1
  echo "fs $lbl: $(tail -1 "$OUT/fs-$lbl.log")"
}
run_pages() {
  local side="$1" lbl="$2"; shift 2
  local repo="$BASE"; [ "$side" = after ] && repo="$AFTER"
  local port=5443; [ "$side" = after ] && port=5444
  node fix-pages.mjs "$repo" "$OUT/pages" "$lbl" "$@" --port=$port > "$OUT/pages-$lbl.log" 2>&1
  echo "pages $lbl: $(tail -1 "$OUT/pages-$lbl.log")"
}
for step in "$@"; do
  case "$step" in
    fsA) run_fs before A-before --shots; run_fs after A-after --shots ;;
    fsB) run_fs before B-before --mouse; run_fs after B-after --mouse ;;
    fsC) run_fs before C-before --ivory --shots; run_fs after C-after --ivory --shots ;;
    fsD) run_fs before D-before --ivory --dark; run_fs after D-after --ivory --dark ;;
    pages) run_pages before before; run_pages after after ;;
    pagesIvory) run_pages before before-ivory --ivory --only=dialogs,calendar; run_pages after after-ivory --ivory --only=dialogs,calendar ;;
  esac
done
echo ALL-DONE
