"""Build the folder the class teacher works from.

    python scripts\\lesson-eval\\make_teacher_pack.py

Reads what b1_score.py and the B2 run left under <root>\\work\\teacher-check\\
and writes <root>\\FOR-TEACHER\\ : two small tasks, each with its audio as
MP3 (plays on any phone or laptop) and a sheet to print and mark by hand.

Nothing here goes into the repository: the output is audio and transcripts
of children. The script refuses to write inside a git repository. It never
opens key.txt or consent.txt. No transcript text is printed to the console.
"""
from __future__ import annotations

import csv
import html
import json
import os
import random
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(os.environ.get("HEC_EVAL_ROOT", r"C:\Users\Dell\hec-audio-eval"))
SRC = ROOT / "work" / "teacher-check"
OUT = ROOT / "FOR-TEACHER"
SYSTEM_1 = "azure-fast-multilingual.txt"  # the sheet the teacher marks

CSS = """
body{font-family:Arial,Helvetica,sans-serif;font-size:13pt;line-height:1.5;margin:18mm;color:#111}
h1{font-size:20pt;margin:0 0 6pt} h2{font-size:15pt;margin:18pt 0 6pt}
table{border-collapse:collapse;width:100%} td,th{border:1px solid #777;padding:6pt 8pt;vertical-align:top;text-align:left}
.line{margin:0;padding:14pt 0 4pt;border-bottom:1px dotted #999;line-height:2.4}
.n{display:inline-block;width:30pt;color:#666;font-size:10pt}
.sp{display:inline-block;min-width:22pt;font-weight:bold;border:1px solid #777;text-align:center;margin-right:8pt}
.box{border:1px solid #777;padding:8pt 10pt;margin:10pt 0}
.small{font-size:10.5pt;color:#444}
@media print{body{margin:14mm}.nobreak{page-break-inside:avoid}}
"""


def in_git_repo(p: Path) -> bool:
    for q in [p, *p.parents]:
        if (q / ".git").exists():
            return True
    return False


def page(title: str, body: str) -> str:
    return (f"<!doctype html><html lang='en'><head><meta charset='utf-8'><title>{html.escape(title)}</title>"
            f"<style>{CSS}</style></head><body>{body}</body></html>")


def to_mp3(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-nostdin", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src),
                    "-ac", "1", "-codec:a", "libmp3lame", "-b:a", "96k", str(dst)], check=True)


def transcript_lines(path: Path, clip_start_s: int) -> list[tuple[str, str, str]]:
    """(time into the clip m:ss, speaker letter, text) per turn. Lines look like "[13:31] A: words"."""
    rows: list[tuple[str, str, str]] = []
    pat = re.compile(r"^\[(\d+):(\d{2})\]\s+([^:\s]{1,4}):\s*(.*)$")
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        m = pat.match(line)
        if m:
            t = max(0, int(m.group(1)) * 60 + int(m.group(2)) - clip_start_s)
            rows.append((f"{t // 60}:{t % 60:02d}", m.group(3), m.group(4).strip()))
        elif line and rows:  # continuation of the previous turn
            rows[-1] = (rows[-1][0], rows[-1][1], rows[-1][2] + " " + line)
    return rows


START_HERE = """
<h1>Teacher check - start here</h1>
<p>Thank you. This takes about <b>one hour</b> in total and can be done in two sittings. It helps us find out
whether a computer can write down a lesson correctly. <b>Nothing here goes to parents or into any child's record.</b></p>

<div class="box"><b>You need:</b> this folder, a printer, a red pen, headphones, and the list of children's
codes (S01, S02 ...) that the school office gives you on paper. Please write <b>codes, never names</b>, on the sheets.</div>

<h2>Task 1 - Check a 5-minute transcript (about 45 minutes)</h2>
<ol>
<li>Open the folder <b>Task-1-transcript</b>. Print <b>transcript-to-mark.html</b> (open it, then Print).</li>
<li>Play <b>lesson-clip-5-minutes.mp3</b> and read the printed sheet as you listen. Stop and replay as often as you like.</li>
<li>Mark the sheet in red, four kinds of mark:
 <table>
 <tr><th>What you hear</th><th>What you do</th></tr>
 <tr><td><b>Wrong word</b> - the sheet has a word the speaker did not say</td><td>Cross it out and write the real word above it.</td></tr>
 <tr><td><b>Missed word</b> - something was said and the sheet has nothing</td><td>Put a ^ where it belongs and write the missing words above it.</td></tr>
 <tr><td><b>Fixed-up grammar</b> - the child made a mistake ("he go", "two cat") but the sheet shows correct English</td><td>Write <b>F</b> in the margin. Cross out the corrected words and write exactly what the child said, mistake included. Do not correct the child.</td></tr>
 <tr><td><b>Wrong speaker</b> - the letter in the box is not the person talking</td><td>Circle the letter and write who it is: <b>T</b> for a teacher, or the child's <b>code</b>. If you do not know which child, write <b>child</b>.</td></tr>
 </table></li>
<li>Vietnamese: if a child speaks Vietnamese and the sheet has nothing, or strange English words, write the Vietnamese you heard.</li>
<li>Not sure? Write <b>?</b>. A "?" is better than a guess. Words nobody could understand: write <b>(x)</b>.</li>
<li>Ignore punctuation and capital letters.</li>
</ol>
<p class="small">The letters A, B, C on the sheet are the computer's guess of who is speaking. They are often wrong; that is one of the things we are measuring.</p>

<h2>Task 2 - Who is speaking? (about 15 minutes)</h2>
<ol>
<li>Open the folder <b>Task-2-who-is-speaking</b>. Print <b>answer-sheet.html</b>.</li>
<li>Play each clip (clip-01.mp3, clip-02.mp3 ...). Each is about 20 seconds, cut from a real lesson.</li>
<li>For each clip fill in one row:
 <ul>
 <li><b>Who?</b> the child's <b>code</b>, or <b>T</b> for a teacher or other adult, or <b>?</b> if you cannot tell.</li>
 <li><b>One voice or several?</b> Tick "one" if the whole clip is the same person. Tick "several" if you hear more than one person, and write the codes you recognise.</li>
 </ul></li>
</ol>

<h2>When you finish</h2>
<p>Hand both marked sheets back to the school office. Please do not copy the audio anywhere else, and delete nothing:
the office removes the recordings when the check is over.</p>
"""


def main() -> int:
    if in_git_repo(OUT):
        print("refusing to write inside a git repository", file=sys.stderr)
        return 3
    if not (SRC / "b1" / SYSTEM_1).exists():
        print("missing the transcript pack: run b1_score.py first", file=sys.stderr)
        return 2
    OUT.mkdir(parents=True, exist_ok=True)

    # ---- Task 1
    t1 = OUT / "Task-1-transcript"
    clips = sorted((SRC / "b1").glob("stretch_*.wav"))
    if not clips:
        print("missing the 5-minute clip", file=sys.stderr)
        return 2
    to_mp3(clips[0], t1 / "lesson-clip-5-minutes.mp3")
    start_s = 0
    meta = SRC / "b1" / "stretch.json"
    if meta.exists():
        try:
            j = json.loads(meta.read_text(encoding="utf-8"))
            start_s = int(float(j.get("start_s", j.get("start", 0))))
        except Exception:
            start_s = 0
    if not start_s:
        m = re.search(r"_(\d+)s\.wav$", clips[0].name)
        start_s = int(m.group(1)) if m else 0
    rows = transcript_lines(SRC / "b1" / SYSTEM_1, start_s)
    if not rows:
        print("the transcript file has no turns in the expected form", file=sys.stderr)
        return 2
    body = ["<h1>Transcript to mark (System 1)</h1>",
            "<p class='small'>Listen to lesson-clip-5-minutes.mp3. Mark in red: wrong word, missed word (^), "
            "fixed-up grammar (F), wrong speaker (circle the letter, write T or the child's code). "
            "Not sure: ?. Could not understand: (x). The small time on each line is minutes:seconds into the clip.</p>"]
    for i, (when, spk, text) in enumerate(rows, 1):
        body.append(f"<p class='line nobreak'><span class='n'>{i}</span><span class='n'>{when}</span>"
                    f"<span class='sp'>{html.escape(spk)}</span>{html.escape(text)}</p>")
    body.append("<p class='small'>End of the sheet. Anything said in the clip that is not on this sheet at all: "
                "write it at the bottom with roughly when you heard it.</p>")
    (t1 / "transcript-to-mark.html").write_text(page("Transcript to mark", "\n".join(body)), encoding="utf-8")

    # ---- Task 2
    t2 = OUT / "Task-2-who-is-speaking"
    with (SRC / "check_sheet.csv").open(encoding="utf-8", newline="") as f:
        sheet = list(csv.DictReader(f))
    order = list(range(len(sheet)))
    random.Random(20261112).shuffle(order)  # so the order gives no hint of lesson or cluster
    mapping = []
    trs = []
    for n, idx in enumerate(order, 1):
        r = sheet[idx]
        name = f"clip-{n:02d}.mp3"
        to_mp3(SRC / r["sample"], t2 / name)
        mapping.append({"clip": name, "lesson": r["lesson"], "cluster": r["cluster"]})
        trs.append(f"<tr class='nobreak'><td><b>{name[:-4]}</b></td><td style='height:34pt'></td>"
                   f"<td>&#9744; one &nbsp;&nbsp; &#9744; several: ______________</td><td></td></tr>")
    body2 = ("<h1>Who is speaking? - answer sheet</h1>"
             "<p class='small'>Codes only, never names. T = teacher or other adult. ? = cannot tell.</p>"
             "<table><tr><th style='width:16%'>Clip</th><th style='width:22%'>Who? (code, T or ?)</th>"
             "<th style='width:36%'>One voice or several?</th><th>Notes</th></tr>" + "".join(trs) + "</table>")
    (t2 / "answer-sheet.html").write_text(page("Who is speaking", body2), encoding="utf-8")

    # the office keeps this; the teacher does not need it
    office = ROOT / "work" / "teacher-check" / "office"
    office.mkdir(parents=True, exist_ok=True)
    (office / "task2-clip-map.json").write_text(json.dumps(mapping, indent=1), encoding="utf-8")

    (OUT / "0-START-HERE.html").write_text(page("Teacher check - start here", START_HERE), encoding="utf-8")
    print(f"wrote {OUT}: task 1 ({len(rows)} lines, 1 clip), task 2 ({len(mapping)} clips)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
