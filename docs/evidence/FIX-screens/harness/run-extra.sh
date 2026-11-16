#!/usr/bin/env bash
# FIX-screens: after cf0477f0 (calendar spacing) and a9abc824 (legible destructive button off Ivory):
# the calendar and the dialogs again on the fix, and a pixel compare of the calendar with the base shots.
H="C:/Users/Dell/hec-tools/fix-screens-harness"
AFTER="C:/Users/Dell/Downloads/04 Code & Web Projects/hec-team-app/new/happy-english-club-team-ef716384/.claude/worktrees/agent-abb38f42ad67d0fe0"
OUT="C:/Users/Dell/hec-tools/fix-screens-out"
cd "$H"
BASE="C:/Users/Dell/hec-tools/fix-screens-base"
# A variant whose first viewport timed out on a cold Vite cache ("scenario" FAIL) is run again, now warm.
for v in A-before A-after C-before C-after D-before D-after B-before B-after; do
  log="$OUT/fs-$v.log"; [ -f "$log" ] || continue
  grep -q "FAIL\] scenario" "$log" || continue
  side=${v#*-}; repo="$BASE"; port=5441; [ "$side" = after ] && repo="$AFTER" && port=5442
  case "$v" in A-*) f="--shots";; B-*) f="--mouse";; C-*) f="--ivory --shots";; D-*) f="--ivory --dark";; esac
  mv "$log" "$OUT/fs-$v.cold.log"
  node fix-fs.mjs "$repo" "$OUT/fs" "$v" $f --port=$port > "$log" 2>&1
  echo "fs $v (rerun, warm): $(tail -1 "$log")"
done
node fix-pages.mjs "$AFTER" "$OUT/pages" after2 --only=calendar,dialogs --port=5444 > "$OUT/pages-after2.log" 2>&1
echo "pages after2: $(tail -1 "$OUT/pages-after2.log")"
node pixlab.mjs "$OUT/pages" before after2 calendar > "$OUT/pix-calendar.log" 2>&1
echo "pix: $(tail -3 "$OUT/pix-calendar.log" | tr '\n' ' ')"
echo EXTRA-DONE
